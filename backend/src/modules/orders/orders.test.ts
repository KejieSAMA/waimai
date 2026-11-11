import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import type { createOrder } from "./service";

let app: Express;
let db: PrismaClient;
let directory: string;
let orderService: typeof import("./service");
let token = "";
let merchantToken = "";
let userId = "";
let storeId = "";
let otherStoreId = "";
let productId = "";
let otherProductId = "";
let input: Parameters<typeof createOrder>[1];

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-test-"));
  const filename = path.join(directory, "test.db");
  await writeFile(filename, "");
  process.env.DATABASE_URL = `file:${filename.replaceAll("\\", "/")}`;
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.UPLOAD_DIR = path.join(directory, "uploads");
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  orderService = await import("./service");
  const sql = await readFile(
    path.resolve(
      "backend/prisma/migrations/20261111000000_initial/migration.sql",
    ),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean))
    await db.$executeRawUnsafe(statement);
  const category = await db.category.create({ data: { name: "面馆" } });
  const user = await db.user.create({
    data: { phone: "13911111111", name: "测试用户", role: "USER" },
  });
  userId = user.id;
  const bcrypt = await import("bcryptjs");
  for (const [index, phone] of ["13811111111", "13822222222"].entries()) {
    const owner = await db.user.create({
      data: {
        phone,
        name: "店主",
        role: "MERCHANT",
        passwordHash: await bcrypt.hash("password123", 4),
      },
    });
    const store = await db.store.create({
      data: {
        ownerId: owner.id,
        categoryId: category.id,
        name: `测试店 ${index}`,
        status: "OPEN",
        minOrderCents: 0,
        deliveryFeeCents: 300,
      },
    });
    const group = await db.dishCategory.create({
      data: { storeId: store.id, name: "主食" },
    });
    const product = await db.product.create({
      data: {
        storeId: store.id,
        dishCategoryId: group.id,
        name: "牛肉面",
        priceCents: 2850,
        stock: 100,
      },
    });
    if (index === 0) {
      storeId = store.id;
      productId = product.id;
    } else {
      otherStoreId = store.id;
      otherProductId = product.id;
    }
  }
  await db.promotion.create({
    data: { storeId, thresholdCents: 5000, discountCents: 500 },
  });
  const auth = await import("../auth/service");
  token = (await auth.issueSession(user)).accessToken;
  const merchant = await db.user.findUniqueOrThrow({
    where: { phone: "13811111111" },
  });
  merchantToken = (await auth.issueSession(merchant)).accessToken;
  input = {
    storeId,
    type: "PICKUP",
    items: [{ productId, qty: 2 }],
    payCents: 1,
  };
});

afterAll(async () => {
  await db?.$disconnect();
  if (directory) {
    const parent = path.resolve(tmpdir());
    if (
      path.dirname(path.resolve(directory)) !== parent ||
      !path.basename(directory).startsWith("waimai-test-")
    )
      throw new Error("临时目录校验失败");
    await rm(directory, { recursive: true, force: true });
  }
});

describe("订单金额、库存和权限", () => {
  it("忽略前端金额，合并重复商品并计算满减", async () => {
    const quote = await orderService.quoteOrder({
      storeId,
      type: "PICKUP",
      items: [
        { productId, qty: 1 },
        { productId, qty: 1 },
      ],
      payCents: 1,
    });
    expect(quote.itemsCents).toBe(5700);
    expect(quote.discountCents).toBe(500);
    expect(quote.payCents).toBe(5200);
    expect(quote.items).toHaveLength(1);
  });
  it("配送订单必须使用本人地址", async () => {
    const response = await request(app)
      .post("/api/v1/user/orders")
      .auth(token, { type: "bearer" })
      .send({
        storeId,
        type: "DELIVERY",
        addressId: "someone-else",
        items: [{ productId, qty: 1 }],
      });
    expect(response.status).toBe(400);
  });
  it("拒绝跨店商品写入与读取", async () => {
    const response = await request(app)
      .put(`/api/v1/merchant/products/${otherProductId}/listing`)
      .auth(merchantToken, { type: "bearer" })
      .send({ listed: false });
    expect(response.status).toBe(404);
    expect(
      (
        await request(app)
          .get(`/api/v1/merchant/products/${otherProductId}`)
          .auth(merchantToken, { type: "bearer" })
      ).status,
    ).toBe(404);
  });
  it("跨店订单操作返回 404", async () => {
    const other = await orderService.createOrder(userId, {
      storeId: otherStoreId,
      type: "PICKUP",
      items: [{ productId: otherProductId, qty: 1 }],
    });
    expect(
      (
        await request(app)
          .post(`/api/v1/merchant/orders/${other.id}/accept`)
          .auth(merchantToken, { type: "bearer" })
          .send({})
      ).status,
    ).toBe(404);
    await orderService.actOnOrder(
      other.id,
      { id: userId, role: "USER" },
      "cancel",
    );
  });
  it("下单扣减库存，重复取消仅回补一次", async () => {
    const before = (
      await db.product.findUniqueOrThrow({ where: { id: productId } })
    ).stock;
    const order = await orderService.createOrder(userId, input);
    expect(order.payCents).toBe(5200);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock,
    ).toBe(before - 2);
    await orderService.actOnOrder(
      order.id,
      { id: userId, role: "USER" },
      "cancel",
    );
    await orderService.actOnOrder(
      order.id,
      { id: userId, role: "USER" },
      "cancel",
    );
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock,
    ).toBe(before);
  });
  it("完整自提流转与接单幂等", async () => {
    const order = await orderService.createOrder(userId, input);
    const merchant = await db.user.findUniqueOrThrow({
      where: { phone: "13811111111" },
    });
    const actor = { id: merchant.id, role: "MERCHANT" };
    await orderService.actOnOrder(
      order.id,
      { id: userId, role: "USER" },
      "pay",
    );
    await orderService.actOnOrder(order.id, actor, "accept", storeId);
    expect(
      (await orderService.actOnOrder(order.id, actor, "accept", storeId))
        .status,
    ).toBe("PREPARING");
    expect(
      (await orderService.actOnOrder(order.id, actor, "ready", storeId)).status,
    ).toBe("PICKUP");
    expect(
      (
        await orderService.actOnOrder(
          order.id,
          { id: userId, role: "USER" },
          "complete",
        )
      ).status,
    ).toBe("DONE");
  });
  it("库存不足时整笔事务回滚", async () => {
    await expect(
      orderService.createOrder(userId, {
        storeId,
        type: "PICKUP",
        items: [{ productId, qty: 999 }],
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("冻结后公开不可见且商家只读", async () => {
    await db.store.update({
      where: { id: storeId },
      data: { status: "FROZEN" },
    });
    expect(
      (await request(app).get(`/api/v1/public/stores/${storeId}`)).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/v1/merchant/products/${productId}/listing`)
          .auth(merchantToken, { type: "bearer" })
          .send({ listed: false })
      ).status,
    ).toBe(403);
    await db.store.update({ where: { id: storeId }, data: { status: "OPEN" } });
  });
  it("公开详情隐藏证照和联系电话", async () => {
    const response = await request(app).get(`/api/v1/public/stores/${storeId}`);
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty("contactPhone");
    expect(response.body.data).not.toHaveProperty("licenseImage");
  });
  it("刷新令牌轮换并使旧令牌失效", async () => {
    const auth = await import("../auth/service");
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const session = await auth.issueSession(user);
    expect(
      (await auth.refreshSession(session.refreshToken, "USER")).user.id,
    ).toBe(userId);
    await expect(
      auth.refreshSession(session.refreshToken, "USER"),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("空筛选参数保持列表可见", async () => {
    const stores = await request(app).get(
      "/api/v1/public/stores?categoryId=&keyword=",
    );
    expect(stores.body.data.total).toBeGreaterThan(0);
    const products = await request(app)
      .get("/api/v1/merchant/products?categoryId=&stock=")
      .auth(merchantToken, { type: "bearer" });
    expect(products.body.data.total).toBeGreaterThan(0);
  });
  it("新商家可读取并提交入驻申请", async () => {
    const auth = await import("../auth/service");
    const session = await auth.register("13833333333", "password123", "新店主");
    const response = await request(app)
      .get("/api/v1/merchant/application")
      .auth(session.accessToken, { type: "bearer" });
    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    const category = await db.category.findFirstOrThrow();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    const uploaded = await request(app)
      .post("/api/v1/uploads")
      .auth(session.accessToken, { type: "bearer" })
      .field("purpose", "certificate")
      .attach("file", png, {
        filename: "license.png",
        contentType: "image/png",
      });
    const applied = await request(app)
      .put("/api/v1/merchant/application")
      .auth(session.accessToken, { type: "bearer" })
      .send({
        name: "新店铺",
        categoryId: category.id,
        city: "北京",
        address: "望京 1 号",
        contactPhone: "13833333333",
        openHours: "09:00-22:00",
        minOrderCents: 2000,
        deliveryFeeCents: 300,
        licenseImage: uploaded.body.data.url,
        foodPermitImage: uploaded.body.data.url,
      });
    expect(applied.status).toBe(200);
    expect(applied.body.data.status).toBe("PENDING");
  });
  it("退款拒绝、申诉与平台裁定写入审计并回补库存", async () => {
    const before = await db.product.findUniqueOrThrow({
      where: { id: productId },
    });
    const order = await orderService.createOrder(userId, input);
    const owner = await db.user.findUniqueOrThrow({
      where: { phone: "13811111111" },
    });
    const user = { id: userId, role: "USER" };
    const merchant = { id: owner.id, role: "MERCHANT" };
    await orderService.actOnOrder(order.id, user, "pay");
    await orderService.actOnOrder(
      order.id,
      user,
      "refund",
      undefined,
      "无法用餐",
    );
    await orderService.actOnOrder(
      order.id,
      merchant,
      "refund-reject",
      storeId,
      "已开始备餐",
    );
    await orderService.actOnOrder(order.id, user, "dispute");
    await expect(
      orderService.actOnOrder(order.id, merchant, "refund-approve", storeId),
    ).rejects.toMatchObject({ status: 409 });
    await orderService.resolveDispute(
      order.id,
      { id: "admin", role: "ADMIN" },
      true,
      "核实后退款",
    );
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock,
    ).toBe(before.stock);
    expect(
      await db.auditLog.count({
        where: { targetId: order.id, action: "refund-approve" },
      }),
    ).toBe(1);
  });
  it("支付超时取消并回补库存", async () => {
    const order = await orderService.createOrder(userId, input);
    await db.order.update({
      where: { id: order.id },
      data: { createdAt: new Date(Date.now() - 16 * 60000) },
    });
    await orderService.expireUnpaid();
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe("CANCELLED");
  });
  it("证照文件需要所有者或管理员身份", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    const uploaded = await request(app)
      .post("/api/v1/uploads")
      .auth(merchantToken, { type: "bearer" })
      .field("purpose", "certificate")
      .attach("file", png, {
        filename: "license.png",
        contentType: "image/png",
      });
    expect(uploaded.status).toBe(200);
    expect((await request(app).get(uploaded.body.data.url)).status).toBe(401);
    expect(
      (
        await request(app)
          .get(uploaded.body.data.url)
          .auth(token, { type: "bearer" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(uploaded.body.data.url)
          .auth(merchantToken, { type: "bearer" })
      ).status,
    ).toBe(200);
  });
  it("并发下单不超卖且失败事务不遗留订单", async () => {
    await db.product.update({ where: { id: productId }, data: { stock: 1 } });
    const count = await db.order.count();
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        orderService.createOrder(userId, {
          storeId,
          type: "PICKUP",
          items: [{ productId, qty: 1 }],
        }),
      ),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded).toHaveLength(1);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock,
    ).toBe(0);
    expect(await db.order.count()).toBe(count + 1);
    for (const result of results)
      if (result.status === "fulfilled")
        await orderService.actOnOrder(
          result.value.id,
          { id: userId, role: "USER" },
          "cancel",
        );
    await db.product.update({ where: { id: productId }, data: { stock: 100 } });
  });
  it("用户订单按设计分组筛选，待评价排除已评价，分页总数与归属一致", async () => {
    const customer = await db.user.create({
      data: { phone: "13922223333", name: "分组测试", role: "USER" },
    });
    const actor = { id: customer.id, role: "USER" };
    const fixtures: { id: string }[] = [];
    for (const [i, status] of [
      "PENDING_PAY",
      "PENDING",
      "PREPARING",
      "DELIVERING",
      "PICKUP",
      "DONE",
      "DONE",
      "REFUNDING",
      "CANCELLED",
    ].entries()) {
      fixtures.push(
        await db.order.create({
          data: {
            orderNo: "filter-test-" + i,
            serialOfDay: i + 1,
            userId: customer.id,
            storeId,
            type: "PICKUP",
            status,
            itemsCents: 2800,
            deliveryFeeCents: 0,
            discountCents: 0,
            payCents: 2800,
            ...(i === 6
              ? {
                  review: {
                    create: {
                      userId: customer.id,
                      storeId,
                      rating: 5,
                      content: "已评价",
                    },
                  },
                }
              : {}),
          },
        }),
      );
    }
    const ongoing = await orderService.listOrders(actor, {
      tab: "ongoing",
      pageSize: 2,
    });
    expect(ongoing.total).toBe(5);
    expect(ongoing.list).toHaveLength(2);
    expect(ongoing.list.every((order) => order.userId === customer.id)).toBe(
      true,
    );
    const unreviewed = await orderService.listOrders(actor, {
      tab: "unreviewed",
    });
    expect(unreviewed.total).toBe(1);
    expect(unreviewed.list[0].id).toBe(fixtures[5].id);
    expect(unreviewed.list[0].review).toBeNull();
    const refund = await orderService.listOrders(actor, { tab: "refund" });
    expect(refund.total).toBe(1);
    expect(refund.list[0].id).toBe(fixtures[7].id);
    const all = await orderService.listOrders(actor, { tab: "all" });
    expect(all.total).toBe(9);
    expect(
      all.list.find((order) => order.id === fixtures[6].id)?.review,
    ).toBeTruthy();
    const combined = await orderService.listOrders(actor, {
      tab: "ongoing",
      status: "DONE",
    });
    expect(combined.total).toBe(0);
    await expect(
      orderService.listOrders(actor, { tab: "invalid" }),
    ).rejects.toThrow();
  });
});
