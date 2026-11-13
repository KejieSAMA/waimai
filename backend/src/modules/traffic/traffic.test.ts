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
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient, app: Express, dir: string;
let traffic: typeof import("./service"),
  identity: typeof import("./identity"),
  orders: typeof import("../orders/service"),
  auth: typeof import("../auth/service");
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "waimai-traffic-"));
  process.env.DATABASE_URL =
    "file:" + path.join(dir, "test.db").replaceAll("\\", "/");
  process.env.JWT_SECRET = "traffic-isolated-test-secret-over-32-characters";
  db = (await import("../../db")).db;
  await applyTestMigrations(db);
  app = (await import("../../app")).app;
  traffic = await import("./service");
  identity = await import("./identity");
  orders = await import("../orders/service");
  auth = await import("../auth/service");
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await db?.$disconnect();
  await rm(dir, { recursive: true, force: true });
});
async function fixture() {
  const username = randomUUID();
  const user = await db.user.create({
    data: { username, name: "顾客", roles: { create: { role: "USER" } } },
  });
  const owner = await db.user.create({
    data: {
      username: username + "-owner",
      name: "店长",
      roles: { create: [{ role: "MERCHANT" }, { role: "USER" }] },
    },
  });
  const category = await db.category.create({ data: { name: username } });
  const store = await db.store.create({
    data: {
      ownerId: owner.id,
      categoryId: category.id,
      name: "店铺",
      status: "OPEN",
    },
  });
  const group = await db.dishCategory.create({
    data: { storeId: store.id, name: "菜品" },
  });
  const product = await db.product.create({
    data: {
      storeId: store.id,
      dishCategoryId: group.id,
      name: "面",
      priceCents: 1000,
      stock: 100,
      status: "ON",
    },
  });
  const token = (await auth.issueSession(user, "USER")).accessToken;
  const merchant = (await auth.issueSession(owner, "MERCHANT")).accessToken;
  const create = async () => {
    const body = {
      storeId: store.id,
      type: "PICKUP",
      items: [{ productId: product.id, qty: 1 }],
    };
    return orders.createOrder(user.id, {
      ...body,
      quoteFingerprint: (await orders.previewOrder(user.id, body))
        .quoteFingerprint,
    });
  };
  return { user, owner, store, product, token, merchant, create };
}
const visit = (storeId: string) =>
  request(app).post(`/api/v1/public/stores/${storeId}/visits`);
const cookiePair = (value: string) => "xz_visitor=" + value;
async function browser(storeId: string) {
  const response = await visit(storeId).send({});
  expect(response.body.data).toEqual({
    registered: false,
    cookieRequired: true,
  });
  return String(response.headers["set-cookie"][0]).split(";")[0];
}
async function pay(
  a: Awaited<ReturnType<typeof fixture>>,
  id: string,
  cookie?: string,
) {
  const req = request(app)
    .post(`/api/v1/user/orders/${id}/pay`)
    .auth(a.token, { type: "bearer" });
  return cookie ? req.set("Cookie", cookie).send({}) : req.send({});
}
describe("真实店铺访客", () => {
  it("Cookie 确认前不计数，确认后游客/登录/PC手机重复访问及并发登记只计一次", async () => {
    const a = await fixture(),
      cookie = await browser(a.store.id);
    expect(await db.storeVisit.count({ where: { storeId: a.store.id } })).toBe(
      0,
    );
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        const r = visit(a.store.id).set("Cookie", cookie);
        if (i % 2) r.auth(a.token, { type: "bearer" });
        return r.send({});
      }),
    );
    expect(results.map((r) => r.status)).toEqual(Array(8).fill(200));
    expect(await traffic.trafficStats(a.store.id)).toMatchObject({
      visitors: 1,
      convertedVisitors: 0,
      conversionRate: 0,
    });
    const stored = await db.storeVisit.findFirstOrThrow({
      where: { storeId: a.store.id },
    });
    expect(stored.visitorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie).not.toContain(stored.visitorHash);
    expect(Object.keys(stored).sort()).toEqual([
      "day",
      "firstSeenAt",
      "id",
      "storeId",
      "visitorHash",
    ]);
  });
  it("Cookie 被阻止时重复握手仍为零，篡改/过期 Cookie 不能登记", async () => {
    const a = await fixture();
    await browser(a.store.id);
    await browser(a.store.id);
    const signed = identity.newVisitorCookie();
    expect(identity.visitorHash(signed)).toBeDefined();
    expect(identity.visitorHash(signed + "x")).toBeUndefined();
    expect(
      identity.visitorHash(
        identity.newVisitorCookie(Date.now() - 366 * 86_400_000),
      ),
    ).toBeUndefined();
    expect(
      (
        await visit(a.store.id)
          .set("Cookie", cookiePair(signed + "x"))
          .send({})
      ).body.data.cookieRequired,
    ).toBe(true);
    expect(await traffic.trafficStats(a.store.id)).toMatchObject({
      visitors: 0,
      conversionRate: null,
    });
  });
  it("不同浏览器和店铺分别统计，上海跨日重新去重，不编造历史数据", async () => {
    const a = await fixture(),
      b = await fixture();
    const hash = identity.visitorHash(identity.newVisitorCookie())!;
    const before = new Date("2026-11-12T15:59:59Z"),
      after = new Date("2026-11-12T16:00:00Z");
    await traffic.registerVisit(a.store.id, hash, undefined, before);
    await traffic.registerVisit(a.store.id, hash, undefined, after);
    await traffic.registerVisit(
      a.store.id,
      "another-browser",
      undefined,
      after,
    );
    await traffic.registerVisit(b.store.id, hash, undefined, after);
    expect((await traffic.trafficStats(a.store.id, before)).visitors).toBe(1);
    expect((await traffic.trafficStats(a.store.id, after)).visitors).toBe(2);
    expect((await traffic.trafficStats(b.store.id, after)).visitors).toBe(1);
    expect(
      (await traffic.trafficStats(a.store.id, new Date("2026-11-01"))).visitors,
    ).toBe(0);
  });
  it("排除商家/管理员和店主用户身份；无效身份、额外字段及不可见店铺拒绝", async () => {
    const a = await fixture(),
      cookie = await browser(a.store.id);
    const admin = await db.user.create({
      data: {
        username: randomUUID(),
        name: "管理员",
        roles: { create: { role: "ADMIN" } },
      },
    });
    const tokens = [
      a.merchant,
      (await auth.issueSession(a.owner, "USER")).accessToken,
      (await auth.issueSession(admin, "ADMIN")).accessToken,
    ];
    for (const token of tokens)
      expect(
        (
          await visit(a.store.id)
            .auth(token, { type: "bearer" })
            .set("Cookie", cookie)
            .send({})
        ).body.data.registered,
      ).toBe(false);
    expect(
      (await visit(a.store.id).auth("invalid", { type: "bearer" }).send({}))
        .status,
    ).toBe(401);
    expect((await visit(a.store.id).send({ visitors: 999 })).status).toBe(400);
    expect((await visit("missing").send({})).status).toBe(404);
    await db.store.update({
      where: { id: a.store.id },
      data: { status: "CLOSED" },
    });
    expect(
      (await visit(a.store.id).set("Cookie", cookie).send({})).body.data
        .registered,
    ).toBe(true);
    await db.store.update({
      where: { id: a.store.id },
      data: { status: "FROZEN" },
    });
    expect(
      (await visit(a.store.id).set("Cookie", cookie).send({})).status,
    ).toBe(404);
    expect((await traffic.trafficStats(a.store.id)).visitors).toBe(1);
  });
  it("采集起点持久保存，首日有说明；商家统计范围不接受外部店铺参数", async () => {
    const a = await fixture(),
      b = await fixture();
    await traffic.registerVisit(b.store.id, "b");
    const res = await request(app)
      .get(`/api/v1/merchant/stats/today?storeId=${b.store.id}`)
      .auth(a.merchant, { type: "bearer" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      visitors: 0,
      conversionRate: null,
      traffic: { partialDay: true, timezone: "Asia/Shanghai" },
    });
    const next = await traffic.trafficStats(
      a.store.id,
      new Date(Date.now() + 86_400_000),
    );
    expect(next.traffic.partialDay).toBe(false);
    expect(next.traffic.collectionStartedAt).toBe(
      res.body.data.traffic.collectionStartedAt,
    );
    expect(a.store.city).toBe("");
  });
});
describe("支付转化归因", () => {
  it("分母含未支付访客，百分比按一位小数返回", async () => {
    const a = await fixture(),
      cookie = await browser(a.store.id);
    await visit(a.store.id).set("Cookie", cookie).send({});
    await traffic.registerVisit(a.store.id, "unpaid-browser-one");
    await traffic.registerVisit(a.store.id, "unpaid-browser-two");
    await pay(a, (await a.create()).id, cookie);
    expect(await traffic.trafficStats(a.store.id)).toMatchObject({
      visitors: 3,
      convertedVisitors: 1,
      conversionRate: 33.3,
    });
  });
  it("真实支付成功才归因；重复支付/多订单只计一位，退款不撤销，响应不泄漏访问关联", async () => {
    const a = await fixture(),
      cookie = await browser(a.store.id);
    await visit(a.store.id).set("Cookie", cookie).send({});
    const one = await a.create(),
      two = await a.create();
    expect((await traffic.trafficStats(a.store.id)).convertedVisitors).toBe(0);
    expect((await pay(a, one.id, cookie)).body.data).not.toHaveProperty(
      "paidVisitId",
    );
    expect((await pay(a, one.id, cookie)).status).toBe(200);
    expect((await pay(a, two.id, cookie)).status).toBe(200);
    expect(await traffic.trafficStats(a.store.id)).toMatchObject({
      visitors: 1,
      convertedVisitors: 1,
      conversionRate: 100,
    });
    await orders.actOnOrder(
      one.id,
      { id: a.user.id, role: "USER" },
      "refund",
      undefined,
      "退款",
    );
    await orders.actOnOrder(
      one.id,
      { id: a.owner.id, role: "MERCHANT" },
      "refund-approve",
      a.store.id,
    );
    expect((await traffic.trafficStats(a.store.id)).convertedVisitors).toBe(1);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(99);
  });
  it("无 Cookie、其他浏览器、跨店与前一日访问不归因但支付正常", async () => {
    const a = await fixture(),
      b = await fixture();
    const raw = identity.newVisitorCookie(),
      cookie = cookiePair(raw),
      hash = identity.visitorHash(raw)!;
    await traffic.registerVisit(b.store.id, hash);
    await traffic.registerVisit(
      a.store.id,
      hash,
      undefined,
      new Date(Date.now() - 86_400_000),
    );
    for (const c of [
      undefined,
      cookie,
      cookiePair(identity.newVisitorCookie()),
    ])
      expect((await pay(a, (await a.create()).id, c)).status).toBe(200);
    expect(
      await db.order.count({
        where: { storeId: a.store.id, paidVisitId: { not: null } },
      }),
    ).toBe(0);
    expect((await traffic.trafficStats(a.store.id)).visitors).toBe(0);
  });
  it("支付失败/到期不能产生转化，取消竞争不影响访客数", async () => {
    const a = await fixture(),
      cookie = await browser(a.store.id);
    await visit(a.store.id).set("Cookie", cookie).send({});
    const old = await a.create();
    await db.order.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 16 * 60_000) },
    });
    expect((await pay(a, old.id, cookie)).status).toBe(409);
    const cancelled = await a.create();
    await orders.actOnOrder(
      cancelled.id,
      { id: a.user.id, role: "USER" },
      "cancel",
    );
    expect((await pay(a, cancelled.id, cookie)).status).toBe(409);
    expect(await traffic.trafficStats(a.store.id)).toMatchObject({
      visitors: 1,
      convertedVisitors: 0,
    });
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(100);
  });
  it("清理 30 日前明细只解除关联，订单、库存和金额保留", async () => {
    const a = await fixture(),
      cookie = await browser(a.store.id);
    await visit(a.store.id).set("Cookie", cookie).send({});
    const row = await a.create();
    await pay(a, row.id, cookie);
    const before = await db.order.findUniqueOrThrow({ where: { id: row.id } });
    expect(before.paidVisitId).not.toBeNull();
    await traffic.cleanupVisits(new Date(Date.now() + 31 * 86_400_000));
    const after = await db.order.findUniqueOrThrow({ where: { id: row.id } });
    expect(after).toEqual({ ...before, paidVisitId: null });
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .stock,
    ).toBe(99);
    expect(await db.$queryRawUnsafe("PRAGMA foreign_key_check")).toEqual([]);
  });
});
it("匿名访问登记限流且错误响应不缓存，不写业务数据", async () => {
  const { TRAFFIC_RULES } = await import("../../rules");
  const result = await Promise.all(
    Array.from({ length: TRAFFIC_RULES.rateLimit + 1 }, () =>
      visit("missing").send({}),
    ),
  );
  const limited = result.find((r) => r.status === 429);
  expect(limited?.body.code).toBe(429);
  expect(limited?.headers["cache-control"]).toBe("no-store");
});
