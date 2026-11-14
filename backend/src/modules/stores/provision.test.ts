import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient, app: Express, directory: string;
let auth: typeof import("../auth/service"),
  provision: typeof import("./provision");
let serial = 0;
const password = "Provision-temp-123";
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-provision-"));
  const file = path.join(directory, "test.db");
  await writeFile(file, "");
  process.env.DATABASE_URL = "file:" + file.replaceAll("\\", "/");
  process.env.UPLOAD_DIR = path.join(directory, "uploads");
  process.env.JWT_SECRET = "provision-test-secret-at-least-32-characters";
  process.env.PRODUCT_REVIEW = "false";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("../auth/service");
  provision = await import("./provision");
  await applyTestMigrations(db);
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(directory, { recursive: true, force: true });
});
async function fixture(
  role: "ADMIN" | "USER" | "MERCHANT" = "ADMIN",
  mustChangePassword = false,
) {
  const user = await db.user.create({
    data: {
      username: "operator_" + ++serial,
      name: "管理员",
      mustChangePassword,
      roles: { create: { role } },
    },
  });
  const token = (await auth.issueSession(user, role)).accessToken;
  const category = await db.category.create({
    data: { name: "创建类目_" + serial },
  });
  const p = jwt.decode(token) as jwt.JwtPayload;
  return {
    user,
    token,
    actor: {
      id: user.id,
      sessionId: String(p.sid),
      version: Number(p.version),
    },
    body: {
      account: {
        username: "merchant_new_" + serial,
        password,
        name: "负责人",
        phone: "138" + String(serial).padStart(8, "0"),
      },
      store: {
        name: "新店_" + serial,
        categoryId: category.id,
        city: "测试城市",
        address: "测试路 1 号",
        contactPhone: "13833334444",
        openHours: "09:00-22:00",
        minOrderCents: 2000,
        deliveryFeeCents: 300,
      },
    },
  };
}
const create = (token: string, body: object) =>
  request(app)
    .post("/api/v1/admin/merchants")
    .auth(token, { type: "bearer" })
    .send(body);
async function upload(token: string, purpose = "certificate") {
  const result = await request(app)
    .post("/api/v1/uploads")
    .auth(token, { type: "bearer" })
    .field("purpose", purpose)
    .attach("file", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]), {
      filename: "test.png",
      contentType: "image/png",
    });
  expect(result.status).toBe(200);
  return result.body.data.url as string;
}
async function merchantLogin(username: string) {
  const first = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password, role: "MERCHANT" });
  expect(first.status).toBe(200);
  expect(first.body.data.user.mustChangePassword).toBe(true);
  const oldToken = first.body.data.accessToken as string;
  expect(
    (
      await request(app)
        .get("/api/v1/merchant/store")
        .auth(oldToken, { type: "bearer" })
    ).status,
  ).toBe(403);
  const changed = await request(app)
    .post("/api/v1/auth/password")
    .auth(oldToken, { type: "bearer" })
    .send({ oldPassword: password, password: "Changed-password-123" });
  expect(changed.status).toBe(200);
  expect(
    (
      await request(app)
        .get("/api/v1/merchant/store")
        .auth(oldToken, { type: "bearer" })
    ).status,
  ).toBe(401);
  const result = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password: "Changed-password-123", role: "MERCHANT" });
  expect(result.status).toBe(200);
  return result.body.data.accessToken as string;
}

describe("管理员创建商家账号及店铺", () => {
  it("允许 8 字符临时密码和不填账号手机，无证照时不保存有效期", async () => {
    const f = await fixture();
    const result = await create(f.token, {
      ...f.body,
      account: {
        username: f.body.account.username,
        name: "负责人",
        password: "abcd1234",
      },
      store: { ...f.body.store, licenseExpireAt: "2030-01-01" },
    });
    expect(result.status).toBe(200);
    const stored = await db.user.findUniqueOrThrow({
      where: { id: result.body.data.account.id },
    });
    expect(stored.phone).toBeNull();
    expect(await bcrypt.compare("abcd1234", stored.passwordHash!)).toBe(true);
    expect(result.body.data.store.licenseExpireAt).toBeNull();
  });
  it("仅管理员且完成改密可创建，游客和普通角色不能调用", async () => {
    const before = await db.store.count();
    const admin = await fixture();
    expect(
      (await request(app).post("/api/v1/admin/merchants").send(admin.body))
        .status,
    ).toBe(401);
    for (const role of ["USER", "MERCHANT"] as const) {
      const f = await fixture(role);
      expect((await create(f.token, f.body)).status).toBe(403);
    }
    const forced = await fixture("ADMIN", true);
    expect((await create(forced.token, forced.body)).status).toBe(403);
    expect(await db.store.count()).toBe(before);
  });
  it("原子创建并规范账号名，账号仅商家、必须改密；店铺休息、零评分销量且无演示数据", async () => {
    const f = await fixture();
    f.body.account.username = "  Merchant_Upper_" + serial + "  ";
    const result = await create(f.token, f.body);
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    const { account, store } = result.body.data;
    expect(account).toMatchObject({
      username: f.body.account.username.trim().toLowerCase(),
      roles: ["MERCHANT"],
      status: "ACTIVE",
      mustChangePassword: true,
    });
    expect(store).toMatchObject({
      ownerId: account.id,
      status: "CLOSED",
      submitCount: 0,
      monthlySales: 0,
      rating: null,
      reviewCount: 0,
      licenseImage: "",
      foodPermitImage: "",
    });
    expect(JSON.stringify(result.body)).not.toContain(password);
    expect(account).not.toHaveProperty("passwordHash");
    const user = await db.user.findUniqueOrThrow({ where: { id: account.id } });
    expect(await bcrypt.compare(password, user.passwordHash!)).toBe(true);
    expect(user.phone).toBe(f.body.account.phone);
    expect(store.contactPhone).toBe("13833334444");
    expect(
      await db.refreshSession.count({ where: { userId: account.id } }),
    ).toBe(0);
    const currentOperator = await request(app)
      .get("/api/v1/auth/me")
      .auth(f.token, { type: "bearer" });
    expect(currentOperator.body.data.user.id).toBe(f.user.id);
    expect(currentOperator.body.data.activeRole).toBe("ADMIN");
    for (const count of [
      await db.product.count({ where: { storeId: store.id } }),
      await db.dishCategory.count({ where: { storeId: store.id } }),
      await db.promotion.count({ where: { storeId: store.id } }),
    ])
      expect(count).toBe(0);
    const logs = await db.auditLog.findMany({
      where: { targetId: { in: [account.id, store.id] } },
    });
    expect(logs.map((l) => l.action).sort()).toEqual([
      "account-create",
      "store-create",
    ]);
    expect(JSON.stringify(logs)).not.toContain(password);
    expect(JSON.stringify(logs)).not.toContain(f.body.account.phone);
    const detail = await request(app)
      .get("/api/v1/admin/merchants/" + store.id)
      .auth(f.token, { type: "bearer" });
    expect(detail.body.data.owner).toMatchObject({
      username: account.username,
      mustChangePassword: true,
    });
    const publicStore = await request(app).get(
      "/api/v1/public/stores/" + store.id,
    );
    expect(publicStore.status).toBe(200);
    expect(publicStore.body.data).not.toHaveProperty("owner");
    expect(publicStore.body.data).not.toHaveProperty("ownerId");
  });
  it.each(["roles", "id", "status"])("拒绝账号注入 %s", async (key) => {
    const f = await fixture();
    const result = await create(f.token, {
      ...f.body,
      account: {
        ...f.body.account,
        [key]: key === "roles" ? ["ADMIN"] : "injected",
      },
    });
    expect(result.status).toBe(400);
    expect(
      await db.user.count({ where: { username: f.body.account.username } }),
    ).toBe(0);
  });
  it.each(["ownerId", "status", "id"])("拒绝店铺注入 %s", async (key) => {
    const f = await fixture();
    expect(
      (
        await create(f.token, {
          ...f.body,
          store: { ...f.body.store, [key]: "injected" },
        })
      ).status,
    ).toBe(400);
    expect(
      await db.user.count({ where: { username: f.body.account.username } }),
    ).toBe(0);
  });
  it("拒绝短密码、超字节密码和错误类目，失败不残留账号角色或审计", async () => {
    const f = await fixture();
    const users = await db.user.count(),
      roles = await db.userRole.count(),
      logs = await db.auditLog.count();
    for (const password of ["short", "密".repeat(25)])
      expect(
        (
          await create(f.token, {
            ...f.body,
            account: { ...f.body.account, password },
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await create(f.token, {
          ...f.body,
          store: { ...f.body.store, categoryId: "missing" },
        })
      ).status,
    ).toBe(400);
    expect(await db.user.count()).toBe(users);
    expect(await db.userRole.count()).toBe(roles);
    expect(await db.auditLog.count()).toBe(logs);
  });
  it("店铺审计写入失败时，账号、角色、店铺及账号审计全部回滚", async () => {
    const f = await fixture();
    const users = await db.user.count(),
      stores = await db.store.count(),
      logs = await db.auditLog.count();
    await db.$executeRawUnsafe(
      `CREATE TRIGGER "provision_fail" BEFORE INSERT ON "AuditLog" WHEN NEW.action = 'store-create' BEGIN SELECT RAISE(ABORT, 'provision-test-failure'); END`,
    );
    try {
      await expect(
        provision.provisionMerchant(f.actor, f.body),
      ).rejects.toThrow();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER "provision_fail"`);
    }
    expect(await db.user.count()).toBe(users);
    expect(await db.store.count()).toBe(stores);
    expect(await db.auditLog.count()).toBe(logs);
    expect(
      await db.userRole.count({
        where: { user: { username: f.body.account.username } },
      }),
    ).toBe(0);
  });
  it("已有账号绝不绑定或改权，并发重复提交至多创建一组", async () => {
    const f = await fixture();
    const existing = await db.user.create({
      data: {
        username: f.body.account.username,
        name: "已有用户",
        roles: { create: { role: "USER" } },
      },
    });
    const taken = await create(f.token, f.body);
    expect(taken.status).toBe(409);
    expect(taken.body.details.reason).toBe("USERNAME_TAKEN");
    expect(await db.store.count({ where: { ownerId: existing.id } })).toBe(0);
    expect(
      (await db.userRole.findMany({ where: { userId: existing.id } })).map(
        (r) => r.role,
      ),
    ).toEqual(["USER"]);
    f.body.account.username += "_race";
    const results = await Promise.all([
      create(f.token, f.body),
      create(f.token, f.body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const created = await db.user.findUniqueOrThrow({
      where: { username: f.body.account.username },
    });
    expect(await db.store.count({ where: { ownerId: created.id } })).toBe(1);
  });
  it("事务开始时再次检查管理员会话，旧会话不能完成创建", async () => {
    const f = await fixture();
    const pending = provision.provisionMerchant(f.actor, f.body);
    await db.refreshSession.deleteMany({ where: { id: f.actor.sessionId } });
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(
      await db.user.count({ where: { username: f.body.account.username } }),
    ).toBe(0);
  });
  it.each(["licenseImage", "foodPermitImage"])(
    "管理员单张代传 %s，所属商家改密后可读取，其他商家和游客拒绝",
    async (key) => {
      const f = await fixture(),
        other = await fixture("MERCHANT");
      const url = await upload(f.token);
      const result = await create(f.token, {
        ...f.body,
        store: { ...f.body.store, [key]: url },
      });
      expect(result.status).toBe(200);
      const token = await merchantLogin(f.body.account.username);
      expect(
        (await request(app).get(url).auth(token, { type: "bearer" })).status,
      ).toBe(200);
      expect(
        (await request(app).get(url).auth(other.token, { type: "bearer" }))
          .status,
      ).toBe(403);
      expect((await request(app).get(url)).status).toBe(401);
      const unreferenced = await upload(f.token);
      expect(
        (await request(app).get(unreferenced).auth(token, { type: "bearer" }))
          .status,
      ).toBe(403);
    },
  );
  it("允许双证照和选填日期，拒绝其他上传者、普通图片及私有图片作 Logo", async () => {
    const f = await fixture(),
      another = await fixture();
    const one = await upload(f.token),
      two = await upload(f.token),
      foreign = await upload(another.token),
      publicImage = await upload(f.token, "image");
    for (const url of [foreign, publicImage])
      expect(
        (
          await create(f.token, {
            ...f.body,
            store: { ...f.body.store, licenseImage: url },
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await create(f.token, {
          ...f.body,
          store: { ...f.body.store, logo: one },
        })
      ).status,
    ).toBe(400);
    const result = await create(f.token, {
      ...f.body,
      store: {
        ...f.body.store,
        licenseImage: one,
        foodPermitImage: two,
        licenseExpireAt: "2030-01-01",
        permitExpireAt: null,
      },
    });
    expect(result.status).toBe(200);
    expect(result.body.data.store.licenseExpireAt).toContain("2030-01-01");
    expect(result.body.data.store.permitExpireAt).toBeNull();
  });
  it("创建后改密维护商品、自主营业、用户可见；停用仍冻结店铺", async () => {
    const f = await fixture();
    const result = await create(f.token, f.body);
    expect(result.status).toBe(200);
    const token = await merchantLogin(f.body.account.username);
    expect(
      (
        await request(app)
          .get("/api/v1/merchant/store")
          .auth(token, { type: "bearer" })
      ).body.data.status,
    ).toBe("CLOSED");
    expect(
      (
        await request(app)
          .put("/api/v1/merchant/store")
          .auth(token, { type: "bearer" })
          .send({ ...f.body.store, notice: "新店公告" })
      ).status,
    ).toBe(200);
    const category = await request(app)
      .post("/api/v1/merchant/dish-categories")
      .auth(token, { type: "bearer" })
      .send({ name: "主食" });
    expect(category.status).toBe(200);
    const product = await request(app)
      .post("/api/v1/merchant/products")
      .auth(token, { type: "bearer" })
      .send({
        name: "面条",
        dishCategoryId: category.body.data.id,
        priceCents: 1200,
        stock: 20,
      });
    expect(product.status).toBe(200);
    expect(
      (
        await request(app)
          .put("/api/v1/merchant/store/open")
          .auth(token, { type: "bearer" })
          .send({ open: true })
      ).status,
    ).toBe(200);
    const visible = await request(app).get(
      "/api/v1/public/stores/" + result.body.data.store.id,
    );
    expect(visible.body.data.status).toBe("OPEN");
    expect(
      visible.body.data.products.some(
        (p: { id: string }) => p.id === product.body.data.id,
      ),
    ).toBe(true);
    expect(
      (
        await request(app)
          .put(
            "/api/v1/admin/accounts/" + result.body.data.account.id + "/status",
          )
          .auth(f.token, { type: "bearer" })
          .send({ status: "DISABLED" })
      ).status,
    ).toBe(200);
    expect(
      (
        await db.store.findUniqueOrThrow({
          where: { id: result.body.data.store.id },
        })
      ).status,
    ).toBe("FROZEN");
  });
});
