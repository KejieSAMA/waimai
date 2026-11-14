import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { applyTestMigrations } from "../../testing/migrations";
import type { MerchantArrivalActor } from "./service";
import { HttpError } from "../../http";
let db: PrismaClient,
  app: Express,
  dir: string,
  serial = 0;
let auth: typeof import("../auth/service"),
  orders: typeof import("./service"),
  events: typeof import("./events"),
  audit: typeof import("../audit/service");
const stops: (() => void)[] = [];
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "waimai-arrival-"));
  process.env.DATABASE_URL =
    "file:" + path.join(dir, "test.db").replaceAll("\\", "/");
  process.env.JWT_SECRET = "arrival-test-access-key-at-least-32-characters";
  process.env.JWT_REFRESH_SECRET =
    "arrival-test-refresh-key-at-least-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("../auth/service");
  orders = await import("./service");
  events = await import("./events");
  audit = await import("../audit/service");
  await applyTestMigrations(db);
});
afterEach(() => {
  vi.restoreAllMocks();
  stops.splice(0).forEach((stop) => stop());
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(dir, { recursive: true, force: true });
});
async function fixture() {
  const key = "arrival_" + ++serial;
  const user = await db.user.create({
    data: { username: key, name: "用户", roles: { create: { role: "USER" } } },
  });
  const owner = await db.user.create({
    data: {
      username: key + "_owner",
      name: "店主",
      roles: { create: { role: "MERCHANT" } },
    },
  });
  const category = await db.category.create({ data: { name: key } });
  const store = await db.store.create({
    data: {
      ownerId: owner.id,
      categoryId: category.id,
      name: key,
      status: "OPEN",
    },
  });
  const group = await db.dishCategory.create({
    data: { name: "菜品", storeId: store.id },
  });
  const product = await db.product.create({
    data: {
      storeId: store.id,
      dishCategoryId: group.id,
      name: "面",
      priceCents: 1000,
      stock: 80,
      status: "ON",
    },
  });
  const merchant = await auth.issueSession(owner, "MERCHANT"),
    customer = await auth.issueSession(user, "USER");
  const token = jwt.decode(merchant.accessToken) as jwt.JwtPayload;
  const actor: MerchantArrivalActor = {
    id: owner.id,
    role: "MERCHANT",
    storeId: store.id,
    sessionId: String(token.sid),
    version: Number(token.version),
  };
  const notifications: unknown[] = [];
  const listener = (event: unknown) => notifications.push(event);
  events.orderEvents.on(store.id, listener);
  stops.push(() => {
    events.orderEvents.off(store.id, listener);
  });
  const create = (status = "DELIVERING", type = "DELIVERY") =>
    db.order.create({
      data: {
        orderNo: "arrival-order-" + ++serial,
        serialOfDay: serial,
        userId: user.id,
        storeId: store.id,
        type,
        status,
        itemsCents: 2000,
        deliveryFeeCents: 300,
        discountCents: 100,
        payCents: 2200,
        paidAt: new Date(),
        doneAt: status === "DONE" ? new Date("2026-11-01T00:00:00Z") : null,
        addressSnapshot: JSON.stringify({
          contact: "测试",
          phone: "13912345678",
          detail: "测试地址",
        }),
        items: {
          create: {
            productId: product.id,
            nameSnapshot: product.name,
            priceCentsSnapshot: 1000,
            qty: 2,
          },
        },
      },
    });
  const single = (id: string) =>
    request(app)
      .post(`/api/v1/merchant/orders/${id}/arrive`)
      .auth(merchant.accessToken, { type: "bearer" })
      .send({});
  const batch = (body: object) =>
    request(app)
      .post("/api/v1/merchant/orders/batch-arrive")
      .auth(merchant.accessToken, { type: "bearer" })
      .send(body);
  return {
    user,
    owner,
    store,
    product,
    merchant,
    customer,
    actor,
    notifications,
    create,
    single,
    batch,
  };
}
describe("商家自配送到达", () => {
  it("单笔直接完成、仅一次时间审计及静默通知，金额库存支付快照不变并计入真实月售", async () => {
    const f = await fixture(),
      order = await f.create();
    const result = await f.single(order.id);
    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("DONE");
    expect(result.body.data.addressSnapshot).not.toContain("13912345678");
    const done = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(done.doneAt).toBeInstanceOf(Date);
    const { status: _status, doneAt: _doneAt, ...other } = done;
    void _status;
    void _doneAt;
    const { status: _old, doneAt: _oldDone, ...before } = order;
    void _old;
    void _oldDone;
    expect(other).toEqual(before);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: f.product.id } }))
        .stock,
    ).toBe(80);
    expect((await f.single(order.id)).status).toBe(200);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).doneAt,
    ).toEqual(done.doneAt);
    const logs = await db.auditLog.findMany({ where: { targetId: order.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      actorId: f.owner.id,
      actorRole: "MERCHANT",
      action: "merchant-arrive",
    });
    expect(f.notifications).toEqual([{ id: order.id, kind: "updated" }]);
    const store = await request(app).get(`/api/v1/public/stores/${f.store.id}`);
    expect(store.body.data.monthlySales).toBe(1);
    expect(
      store.body.data.products.find(
        (p: { id: string }) => p.id === f.product.id,
      ).monthlySales,
    ).toBe(2);
  });
  it("批量逐单成功、已完成幂等及业务失败，不回滚有效订单", async () => {
    const f = await fixture();
    const valid = await f.create(),
      done = await f.create("DONE"),
      refund = await f.create("REFUNDING"),
      pickup = await f.create("PICKUP", "PICKUP");
    const result = await f.batch({
      ids: [valid.id, done.id, refund.id, pickup.id],
    });
    expect(result.status).toBe(200);
    expect(
      result.body.data.results.map((r: { outcome: string }) => r.outcome),
    ).toEqual(["completed", "already_completed", "failed", "failed"]);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: done.id } })).doneAt,
    ).toEqual(done.doneAt);
    expect(
      await db.auditLog.count({
        where: {
          action: "merchant-arrive",
          targetId: { in: [valid.id, done.id, refund.id, pickup.id] },
        },
      }),
    ).toBe(1);
    expect(f.notifications).toEqual([{ id: valid.id, kind: "updated" }]);
  });
  it("混入跨店或不存在 ID 整批 404，先核验后操作", async () => {
    const f = await fixture(),
      other = await fixture(),
      own = await f.create(),
      foreign = await other.create();
    for (const id of [foreign.id, "missing-order"]) {
      expect((await f.batch({ ids: [own.id, id] })).status).toBe(404);
      expect((await f.single(id)).status).toBe(404);
    }
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: own.id } })).status,
    ).toBe("DELIVERING");
    expect(f.notifications).toEqual([]);
  });
  it("100 单上限可完整处理，整批重放不重复审计和通知", async () => {
    const f = await fixture();
    const rows = await Promise.all(
      Array.from({ length: 100 }, () => f.create()),
    );
    const ids = rows.map((row) => row.id);
    const first = await f.batch({ ids });
    expect(first.status).toBe(200);
    expect(first.body.data.results).toHaveLength(100);
    expect(
      first.body.data.results.every(
        (row: { outcome: string }) => row.outcome === "completed",
      ),
    ).toBe(true);
    const repeated = await f.batch({ ids });
    expect(repeated.status).toBe(200);
    expect(
      repeated.body.data.results.every(
        (row: { outcome: string }) => row.outcome === "already_completed",
      ),
    ).toBe(true);
    expect(f.notifications).toHaveLength(100);
    expect(
      await db.auditLog.count({
        where: { targetId: { in: ids }, action: "merchant-arrive" },
      }),
    ).toBe(100);
  });
  it("批量中会话失效时逐单重新核验，已经完成的订单保留", async () => {
    const f = await fixture(),
      a = await f.create(),
      b = await f.create();
    const original = auth.validateSession;
    let calls = 0;
    vi.spyOn(auth, "validateSession").mockImplementation((...args) => {
      if (++calls > 2) throw new HttpError(401, "登录已失效，请重新登录");
      return original(...args);
    });
    const result = await orders.batchArriveOrders([a.id, b.id], f.actor);
    expect(result.results.map((row) => row.outcome)).toEqual([
      "completed",
      "failed",
    ]);
    expect(result.results[1].message).toContain("登录已失效");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: a.id } })).status,
    ).toBe("DONE");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: b.id } })).status,
    ).toBe("DELIVERING");
    expect(f.notifications).toEqual([{ id: a.id, kind: "updated" }]);
  });
  it("冻结及未审核只读，休息状态仍可完成既有配送", async () => {
    const f = await fixture(),
      order = await f.create();
    for (const status of ["FROZEN", "PENDING", "REJECTED"]) {
      await db.store.update({ where: { id: f.store.id }, data: { status } });
      expect((await f.single(order.id)).status).toBe(403);
      expect((await f.batch({ ids: [order.id] })).status).toBe(403);
    }
    await db.store.update({
      where: { id: f.store.id },
      data: { status: "CLOSED" },
    });
    expect((await f.single(order.id)).status).toBe(200);
  });
  it("只允许配送中外卖，待自提和已完成自提都不能到达", async () => {
    const f = await fixture();
    for (const [status, type] of [
      ["PENDING_PAY", "DELIVERY"],
      ["PENDING", "DELIVERY"],
      ["PREPARING", "DELIVERY"],
      ["REFUNDING", "DELIVERY"],
      ["CANCELLED", "DELIVERY"],
      ["PICKUP", "PICKUP"],
      ["DONE", "PICKUP"],
    ]) {
      const order = await f.create(status, type);
      expect((await f.single(order.id)).status).toBe(409);
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
      ).toBe(status);
    }
    expect(f.notifications).toEqual([]);
  });
  it("批量严格校验、上限与去重，禁止客户端指定店铺归属", async () => {
    const f = await fixture(),
      order = await f.create();
    for (const body of [
      { ids: [] },
      { ids: [order.id, order.id] },
      { ids: Array.from({ length: 101 }, (_, i) => String(i)) },
      { ids: [order.id], storeId: f.store.id },
      { ids: [""] },
    ])
      expect((await f.batch(body)).status).toBe(400);
    expect(f.notifications).toEqual([]);
  });
  it("用户、未改密、撤销会话均不能使用商家到达", async () => {
    const f = await fixture(),
      order = await f.create();
    await expect(
      orders.actOnOrder(order.id, { id: f.user.id, role: "USER" }, "arrive"),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await request(app)
          .post(`/api/v1/merchant/orders/${order.id}/arrive`)
          .auth(f.customer.accessToken, { type: "bearer" })
          .send({})
      ).status,
    ).toBe(403);
    await db.user.update({
      where: { id: f.owner.id },
      data: { mustChangePassword: true },
    });
    expect((await f.single(order.id)).status).toBe(403);
    await db.user.update({
      where: { id: f.owner.id },
      data: { mustChangePassword: false },
    });
    await auth.revokeSession(f.merchant.refreshToken);
    await expect(orders.arriveOrder(order.id, f.actor)).rejects.toMatchObject({
      status: 401,
    });
    expect((await f.single(order.id)).status).toBe(401);
  });
  it("审计失败同事务回滚，不发通知；批量其他订单仍可成功", async () => {
    const f = await fixture(),
      bad = await f.create(),
      good = await f.create();
    const original = audit.recordAudit;
    vi.spyOn(audit, "recordAudit").mockImplementation((...args) => {
      if (args[4] === bad.id) throw new Error("injected");
      return original(...args);
    });
    const result = await f.batch({ ids: [bad.id, good.id] });
    expect(result.status).toBe(200);
    expect(
      result.body.data.results.map((r: { outcome: string }) => r.outcome),
    ).toEqual(["failed", "completed"]);
    expect(
      await db.order.findUniqueOrThrow({ where: { id: bad.id } }),
    ).toMatchObject({ status: "DELIVERING", doneAt: null });
    expect(f.notifications).toEqual([{ id: good.id, kind: "updated" }]);
  });
  it("用户确认与商家到达并发只完成一次，重放不重复计时、审计或通知", async () => {
    const f = await fixture(),
      order = await f.create();
    const results = await Promise.allSettled([
      orders.arriveOrder(order.id, f.actor),
      orders.actOnOrder(order.id, { id: f.user.id, role: "USER" }, "complete"),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const done = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(done.status).toBe("DONE");
    expect(done.doneAt).not.toBeNull();
    expect(f.notifications).toHaveLength(1);
    expect(
      await db.auditLog.count({
        where: { targetId: order.id, action: "merchant-arrive" },
      }),
    ).toBeLessThanOrEqual(1);
    await orders.arriveOrder(order.id, f.actor);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).doneAt,
    ).toEqual(done.doneAt);
    expect(f.notifications).toHaveLength(1);
  });
  it("到达与退款竞争只能一方转换状态，库存金额不变", async () => {
    const f = await fixture(),
      order = await f.create();
    const results = await Promise.allSettled([
      orders.arriveOrder(order.id, f.actor),
      orders.actOnOrder(
        order.id,
        { id: f.user.id, role: "USER" },
        "refund",
        undefined,
        "退款",
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const next = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(["DONE", "REFUNDING"]).toContain(next.status);
    expect(next.doneAt != null).toBe(next.status === "DONE");
    expect(next.payCents).toBe(order.payCents);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: f.product.id } }))
        .stock,
    ).toBe(80);
    expect(f.notifications).toHaveLength(1);
  });
});
