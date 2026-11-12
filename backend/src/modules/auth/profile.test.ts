import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import type { Role } from "@waimai/shared";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient,
  app: Express,
  auth: typeof import("./service"),
  directory: string;
let serial = 0;
async function identity(role: Role = "USER", extras = {}) {
  const user = await db.user.create({
    data: {
      username: "profile_" + ++serial,
      name: "旧昵称",
      phone: "13912345678",
      roles: { create: { role } },
      ...extras,
    },
  });
  return { user, session: await auth.issueSession(user, role) };
}
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-profile-"));
  const file = path.join(directory, "test.db");
  await writeFile(file, "");
  process.env.DATABASE_URL = "file:" + file.replaceAll("\\", "/");
  process.env.JWT_SECRET = "profile-test-secret-at-least-32-characters";
  process.env.JWT_REFRESH_SECRET =
    "profile-test-refresh-at-least-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("./service");
  await applyTestMigrations(db);
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(directory, { recursive: true, force: true });
});
const update = (token: string, body: object) =>
  request(app)
    .put("/api/v1/auth/me")
    .auth(token, { type: "bearer" })
    .send(body);
describe("本人资料接口", () => {
  it.each(["USER", "MERCHANT", "ADMIN"] as const)(
    "%s 可更新本人资料，不改变授权或撤销会话，审计不含手机正文",
    async (role) => {
      const { user, session } = await identity(role);
      const other = await identity();
      const result = await update(session.accessToken, {
        name: "  新昵称  ",
        phone: "13887654321",
      });
      expect(result.status).toBe(200);
      expect(result.body.data).toMatchObject({
        activeRole: role,
        user: {
          id: user.id,
          name: "新昵称",
          phone: "13887654321",
          roles: [role],
        },
      });
      expect(result.body.data.user).not.toHaveProperty("passwordHash");
      expect(result.body.data).not.toHaveProperty("accessToken");
      expect(await auth.refreshSession(session.refreshToken)).toMatchObject({
        user: { name: "新昵称" },
        activeRole: role,
      });
      expect(
        (
          await request(app)
            .get("/api/v1/auth/me")
            .auth(session.accessToken, { type: "bearer" })
        ).status,
      ).toBe(200);
      expect(
        await db.user.findUnique({ where: { id: other.user.id } }),
      ).toMatchObject({ name: "旧昵称", phone: "13912345678" });
      const logs = await db.auditLog.findMany({ where: { targetId: user.id } });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        actorId: user.id,
        actorRole: role,
        action: "account-profile",
        reason: null,
      });
      expect(JSON.stringify(logs)).not.toContain("13887654321");
    },
  );
  it("省略手机保留，空字符串或 null 清空，未变化不重复写审计", async () => {
    const { user, session } = await identity();
    expect(
      (await update(session.accessToken, { name: "新名字" })).body.data.user
        .phone,
    ).toBe("13912345678");
    expect(
      (await update(session.accessToken, { name: "新名字", phone: "" })).body
        .data.user.phone,
    ).toBe("");
    expect(
      (await update(session.accessToken, { name: "新名字", phone: null }))
        .status,
    ).toBe(200);
    expect(await db.user.findUnique({ where: { id: user.id } })).toMatchObject({
      phone: null,
    });
    expect(await db.auditLog.count({ where: { targetId: user.id } })).toBe(2);
  });
  it.each([
    { name: "" },
    { name: "  " },
    { name: "字".repeat(31) },
    { name: "名字", phone: "123" },
    {},
    { phone: "" },
  ])("严格校验昵称和手机号 %j", async (body) => {
    const { session } = await identity();
    expect((await update(session.accessToken, body)).status).toBe(400);
  });
  it.each([
    "id",
    "userId",
    "username",
    "role",
    "roles",
    "status",
    "password",
    "mustChangePassword",
  ])("拒绝注入 %s，不接受目标账号字段", async (field) => {
    const { session, user } = await identity();
    expect(
      (
        await update(session.accessToken, {
          name: "篡改",
          [field]: "another-account",
        })
      ).status,
    ).toBe(400);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).name,
    ).toBe("旧昵称");
  });
  it("未登录、停用、强制改密及旧角色令牌不能修改", async () => {
    expect(
      (await request(app).put("/api/v1/auth/me").send({ name: "未登录" }))
        .status,
    ).toBe(401);
    const disabled = await identity();
    await db.user.update({
      where: { id: disabled.user.id },
      data: { status: "DISABLED" },
    });
    expect(
      (await update(disabled.session.accessToken, { name: "停用" })).status,
    ).toBe(401);
    const forced = await identity("USER", { mustChangePassword: true });
    expect(
      (await update(forced.session.accessToken, { name: "强制" })).status,
    ).toBe(403);
    const old = await identity();
    await db.userRole.create({ data: { userId: old.user.id, role: "ADMIN" } });
    const payload = jwt.decode(old.session.accessToken) as jwt.JwtPayload;
    await auth.switchRole(payload.sid, "ADMIN");
    expect(
      (await update(old.session.accessToken, { name: "旧角色" })).status,
    ).toBe(401);
  });
  it("事务内重新核验会话版本和本人，避免通过已鉴权的旧请求写入", async () => {
    const { user, session } = await identity();
    const payload = jwt.decode(session.accessToken) as jwt.JwtPayload;
    await expect(
      auth.updateProfile(
        { id: "other", role: "USER" },
        payload.sid,
        payload.version,
        { name: "跨账号" },
      ),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      auth.updateProfile(
        { id: user.id, role: "USER" },
        payload.sid,
        payload.version + 1,
        { name: "旧版本" },
      ),
    ).rejects.toMatchObject({ status: 401 });
    await db.refreshSession.deleteMany({ where: { userId: user.id } });
    await expect(
      auth.updateProfile(
        { id: user.id, role: "USER" },
        payload.sid,
        payload.version,
        { name: "会话撤销" },
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
});
