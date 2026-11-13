import {
  afterAll,
  beforeAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient,
  app: Express,
  dir: string,
  orders: typeof import("./service"),
  auth: typeof import("../auth/service");
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "waimai-purchase-"));
  process.env.DATABASE_URL =
    "file:" + path.join(dir, "test.db").replaceAll("\\", "/");
  process.env.JWT_SECRET = "purchase-isolated-test-key-over-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  orders = await import("./service");
  auth = await import("../auth/service");
  await applyTestMigrations(db);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await db?.$disconnect();
  await rm(dir, { recursive: true, force: true });
});
async function fixture() {
  const name = randomUUID();
  const user = await db.user.create({
    data: { username: name, name, roles: { create: { role: "USER" } } },
  });
  const owner = await db.user.create({
    data: {
      username: name + "_owner",
      name,
      roles: { create: { role: "MERCHANT" } },
    },
  });
  const category = await db.category.create({ data: { name } });
  const store = await db.store.create({
    data: {
      ownerId: owner.id,
      name,
      categoryId: category.id,
      status: "OPEN",
      minOrderCents: 0,
    },
  });
  const dish = await db.dishCategory.create({
    data: { storeId: store.id, name },
  });
  const product = await db.product.create({
    data: {
      storeId: store.id,
      dishCategoryId: dish.id,
      name: "面",
      priceCents: 1000,
      stock: 100,
      status: "ON",
      monthlySales: 999,
    },
  });
  const token = (await auth.issueSession(user, "USER")).accessToken,
    merchant = (await auth.issueSession(owner, "MERCHANT")).accessToken;
  const body = {
    storeId: store.id,
    type: "PICKUP",
    items: [{ productId: product.id, qty: 1 }],
  };
  const signed = async () => ({
    ...body,
    quoteFingerprint: (await orders.previewOrder(user.id, body))
      .quoteFingerprint,
  });
  const create = async () => orders.createOrder(user.id, await signed());
  return { user, owner, store, product, body, token, merchant, signed, create };
}
async function completed(
  a: Awaited<ReturnType<typeof fixture>>,
  doneAt = new Date(),
  qty = 1,
) {
  return db.order.create({
    data: {
      orderNo: randomUUID(),
      serialOfDay: 1,
      userId: a.user.id,
      storeId: a.store.id,
      type: "PICKUP",
      status: "DONE",
      doneAt,
      paidAt: doneAt,
      itemsCents: 1000 * qty,
      deliveryFeeCents: 0,
      discountCents: 0,
      payCents: 1000 * qty,
      items: {
        create: {
          productId: a.product.id,
          nameSnapshot: "面",
          priceCentsSnapshot: 1000,
          qty,
        },
      },
    },
  });
}
const put = (token: string, url: string, body: object) =>
  request(app)
    .put("/api/v1" + url)
    .auth(token, { type: "bearer" })
    .send(body);
describe("购买闭环修复", () => {
  it("创建要求服务端报价指纹，拒绝伪造和跨账号，错误透传 reason", async () => {
    const a = await fixture(),
      b = await fixture();
    for (const [body, reason] of [
      [a.body, "QUOTE_REQUIRED"],
      [{ ...a.body, quoteFingerprint: "fake" }, "QUOTE_CHANGED"],
      [
        {
          ...a.body,
          quoteFingerprint: (await orders.previewOrder(b.user.id, a.body))
            .quoteFingerprint,
        },
        "QUOTE_CHANGED",
      ],
    ] as const) {
      const result = await request(app)
        .post("/api/v1/user/orders")
        .auth(a.token, { type: "bearer" })
        .send(body);
      expect(result.status).toBe(409);
      expect(result.body.details.reason).toBe(reason);
    }
    expect(await db.order.count({ where: { userId: a.user.id } })).toBe(0);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(100);
  });
  it.each(["price", "fee", "promotion"])(
    "报价后 %s 变化不创建、不扣库存、不清购物车",
    async (kind) => {
      const a = await fixture();
      const body = {
        ...a.body,
        type: "DELIVERY",
        addressId: (
          await db.address.create({
            data: {
              userId: a.user.id,
              contact: "联系人",
              phone: "13812345678",
              detail: "地址",
            },
          })
        ).id,
      };
      await db.cart.create({
        data: {
          userId: a.user.id,
          storeId: a.store.id,
          addressId: body.addressId,
          items: JSON.stringify([
            { productId: a.product.id, qty: 1, name: "面", images: "[]" },
          ]),
        },
      });
      const quote = await orders.previewOrder(a.user.id, body);
      if (kind === "price")
        await db.product.update({
          where: { id: a.product.id },
          data: { priceCents: 2000 },
        });
      if (kind === "fee")
        await db.store.update({
          where: { id: a.store.id },
          data: { deliveryFeeCents: 300 },
        });
      if (kind === "promotion")
        await db.promotion.create({
          data: {
            storeId: a.store.id,
            thresholdCents: 1000,
            discountCents: 200,
          },
        });
      await expect(
        orders.createOrder(a.user.id, {
          ...body,
          quoteFingerprint: quote.quoteFingerprint,
          cartRevision: 1,
        }),
      ).rejects.toMatchObject({ details: { reason: "QUOTE_CHANGED" } });
      expect(
        (
          await db.cart.findUniqueOrThrow({
            where: {
              userId_storeId: { userId: a.user.id, storeId: a.store.id },
            },
          })
        ).items,
      ).toContain(a.product.id);
      expect(
        (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
          .stock,
      ).toBe(100);
    },
  );
  it("相同实付但单价和优惠变化仍需再次确认，重放已创建订单不重新计价", async () => {
    const a = await fixture(),
      body = { ...(await a.signed()), requestId: "purchase_replay_123456" };
    await db.product.update({
      where: { id: a.product.id },
      data: { priceCents: 1200 },
    });
    await db.promotion.create({
      data: { storeId: a.store.id, thresholdCents: 1000, discountCents: 200 },
    });
    await expect(orders.createOrder(a.user.id, body)).rejects.toMatchObject({
      details: { reason: "QUOTE_CHANGED" },
    });
    const next = { ...(await a.signed()), requestId: body.requestId };
    const created = await orders.createOrder(a.user.id, next);
    await db.product.update({
      where: { id: a.product.id },
      data: { priceCents: 9000 },
    });
    expect((await orders.createOrder(a.user.id, next)).id).toBe(created.id);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(99);
  });
  it("期限前可支付，到期及到期后拒绝并持久取消、仅回补一次", async () => {
    const a = await fixture();
    const first = await a.create();
    await orders.actOnOrder(first.id, { id: a.user.id, role: "USER" }, "pay");
    for (const age of [15, 16]) {
      const row = await a.create();
      const now = Date.now();
      await db.order.update({
        where: { id: row.id },
        data: { createdAt: new Date(now - age * 60000) },
      });
      vi.spyOn(Date, "now").mockReturnValue(now);
      await expect(
        orders.actOnOrder(row.id, { id: a.user.id, role: "USER" }, "pay"),
      ).rejects.toMatchObject({ details: { reason: "PAYMENT_EXPIRED" } });
      vi.restoreAllMocks();
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: row.id } })).status,
      ).toBe("CANCELLED");
      await orders.expireUnpaid();
    }
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(99);
  });
  it("超时扫描的旧快照不能取消已支付订单；重复支付不重复通知", async () => {
    const a = await fixture(),
      row = await a.create();
    const { orderEvents } = await import("./events");
    const events = vi.fn();
    orderEvents.on(a.store.id, events);
    try {
      const paid = await orders.actOnOrder(
        row.id,
        { id: a.user.id, role: "USER" },
        "pay",
      );
      await orders.actOnOrder(row.id, { id: a.user.id, role: "USER" }, "pay");
      expect(events).toHaveBeenCalledTimes(1);
      expect(events.mock.calls[0][0].kind).toBe("new_order");
      const original = db.order.findMany.bind(db.order);
      let once = true;
      db.order.findMany = ((...args: Parameters<typeof original>) => {
        if (once) {
          once = false;
          return Promise.resolve([{ ...paid, status: "PENDING_PAY" }]);
        }
        return original(...args);
      }) as typeof db.order.findMany;
      try {
        await orders.expireUnpaid();
      } finally {
        db.order.findMany = original;
      }
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: row.id } })).status,
      ).toBe("PENDING");
      await orders.actOnOrder(
        row.id,
        { id: a.user.id, role: "USER" },
        "refund",
        undefined,
        "退款测试",
      );
      expect(events.mock.lastCall![0].kind).toBe("updated");
      await orders.actOnOrder(
        row.id,
        { id: a.owner.id, role: "MERCHANT" },
        "refund-reject",
        a.store.id,
        "已经备餐",
      );
      await orders.actOnOrder(
        row.id,
        { id: a.user.id, role: "USER" },
        "dispute",
      );
      await orders.resolveDispute(
        row.id,
        { id: "operator", role: "ADMIN" },
        true,
        "核实退款",
      );
      expect(events).toHaveBeenCalledTimes(5);
      expect(
        events.mock.calls.slice(1).every((call) => call[0].kind === "updated"),
      ).toBe(true);
    } finally {
      orderEvents.off(a.store.id, events);
    }
  });
  it("到期支付与后台取消并发时仅回补一次", async () => {
    const a = await fixture(),
      row = await a.create();
    await db.order.update({
      where: { id: row.id },
      data: { createdAt: new Date(Date.now() - 16 * 60000) },
    });
    await Promise.all([
      orders
        .actOnOrder(row.id, { id: a.user.id, role: "USER" }, "pay")
        .catch((error) => {
          expect(error.status).toBe(409);
        }),
      orders.expireUnpaid(),
    ]);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("CANCELLED");
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(100);
  });
  it("超时扫描分批清理超过 100 项，已支付单不回补", async () => {
    const a = await fixture();
    for (let i = 0; i < 102; i++)
      await db.order.create({
        data: {
          orderNo: randomUUID(),
          serialOfDay: i,
          userId: a.user.id,
          storeId: a.store.id,
          type: "PICKUP",
          itemsCents: 0,
          deliveryFeeCents: 0,
          discountCents: 0,
          payCents: 0,
          createdAt: new Date(Date.now() - 16 * 60000),
        },
      });
    await orders.expireUnpaid();
    expect(
      await db.order.count({
        where: { storeId: a.store.id, status: "PENDING_PAY" },
      }),
    ).toBe(0);
  });
  it("新店无评分，首条及后续评价更新真实平均分和评价数", async () => {
    const a = await fixture();
    const { storeDetail } = await import("../stores/service");
    expect(await storeDetail(a.store.id)).toMatchObject({
      rating: null,
      reviewCount: 0,
    });
    const one = await completed(a),
      two = await completed(a);
    await Promise.all([
      orders.reviewOrder(one.id, a.user.id, { rating: 1, content: "不好" }),
      orders.reviewOrder(two.id, a.user.id, { rating: 4, content: "不错" }),
    ]);
    expect(await storeDetail(a.store.id)).toMatchObject({
      rating: 2.5,
      reviewCount: 2,
    });
    expect(
      (await db.store.findUniqueOrThrow({ where: { id: a.store.id } })).rating,
    ).toBe(2.5);
    await expect(
      orders.reviewOrder(one.id, a.user.id, { rating: 5, content: "重复" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("月售以完成时间计算 30 个上海自然日，排序和商品件数不用历史累加值", async () => {
    const a = await fixture(),
      b = await fixture();
    const { salesWindow } = await import("./metrics");
    const now = new Date("2026-11-13T03:00:00Z");
    expect(salesWindow(now).gte.toISOString()).toBe("2026-10-14T16:00:00.000Z");
    const boundary = salesWindow().gte;
    await completed(a, boundary, 3);
    await completed(a, new Date(boundary.getTime() - 1), 9);
    await completed(a, new Date(), 2);
    const cancelled = await completed(a, new Date(), 8);
    await db.order.update({
      where: { id: cancelled.id },
      data: { status: "CANCELLED" },
    });
    const { storeDetail, storeList } = await import("../stores/service");
    const detail = await storeDetail(a.store.id);
    expect(detail.monthlySales).toBe(2);
    expect(detail.products[0].monthlySales).toBe(5);
    await db.store.update({
      where: { id: b.store.id },
      data: { monthlySales: 999 },
    });
    await db.store.updateMany({
      where: { id: { in: [a.store.id, b.store.id] } },
      data: { city: a.store.id },
    });
    const ranked = await storeList({
      sort: "sales",
      pageSize: 1,
      city: a.store.id,
    });
    expect(ranked.list[0].id).toBe(a.store.id);
    expect(
      (await request(app).get("/api/v1/public/stores?sort=distance")).status,
    ).toBe(400);
  });
  it("评价回复按店归属，允许修改、幂等、审计，不允许改评价或冻结写入", async () => {
    const a = await fixture(),
      b = await fixture();
    const row = await completed(a);
    const review = await orders.reviewOrder(row.id, a.user.id, {
      rating: 2,
      content: "太咸",
    });
    const url = `/merchant/reviews/${review.id}/reply`;
    expect((await put(b.merchant, url, { content: "跨店" })).status).toBe(404);
    expect((await put(a.token, url, { content: "用户" })).status).toBe(403);
    expect(
      (await put(a.merchant, url, { content: "解释", rating: 5 })).status,
    ).toBe(400);
    for (const content of ["改进", "改进", "感谢反馈"])
      expect((await put(a.merchant, url, { content })).status).toBe(200);
    const logs = await db.auditLog.findMany({
      where: { targetId: review.id, action: "review-reply" },
    });
    expect(logs).toHaveLength(2);
    expect(logs.map((r) => JSON.parse(r.reason!))).toContainEqual({
      before: "改进",
      after: "感谢反馈",
    });
    const list = await request(app)
      .get("/api/v1/merchant/reviews?rating=bad&reply=replied")
      .auth(a.merchant, { type: "bearer" });
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.list[0]).not.toHaveProperty("userId");
    await db.store.update({
      where: { id: a.store.id },
      data: { status: "FROZEN" },
    });
    expect((await put(a.merchant, url, { content: "不能" })).status).toBe(403);
  });
  it("满减校验、版本冲突、清空和审计，配送和自提仍取最大优惠", async () => {
    const a = await fixture(),
      url = "/merchant/promotions";
    const rules = [
      { thresholdCents: 500, discountCents: 100 },
      { thresholdCents: 1000, discountCents: 200 },
    ];
    const writes = await Promise.all([
      put(a.merchant, url, { version: 0, rules }),
      put(a.merchant, url, {
        version: 0,
        rules: [{ thresholdCents: 1000, discountCents: 300 }],
      }),
    ]);
    expect(writes.map((r) => r.status).sort()).toEqual([200, 409]);
    const current = (
      await request(app)
        .get("/api/v1" + url)
        .auth(a.merchant, { type: "bearer" })
    ).body.data;
    for (const bad of [
      [{ thresholdCents: 100, discountCents: 101 }],
      [rules[0], rules[0]],
      Array.from({ length: 11 }, (_, i) => ({
        thresholdCents: i + 1,
        discountCents: 1,
      })),
    ])
      expect(
        (await put(a.merchant, url, { version: current.version, rules: bad }))
          .status,
      ).toBe(400);
    const saved = await put(a.merchant, url, {
      version: current.version,
      rules,
    });
    expect(saved.status).toBe(200);
    expect((await orders.quoteOrder(a.body)).discountCents).toBe(200);
    expect(
      (await orders.quoteOrder({ ...a.body, type: "DELIVERY" })).discountCents,
    ).toBe(200);
    expect(
      (
        await put(a.merchant, url, {
          version: saved.body.data.version,
          rules: [],
        })
      ).status,
    ).toBe(200);
    expect((await orders.quoteOrder(a.body)).discountCents).toBe(0);
    expect(
      await db.auditLog.count({
        where: { targetId: a.store.id, action: "promotion-update" },
      }),
    ).toBeGreaterThan(1);
    await db.store.update({
      where: { id: a.store.id },
      data: { status: "FROZEN" },
    });
    expect(
      (await put(a.merchant, url, { version: 99, rules: [] })).status,
    ).toBe(403);
  });
});
