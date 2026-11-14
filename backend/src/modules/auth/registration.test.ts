import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import bcrypt from "bcryptjs";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient, app: Express, directory: string;
let auth: typeof import("./service"),
  accounts: typeof import("../accounts/service");
const password = "Registration-123";
let serial = 0;
const input = (extra = {}) => ({
  username: "registration_" + ++serial,
  password,
  phone: "138" + String(serial).padStart(8, "0"),
  ...extra,
});
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-registration-"));
  const file = path.join(directory, "test.db");
  await writeFile(file, "");
  process.env.DATABASE_URL = "file:" + file.replaceAll("\\", "/");
  process.env.JWT_SECRET = "registration-access-test-secret-32-characters";
  process.env.JWT_REFRESH_SECRET =
    "registration-refresh-test-secret-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("./service");
  accounts = await import("../accounts/service");
  await applyTestMigrations(db);
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(directory, { recursive: true, force: true });
});
describe("注册必填手机号及手机号登录", () => {
  it("保留账号注册，昵称缺省使用修剪后的手机号，账号和手机号均登录同一 USER", async () => {
    const body = input(),
      result = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...body, phone: " " + body.phone + " " });
    expect(result.status).toBe(200);
    expect(result.body.data.user).toMatchObject({
      username: body.username,
      phone: body.phone,
      name: body.phone,
      roles: ["USER"],
    });
    for (const username of [body.username, body.phone]) {
      const login = await request(app)
        .post("/api/v1/auth/login")
        .send({ username, password });
      expect(login.status).toBe(200);
      expect(login.body.data.user.id).toBe(result.body.data.user.id);
      expect(login.body.data.user).not.toHaveProperty("passwordHash");
    }
  });
  it.each(["", "  ", "  自定义昵称  "])(
    "空昵称回退手机号，已填昵称保留修剪结果 %s",
    async (name) => {
      const body = input({ name });
      const session = await auth.register(body);
      expect(session.user.name).toBe(name.trim() || body.phone);
    },
  );
  it("非法或缺失手机号不创建账号", async () => {
    const before = await db.user.count();
    for (const phone of [undefined, "", "123"]) {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(input({ phone }));
      expect(response.status).toBe(400);
      expect(response.body.details.fieldErrors.phone).toBeDefined();
    }
    expect(await db.user.count()).toBe(before);
  });
  it("重复手机号拒绝注册，不覆盖原账号或授权", async () => {
    const body = input(),
      original = await auth.register(body);
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(input({ phone: body.phone, name: "另一个账号" }));
    expect(response.status).toBe(409);
    expect(response.body.message).toContain("手机号");
    expect(await db.user.count({ where: { phone: body.phone } })).toBe(1);
    expect(
      await db.user.findUnique({ where: { id: original.user.id } }),
    ).toMatchObject({ name: body.phone, username: body.username });
  });
  it("并发重复手机号只创建一个账号和对应会话", async () => {
    const body = input(),
      second = input({ phone: body.phone });
    const results = await Promise.all(
      [body, second].map((data) =>
        request(app).post("/api/v1/auth/register").send(data),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const owners = await db.user.findMany({ where: { phone: body.phone } });
    expect(owners).toHaveLength(1);
    expect(
      await db.refreshSession.count({ where: { userId: owners[0].id } }),
    ).toBe(1);
  });
  it("资料改号、管理员创建和编辑同样拒绝重复手机号，数据库阻止绕过接口", async () => {
    const first = await auth.register(input()),
      second = await auth.register(input());
    const response = await request(app)
      .put("/api/v1/auth/me")
      .auth(second.accessToken, { type: "bearer" })
      .send({ name: "新昵称", phone: first.user.phone });
    expect(response.status).toBe(409);
    expect(
      await db.user.findUnique({ where: { id: second.user.id } }),
    ).toMatchObject({ phone: second.user.phone, name: second.user.name });
    expect(
      await db.auditLog.count({ where: { targetId: second.user.id } }),
    ).toBe(0);
    const admin = await db.user.create({
      data: {
        username: "phone_admin",
        name: "管理员",
        passwordHash: await bcrypt.hash(password, 4),
        roles: { create: { role: "ADMIN" } },
      },
    });
    const actor = { id: admin.id, role: "ADMIN" };
    await expect(
      accounts.create(
        {
          ...input({ phone: first.user.phone }),
          name: "新用户",
          roles: ["USER"],
        },
        actor,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      accounts.update(
        second.user.id,
        "edit",
        { name: "新用户", phone: first.user.phone },
        actor,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      db.user.create({
        data: {
          username: "bypass_duplicate",
          name: "重复",
          phone: first.user.phone,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await db.user.create({
      data: { username: "empty_phone_a", name: "无手机", phone: null },
    });
    await db.user.create({
      data: { username: "empty_phone_b", name: "无手机", phone: null },
    });
  });
  it("手机号登录沿用密码、授权、停用及首次改密限制", async () => {
    const body = input(),
      created = await auth.register(body);
    await expect(
      auth.passwordLogin({ username: body.phone, password: "wrong-password" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      auth.passwordLogin({ username: body.phone, password, role: "ADMIN" }),
    ).rejects.toMatchObject({ status: 403 });
    await db.user.update({
      where: { id: created.user.id },
      data: { mustChangePassword: true },
    });
    const limited = await auth.passwordLogin({
      username: body.phone,
      password,
    });
    const protectedResult = await request(app)
      .get("/api/v1/user/addresses")
      .auth(limited.accessToken, { type: "bearer" });
    expect(protectedResult.status).toBe(403);
    await db.user.update({
      where: { id: created.user.id },
      data: { status: "DISABLED" },
    });
    await expect(
      auth.passwordLogin({ username: body.phone, password }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("账号和手机号共用账号级失败次数", async () => {
    const body = input();
    await auth.register(body);
    for (let i = 0; i < 10; i++)
      await expect(
        auth.passwordLogin({
          username: i % 2 ? body.phone : body.username,
          password: "wrong-password",
        }),
      ).rejects.toMatchObject({ status: 401 });
    for (const username of [body.phone, body.username])
      await expect(
        auth.passwordLogin({ username, password }),
      ).rejects.toMatchObject({ status: 429 });
  });
  it("禁止新账号占用已有手机号作为账号名，手机号也不能占用已有数字账号", async () => {
    const body = input();
    await auth.register(body);
    await expect(
      auth.register(input({ username: body.phone })),
    ).rejects.toMatchObject({ status: 409 });
    const numeric = "13976543210";
    await db.user.create({
      data: {
        username: numeric,
        name: "旧数字账号",
        passwordHash: await bcrypt.hash(password, 4),
        roles: { create: { role: "USER" } },
      },
    });
    await expect(
      auth.register(input({ phone: numeric })),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await auth.passwordLogin({ username: numeric, password })).user.username,
    ).toBe(numeric);
  });
});
