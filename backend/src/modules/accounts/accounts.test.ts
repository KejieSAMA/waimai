import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient,
  app: Express,
  auth: typeof import("../auth/service"),
  accounts: typeof import("./service"),
  directory: string;
let serial = 0;
const password = "Test-password-12345";
const actor = { id: "", role: "ADMIN" };
async function user(roles = ["USER"], extras = {}) {
  return db.user.create({
    data: {
      username: "account_" + ++serial,
      name: "测试账号",
      passwordHash: await bcrypt.hash(password, 4),
      roles: { create: roles.map((role) => ({ role })) },
      ...extras,
    },
  });
}
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-accounts-"));
  const filename = path.join(directory, "test.db");
  await writeFile(filename, "");
  process.env.DATABASE_URL = "file:" + filename.replaceAll("\\", "/");
  process.env.JWT_SECRET = "account-test-access-key-at-least-32-characters";
  process.env.JWT_REFRESH_SECRET =
    "account-test-refresh-key-at-least-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("../auth/service");
  accounts = await import("./service");
  await applyTestMigrations(db, async (name) => {
    if (name !== "20261112000000_accounts") return;
    await db.$executeRawUnsafe(
      `INSERT INTO "User" (id,phone,name,role,passwordHash) VALUES ('legacy','13900000001','旧店主','MERCHANT','old-hash')`,
    );
    const category = await db.category.create({
      data: { id: "legacy-category", name: "旧类目" },
    });
    await db.$executeRaw`INSERT INTO "Store" (id,ownerId,categoryId,name,status) VALUES ('legacy-store','legacy',${category.id},'旧店铺','OPEN')`;
    await db.$executeRawUnsafe(
      `INSERT INTO "RefreshSession" (id,userId,digest,expiresAt) VALUES ('legacy-session','legacy','old-refresh',9999999999999)`,
    );
  });
  await accounts.initializeAdmin("bootstrap_initial", password);
  const admin = await db.user.findUniqueOrThrow({
    where: { username: "bootstrap_initial" },
  });
  actor.id = admin.id;
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(directory, { recursive: true, force: true });
});
describe("正式账号、授权与会话", () => {
  it("完整迁移保留身份归属但禁用旧账号、删除旧密码和会话、冻结店铺", async () => {
    const old = await db.user.findUniqueOrThrow({
      where: { id: "legacy" },
      include: { roles: true },
    });
    expect(old).toMatchObject({
      username: "13900000001",
      status: "DISABLED",
      passwordHash: null,
      mustChangePassword: true,
    });
    expect(old.roles.map((r) => r.role)).toEqual(["MERCHANT"]);
    expect(
      await db.refreshSession.count({ where: { id: "legacy-session" } }),
    ).toBe(0);
    expect(
      await db.store.findUnique({ where: { id: "legacy-store" } }),
    ).toMatchObject({
      ownerId: "legacy",
      status: "FROZEN",
      previousStatus: "OPEN",
    });
  });
  it("注册只授予 USER，不能注入管理员权限，旧验证码入口不可用", async () => {
    expect(
      (
        await request(app)
          .post("/api/v1/auth/register")
          .send({
            username: "registered",
            password,
            name: "注册用户",
            roles: ["ADMIN"],
          })
      ).status,
    ).toBe(400);
    const result = await request(app)
      .post("/api/v1/auth/register")
      .send({ username: "Registered", password, name: "注册用户" });
    expect(result.status).toBe(200);
    expect(result.body.data.user.roles).toEqual(["USER"]);
    expect(result.body.data.user.username).toBe("registered");
    expect(result.body.data.user).not.toHaveProperty("passwordHash");
    expect(
      (
        await request(app)
          .post("/api/v1/auth/user/code")
          .send({ phone: "13900000001" })
      ).status,
    ).toBe(404);
  });
  it("普通用户和伪造 JWT 均不能读取后台", async () => {
    const u = await user();
    const s = await auth.issueSession(u, "USER");
    for (const endpoint of [
      "/admin/accounts",
      "/admin/merchants",
      "/merchant/products",
    ])
      expect(
        (
          await request(app)
            .get("/api/v1" + endpoint)
            .auth(s.accessToken, { type: "bearer" })
        ).status,
      ).toBe(403);
    const forged = jwt.sign({ role: "ADMIN" }, process.env.JWT_SECRET!, {
      subject: u.id,
    });
    expect(
      (
        await request(app)
          .get("/api/v1/admin/accounts")
          .auth(forged, { type: "bearer" })
      ).status,
    ).toBe(401);
  });
  it("没有授权不可切换；授权后显式切换，旧角色令牌立即失效", async () => {
    const u = await user();
    const s = await auth.issueSession(u, "USER");
    await expect(
      auth.switchRole(
        (jwt.decode(s.accessToken) as jwt.JwtPayload).sid,
        "ADMIN",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await db.userRole.create({ data: { userId: u.id, role: "MERCHANT" } });
    const next = await auth.switchRole(
      (jwt.decode(s.accessToken) as jwt.JwtPayload).sid,
      "MERCHANT",
    );
    expect(next.activeRole).toBe("MERCHANT");
    expect(
      (
        await request(app)
          .get("/api/v1/user/orders")
          .auth(s.accessToken, { type: "bearer" })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/v1/merchant/application")
          .auth(next.accessToken, { type: "bearer" })
      ).status,
    ).toBe(200);
    await expect(auth.refreshSession(s.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
  });
  it("恢复当前单一会话不会接受客户端指定的另一个角色；旧 Cookie 无效", async () => {
    const u = await user();
    const s = await auth.issueSession(u, "USER");
    const r = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "xz_refresh=" + s.refreshToken)
      .send({ role: "ADMIN" });
    expect(r.status).toBe(200);
    expect(r.body.data.activeRole).toBe("USER");
    expect(
      (r.headers["set-cookie"] as unknown as string[]).some((cookie) =>
        cookie.startsWith("xz_refresh="),
      ),
    ).toBe(false);
    expect(
      (
        await request(app)
          .post("/api/v1/auth/refresh")
          .set("Cookie", "xz_refresh_ADMIN=old")
          .send({ role: "ADMIN" })
      ).status,
    ).toBe(401);
  });
  it("登录新账号会撤销该浏览器原账号会话", async () => {
    const first = await user();
    const old = await auth.issueSession(first, "USER");
    const second = await user();
    const r = await request(app)
      .post("/api/v1/auth/login")
      .set("Cookie", "xz_refresh=" + old.refreshToken)
      .send({ username: second.username, password, role: "USER" });
    expect(r.status).toBe(200);
    await expect(auth.refreshSession(old.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
  });
  it("账号管理创建临时密码、首次改密前禁止业务 API，改密后旧会话失效", async () => {
    const created = await accounts.create(
      { username: "temporary", name: "临时账号", password, roles: ["USER"] },
      actor,
    );
    const s = await auth.passwordLogin({
      username: created.username,
      password,
      role: "USER",
    });
    expect(s.user.mustChangePassword).toBe(true);
    expect((await accounts.audit(created.id))[0]).toMatchObject({
      action: "account-create",
      actorName: "管理员",
    });
    expect(
      (
        await request(app)
          .get("/api/v1/user/orders")
          .auth(s.accessToken, { type: "bearer" })
      ).status,
    ).toBe(403);
    await expect(
      auth.changePassword(created.id, "incorrect", "Changed-password-123"),
    ).rejects.toMatchObject({ status: 400 });
    await auth.changePassword(created.id, password, "Changed-password-123");
    await expect(auth.refreshSession(s.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
    expect(
      (
        await auth.passwordLogin({
          username: "temporary",
          password: "Changed-password-123",
          role: "USER",
        })
      ).user.mustChangePassword,
    ).toBe(false);
  });
  it("停用商家冻结店铺、撤销全部会话并写审计；启用不自动解冻", async () => {
    const u = await user(["USER", "MERCHANT"]);
    const s = await auth.issueSession(u, "MERCHANT");
    const store = await db.store.create({
      data: {
        ownerId: u.id,
        categoryId: "legacy-category",
        name: "经营店铺",
        status: "OPEN",
      },
    });
    await accounts.update(u.id, "status", { status: "DISABLED" }, actor);
    expect(
      (await db.store.findUniqueOrThrow({ where: { id: store.id } })).status,
    ).toBe("FROZEN");
    await expect(auth.refreshSession(s.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
    expect(
      await db.auditLog.count({
        where: { targetId: u.id, action: "account-status" },
      }),
    ).toBe(1);
    await expect(
      (await import("../stores/service")).moderateStore(
        store.id,
        "unfreeze",
        actor,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await accounts.update(u.id, "status", { status: "ACTIVE" }, actor);
    expect(
      (await db.store.findUniqueOrThrow({ where: { id: store.id } })).status,
    ).toBe("FROZEN");
  });
  it("撤销商家角色同样冻结店铺，重置密码撤销所有设备会话", async () => {
    const u = await user(["USER", "MERCHANT"]);
    const s = await auth.issueSession(u, "USER");
    const s2 = await auth.issueSession(u, "MERCHANT");
    const store = await db.store.create({
      data: {
        ownerId: u.id,
        categoryId: "legacy-category",
        name: "撤权店铺",
        status: "CLOSED",
      },
    });
    await accounts.update(u.id, "roles", { roles: ["USER"] }, actor);
    expect(
      (await db.store.findUniqueOrThrow({ where: { id: store.id } })).status,
    ).toBe("FROZEN");
    await expect(auth.refreshSession(s.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
    await expect(auth.refreshSession(s2.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
    const next = await auth.issueSession(
      await db.user.findUniqueOrThrow({ where: { id: u.id } }),
      "USER",
    );
    await accounts.update(
      u.id,
      "password",
      { password: "Reset-password-1234" },
      actor,
    );
    await expect(auth.refreshSession(next.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
  });
  it("保护自身与最后一个管理员，角色不能为空", async () => {
    await expect(
      accounts.update(actor.id, "status", { status: "DISABLED" }, actor),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      accounts.update(actor.id, "roles", { roles: ["USER"] }, actor),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      accounts.update(
        actor.id,
        "status",
        { status: "DISABLED" },
        { id: "server-test", role: "ADMIN" },
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      accounts.update(actor.id, "roles", { roles: [] }, actor),
    ).rejects.toBeDefined();
  });
  it("账号筛选及详情不返回密码，手机号列表只显示尾号", async () => {
    const u = await user(["USER"], { phone: "13912345678" });
    const result = await accounts.list({
      keyword: u.username,
      role: "USER",
      status: "ACTIVE",
    });
    expect(result.total).toBe(1);
    expect(result.list[0].phone).toBe("尾号 5678");
    expect(await accounts.detail(u.id)).not.toHaveProperty("passwordHash");
  });
  it("首管理员不能重复初始化，恢复只针对现有管理员", async () => {
    await expect(
      accounts.initializeAdmin("new_admin", password),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      accounts.initializeAdmin("nonexistent", password, true),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("停用后通知 SSE 校验器，过期会话和伪造会话版本均失效", async () => {
    const u = await user();
    const s = await auth.issueSession(u, "USER");
    const payload = jwt.decode(s.accessToken) as jwt.JwtPayload;
    await expect(
      auth.validateSession(payload.sid, payload.version + 1),
    ).rejects.toMatchObject({ status: 401 });
    const { sessionEvents } = await import("../auth/events");
    let signaled = false;
    const listener = () => {
      signaled = true;
    };
    sessionEvents.on(u.id, listener);
    await accounts.update(u.id, "status", { status: "DISABLED" }, actor);
    sessionEvents.off(u.id, listener);
    expect(signaled).toBe(true);
    await expect(
      auth.validateSession(payload.sid, payload.version),
    ).rejects.toMatchObject({ status: 401 });
    const other = await user();
    const expired = await auth.issueSession(other, "USER");
    await db.refreshSession.updateMany({
      where: { userId: other.id },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      auth.refreshSession(expired.refreshToken),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("密码长度与多字节边界校验，短信用户不能用旧固定码登录", async () => {
    await expect(
      auth.register({
        username: "short_pw",
        password: "short",
        name: "短密码",
      }),
    ).rejects.toBeDefined();
    await expect(
      auth.register({
        username: "long_bytes",
        password: "中".repeat(25),
        name: "多字节",
      }),
    ).rejects.toBeDefined();
    expect(
      (
        await request(app)
          .post("/api/v1/auth/user/login")
          .send({ phone: "13900000001", code: "123456" })
      ).status,
    ).toBe(404);
  });
  it("停用商家会结束已经建立的 SSE 连接", async () => {
    const u = await user(["MERCHANT"]);
    await db.store.create({
      data: {
        ownerId: u.id,
        categoryId: "legacy-category",
        name: "推送测试店",
        status: "OPEN",
      },
    });
    const session = await auth.issueSession(u, "MERCHANT");
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as { port: number };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/merchant/orders/stream`,
        {
          headers: { Authorization: "Bearer " + session.accessToken },
          signal: controller.signal,
        },
      );
      expect(response.status).toBe(200);
      const reader = response.body!.getReader();
      expect((await reader.read()).done).toBe(false);
      await accounts.update(u.id, "status", { status: "DISABLED" }, actor);
      expect((await reader.read()).done).toBe(true);
    } finally {
      clearTimeout(timeout);
      controller.abort();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it("按账号限制连续失败，不能通过切换 IP 绕过账号级限流", async () => {
    const u = await user();
    for (let i = 0; i < 10; i++)
      await expect(
        auth.passwordLogin({
          username: u.username,
          password: "Incorrect-password",
          role: "USER",
        }),
      ).rejects.toMatchObject({ status: 401 });
    await expect(
      auth.passwordLogin({ username: u.username, password, role: "USER" }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
