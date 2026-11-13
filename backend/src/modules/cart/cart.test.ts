import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient,
  app: Express,
  directory: string,
  auth: typeof import("../auth/service");
let serial = 0;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-cart-"));
  const file = path.join(directory, "test.db");
  await writeFile(file, "");
  process.env.DATABASE_URL = "file:" + file.replaceAll("\\", "/");
  process.env.JWT_SECRET = "cart-test-key-at-least-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("../auth/service");
  await applyTestMigrations(db);
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const name = "cart_" + ++serial;
  const account = await db.user.create({
    data: { username: name, name, roles: { create: { role: "USER" } } },
  });
  const merchant = await db.user.create({
    data: {
      username: name + "_merchant",
      name,
      roles: { create: { role: "MERCHANT" } },
    },
  });
  const category = await db.category.create({ data: { name } });
  const store = await db.store.create({
    data: {
      ownerId: merchant.id,
      name,
      categoryId: category.id,
      status: "OPEN",
      minOrderCents: 0,
      contactPhone: "13812345678",
      licenseImage: "private-license",
    },
  });
  const dish = await db.dishCategory.create({
    data: { storeId: store.id, name },
  });
  const product = await db.product.create({
    data: {
      storeId: store.id,
      dishCategoryId: dish.id,
      name: "测试菜",
      priceCents: 1200,
      stock: 20,
      status: "ON",
      rejectReason: "private-reason",
    },
  });
  const session = await auth.issueSession(account, "USER");
  return {
    account,
    merchant,
    store,
    product,
    session,
    token: session.accessToken,
  };
}
const draft = (id: string, revision = 0, qty = 2) => ({
  revision,
  type: "PICKUP",
  addressId: "",
  note: "少辣",
  items: [{ productId: id, qty }],
});
const put = (token: string, storeId: string, body: object) =>
  request(app)
    .put("/api/v1/user/cart/" + storeId)
    .auth(token, { type: "bearer" })
    .send(body);
const get = (token: string) =>
  request(app).get("/api/v1/user/cart").auth(token, { type: "bearer" });
async function signed(userId: string, body: object) {
  try {
    const { previewOrder } = await import("../orders/service");
    return {
      ...body,
      quoteFingerprint: (await previewOrder(userId, body)).quoteFingerprint,
    };
  } catch {
    return body;
  }
}
describe("账号服务端购物车", () => {
  it("已删除的地址不留在返回资料中，也不阻止自提快照结算", async () => {
    const a = await fixture();
    const address = await db.address.create({
      data: {
        userId: a.account.id,
        contact: "联系人",
        phone: "13812345678",
        detail: "地址",
      },
    });
    await put(a.token, a.store.id, {
      ...draft(a.product.id),
      addressId: address.id,
    });
    await db.address.delete({ where: { id: address.id } });
    const cart = (await get(a.token)).body.data.carts[0];
    expect(cart.addressId).toBe("");
    const order = await request(app)
      .post("/api/v1/user/orders")
      .auth(a.token, { type: "bearer" })
      .send(
        await signed(a.account.id, {
          ...draft(a.product.id),
          storeId: a.store.id,
          cartRevision: cart.revision,
          requestId: "deleted_address_pickup_001",
        }),
      );
    expect(order.status).toBe(200);
  });
  it("两设备同时修改同店版本时最多一份新内容生效", async () => {
    const a = await fixture();
    await put(a.token, a.store.id, draft(a.product.id));
    const results = await Promise.all([
      put(a.token, a.store.id, draft(a.product.id, 1, 3)),
      put(a.token, a.store.id, draft(a.product.id, 1, 4)),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const saved = (await get(a.token)).body.data.carts[0];
    expect(saved.revision).toBe(2);
    expect([3, 4]).toContain(saved.lines[0].qty);
  });
  it("完整迁移链建表，按用户及店铺隔离，只返回安全店铺和最新商品资料，不预占库存", async () => {
    const a = await fixture(),
      b = await fixture();
    expect((await put(a.token, a.store.id, draft(a.product.id))).status).toBe(
      200,
    );
    expect((await put(a.token, b.store.id, draft(b.product.id))).status).toBe(
      200,
    );
    await db.product.update({
      where: { id: a.product.id },
      data: { priceCents: 1600, name: "新菜名" },
    });
    const result = await get(a.token);
    expect(result.body.data.carts).toHaveLength(2);
    const cart = result.body.data.carts.find(
      (row: { storeId: string }) => row.storeId === a.store.id,
    );
    expect(cart.lines[0].product).toMatchObject({
      name: "新菜名",
      priceCents: 1600,
      rejectReason: null,
    });
    expect(JSON.stringify(cart)).not.toContain("private-license");
    expect(JSON.stringify(cart)).not.toContain("13812345678");
    expect((await get(b.token)).body.data.carts).toEqual([]);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(20);
  });
  it("所有接口拒绝未登录、非用户身份、停用及首次改密账号", async () => {
    expect((await request(app).get("/api/v1/user/cart")).status).toBe(401);
    const a = await fixture(),
      merchant = await auth.issueSession(a.merchant, "MERCHANT");
    expect((await get(merchant.accessToken)).status).toBe(403);
    await db.user.update({
      where: { id: a.account.id },
      data: { mustChangePassword: true },
    });
    expect((await get(a.token)).status).toBe(403);
    await db.user.update({
      where: { id: a.account.id },
      data: { status: "DISABLED" },
    });
    expect((await get(a.token)).status).toBe(401);
  });
  it("拒绝账号注入、其他用户地址、跨店商品、重复商品和无效数量", async () => {
    const a = await fixture(),
      b = await fixture();
    const address = await db.address.create({
      data: {
        userId: b.account.id,
        contact: "测试",
        phone: "13800000001",
        detail: "地址",
      },
    });
    for (const value of [
      { ...draft(a.product.id), userId: b.account.id },
      { ...draft(a.product.id), addressId: address.id },
      draft(b.product.id),
      { ...draft(a.product.id), items: [{ productId: a.product.id, qty: 0 }] },
      {
        ...draft(a.product.id),
        items: [
          { productId: a.product.id, qty: 1 },
          { productId: a.product.id, qty: 1 },
        ],
      },
    ])
      expect((await put(a.token, a.store.id, value)).status).toBe(400);
    expect((await get(a.token)).body.data.carts).toEqual([]);
  });
  it("旧版本不能覆盖新修改，响应丢失重试同样内容不重复写，清空保留版本防旧请求复活", async () => {
    const a = await fixture();
    const first = await put(a.token, a.store.id, draft(a.product.id));
    expect(first.body.data.revision).toBe(1);
    expect(
      (await put(a.token, a.store.id, draft(a.product.id))).body.data.revision,
    ).toBe(1);
    expect(
      (await put(a.token, a.store.id, draft(a.product.id, 1, 3))).body.data
        .revision,
    ).toBe(2);
    expect(
      (await put(a.token, a.store.id, draft(a.product.id, 1, 4))).status,
    ).toBe(409);
    const cleared = await put(a.token, a.store.id, {
      ...draft(a.product.id, 2),
      items: [],
      note: "",
    });
    expect(cleared.body.data.revision).toBe(3);
    expect(
      (await put(a.token, a.store.id, draft(a.product.id, 0, 4))).status,
    ).toBe(409);
  });
  it("游客自动合并同款相加且不覆盖已存结算信息，重复请求不重复累加", async () => {
    const a = await fixture();
    await put(a.token, a.store.id, draft(a.product.id));
    const body = {
      guestId: "merge_guest_repeat_123456",
      carts: [{ ...draft(a.product.id), storeId: a.store.id }],
    };
    const { revision: discard, addressId: unused, ...entry } = body.carts[0];
    void discard;
    void unused;
    const payload = { ...body, carts: [entry] };
    const first = await request(app)
      .post("/api/v1/user/cart/merge")
      .auth(a.token, { type: "bearer" })
      .send(payload);
    expect(first.status).toBe(200);
    expect(first.body.data.snapshot.carts[0]).toMatchObject({
      note: "少辣",
      type: "PICKUP",
      lines: [{ qty: 4 }],
    });
    const second = await request(app)
      .post("/api/v1/user/cart/merge")
      .auth(a.token, { type: "bearer" })
      .send(payload);
    expect(second.body.data.snapshot.carts[0].lines[0].qty).toBe(4);
    const b = await fixture();
    const other = await request(app)
      .post("/api/v1/user/cart/merge")
      .auth(b.token, { type: "bearer" })
      .send(payload);
    expect(other.body.data.snapshot.carts).toEqual([]);
    expect(other.body.data.issues.length).toBeGreaterThan(0);
  });
  it("游客失效商品提示跳过，合并数量受库存限购约束，已有超限商品不被悄悄减少", async () => {
    const a = await fixture();
    await put(a.token, a.store.id, draft(a.product.id, 0, 5));
    await db.product.update({
      where: { id: a.product.id },
      data: { stock: 2, limitPerOrder: 1 },
    });
    const result = await request(app)
      .post("/api/v1/user/cart/merge")
      .auth(a.token, { type: "bearer" })
      .send({
        guestId: "merge_limited_123456789",
        carts: [
          {
            storeId: a.store.id,
            type: "DELIVERY",
            note: "游客备注",
            items: [
              { productId: a.product.id, qty: 6 },
              { productId: "deleted-product", qty: 1 },
            ],
          },
        ],
      });
    expect(result.body.data.snapshot.carts[0].lines[0].qty).toBe(5);
    expect(result.body.data.issues.length).toBe(2);
    const saved = await put(a.token, a.store.id, {
      ...draft(a.product.id, result.body.data.snapshot.carts[0].revision, 1),
      note: "调整",
    });
    expect(saved.status).toBe(200);
  });
  it("休息或下架后仍保留清单并允许移除，但不能增加数量", async () => {
    const a = await fixture();
    await put(a.token, a.store.id, draft(a.product.id));
    await db.store.update({
      where: { id: a.store.id },
      data: { status: "CLOSED" },
    });
    await db.product.update({
      where: { id: a.product.id },
      data: { status: "OFF" },
    });
    expect(
      (await get(a.token)).body.data.carts[0].lines[0].product.displayStatus,
    ).toBe("OFF");
    expect(
      (await put(a.token, a.store.id, draft(a.product.id, 1, 3))).status,
    ).toBe(409);
    expect(
      (await put(a.token, a.store.id, { ...draft(a.product.id, 1), items: [] }))
        .status,
    ).toBe(200);
  });
  it("下单时校验版本，在同一事务扣库存与清空当前店；另一店和之后加购不受影响", async () => {
    const a = await fixture(),
      b = await fixture();
    await put(a.token, a.store.id, draft(a.product.id));
    await put(a.token, b.store.id, draft(b.product.id));
    const body = {
      storeId: a.store.id,
      type: "PICKUP",
      note: "少辣",
      items: [{ productId: a.product.id, qty: 2 }],
      cartRevision: 1,
      requestId: "order_request_1234567890",
    };
    expect(
      (
        await request(app)
          .post("/api/v1/user/orders")
          .auth(a.token, { type: "bearer" })
          .send(await signed(a.account.id, { ...body, cartRevision: 9 }))
      ).status,
    ).toBe(409);
    const order = await request(app)
      .post("/api/v1/user/orders")
      .auth(a.token, { type: "bearer" })
      .send(await signed(a.account.id, body));
    expect(order.status).toBe(200);
    expect(
      (await get(a.token)).body.data.carts.find(
        (row: { storeId: string }) => row.storeId === a.store.id,
      ).lines,
    ).toEqual([]);
    expect(
      (await get(a.token)).body.data.carts.find(
        (row: { storeId: string }) => row.storeId === b.store.id,
      ).lines[0].qty,
    ).toBe(2);
    await put(a.token, a.store.id, draft(a.product.id, 2, 3));
    const repeated = await request(app)
      .post("/api/v1/user/orders")
      .auth(a.token, { type: "bearer" })
      .send(await signed(a.account.id, body));
    expect(repeated.body.data.id).toBe(order.body.data.id);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(18);
    expect(
      (await get(a.token)).body.data.carts.find(
        (row: { storeId: string }) => row.storeId === a.store.id,
      ).lines[0].qty,
    ).toBe(3);
    const lookup = await request(app)
      .get("/api/v1/user/orders?requestId=" + body.requestId)
      .auth(a.token, { type: "bearer" });
    expect(lookup.body.data.total).toBe(1);
    expect(
      (
        await request(app)
          .get("/api/v1/user/orders?requestId=" + body.requestId)
          .auth(b.token, { type: "bearer" })
      ).body.data.total,
    ).toBe(0);
  });
  it("订单失败事务保留购物车及库存，不写入报价元数据或重复订单", async () => {
    const a = await fixture();
    await put(a.token, a.store.id, draft(a.product.id));
    await db.product.update({
      where: { id: a.product.id },
      data: { stock: 1 },
    });
    const result = await request(app)
      .post("/api/v1/user/orders")
      .auth(a.token, { type: "bearer" })
      .send(
        await signed(a.account.id, {
          storeId: a.store.id,
          type: "PICKUP",
          note: "少辣",
          items: [{ productId: a.product.id, qty: 2 }],
          cartRevision: 1,
          requestId: "order_failed_123456789",
        }),
      );
    expect(result.status).toBe(409);
    expect((await get(a.token)).body.data.carts[0].revision).toBe(1);
    expect(await db.order.count({ where: { userId: a.account.id } })).toBe(0);
  });
  it("事务内重新核验会话，角色令牌失效后不能通过旧请求写入", async () => {
    const a = await fixture();
    const decoded = jwt.decode(a.token) as jwt.JwtPayload;
    await db.refreshSession.deleteMany({ where: { userId: a.account.id } });
    const { saveCart } = await import("./service");
    await expect(
      saveCart(
        { id: a.account.id, sessionId: decoded.sid, version: decoded.version },
        a.store.id,
        draft(a.product.id),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
});
