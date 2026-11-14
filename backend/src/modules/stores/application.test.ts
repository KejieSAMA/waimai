import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { applyTestMigrations } from "../../testing/migrations";
let db: PrismaClient, app: Express, directory: string;
let auth: typeof import("../auth/service");
let serial = 0;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "waimai-application-"));
  const file = path.join(directory, "test.db");
  await writeFile(file, "");
  process.env.DATABASE_URL = "file:" + file.replaceAll("\\", "/");
  process.env.UPLOAD_DIR = path.join(directory, "uploads");
  process.env.JWT_SECRET = "application-test-secret-at-least-32-characters";
  db = (await import("../../db")).db;
  app = (await import("../../app")).app;
  auth = await import("../auth/service");
  await applyTestMigrations(db);
});
afterAll(async () => {
  await db?.$disconnect();
  await rm(directory, { recursive: true, force: true });
});
async function fixture(role: "MERCHANT" | "ADMIN" = "MERCHANT") {
  const name = "application_" + ++serial;
  const user = await db.user.create({
    data: { username: name, name, roles: { create: { role } } },
  });
  const token = (await auth.issueSession(user, role)).accessToken;
  const category = await db.category.create({ data: { name } });
  return {
    user,
    token,
    body: {
      name: "测试面馆",
      categoryId: category.id,
      city: "北京",
      address: "测试街道 1 号",
      contactPhone: "13812345678",
      openHours: "09:00-22:00",
      minOrderCents: 2000,
      deliveryFeeCents: 300,
    },
  };
}
const apply = (token: string, body: object) =>
  request(app)
    .put("/api/v1/merchant/application")
    .auth(token, { type: "bearer" })
    .send(body);
async function upload(token: string, purpose = "certificate") {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const response = await request(app)
    .post("/api/v1/uploads")
    .auth(token, { type: "bearer" })
    .field("purpose", purpose)
    .attach("file", png, {
      filename: "document.png",
      contentType: "image/png",
    });
  expect(response.status).toBe(200);
  return response.body.data.url as string;
}
describe("入驻资质选填", () => {
  it("未上传证照也可提交，仍为待审核，不自动通过", async () => {
    const a = await fixture();
    const response = await apply(a.token, a.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      ownerId: a.user.id,
      status: "PENDING",
      licenseImage: "",
      foodPermitImage: "",
      licenseExpireAt: null,
      permitExpireAt: null,
    });
  });
  it.each(["licenseImage", "foodPermitImage"])(
    "只上传 %s 可提交，已有私有文件仍受归属保护",
    async (key) => {
      const a = await fixture(),
        b = await fixture();
      const image = await upload(a.token);
      const response = await apply(a.token, { ...a.body, [key]: image });
      expect(response.status).toBe(200);
      expect(response.body.data[key]).toBe(image);
      expect((await apply(b.token, { ...b.body, [key]: image })).status).toBe(
        400,
      );
      expect(
        (await request(app).get(image).auth(b.token, { type: "bearer" }))
          .status,
      ).toBe(403);
      expect(
        (await request(app).get(image).auth(a.token, { type: "bearer" }))
          .status,
      ).toBe(200);
    },
  );
  it("移除证照会清除历史日期，保留图片但清空日期也会落库", async () => {
    const a = await fixture();
    const image = await upload(a.token);
    await apply(a.token, {
      ...a.body,
      licenseImage: image,
      foodPermitImage: image,
      licenseExpireAt: "2028-01-01",
      permitExpireAt: "2028-02-01",
    });
    const response = await apply(a.token, {
      ...a.body,
      licenseImage: "",
      licenseExpireAt: "2028-01-01",
      foodPermitImage: image,
      permitExpireAt: null,
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      licenseImage: "",
      licenseExpireAt: null,
      foodPermitImage: image,
      permitExpireAt: null,
      submitCount: 2,
    });
    expect(
      await db.store.findUnique({ where: { ownerId: a.user.id } }),
    ).toMatchObject({ licenseExpireAt: null, permitExpireAt: null });
  });
  it("选填不接受外链、损坏日期、普通图片冒充私有证照", async () => {
    const a = await fixture();
    expect(
      (
        await apply(a.token, {
          ...a.body,
          licenseImage: "https://example.com/document.png",
        })
      ).status,
    ).toBe(400);
    const image = await upload(a.token);
    expect(
      (
        await apply(a.token, {
          ...a.body,
          licenseImage: image,
          licenseExpireAt: "invalid",
        })
      ).status,
    ).toBe(400);
    const publicImage = await upload(a.token, "image");
    expect(
      (await apply(a.token, { ...a.body, licenseImage: publicImage })).status,
    ).toBe(400);
  });
  it("无证照申请可由管理员人工通过，通过后和冻结时仍不能重提修改资质", async () => {
    const a = await fixture(),
      admin = await fixture("ADMIN");
    const initial = await apply(a.token, a.body);
    const id = initial.body.data.id;
    const { moderateStore } = await import("./service");
    await moderateStore(id, "approve", { id: admin.user.id, role: "ADMIN" });
    expect((await apply(a.token, a.body)).status).toBe(409);
    await moderateStore(
      id,
      "freeze",
      { id: admin.user.id, role: "ADMIN" },
      "测试冻结",
    );
    expect((await apply(a.token, a.body)).status).toBe(403);
  });
});

describe("店铺可见状态", () => {
  const visibility = (token: string, body: object) =>
    request(app)
      .put("/api/v1/merchant/store/visibility")
      .auth(token, { type: "bearer" })
      .send(body);
  it("默认开启，隐藏与营业独立，公开列表、详情、评价及访问登记不泄漏隐藏店铺", async () => {
    const f = await fixture();
    await apply(f.token, f.body);
    const store = await db.store.update({
      where: { ownerId: f.user.id },
      data: { status: "OPEN" },
    });
    expect(store.visible).toBe(true);
    const hidden = await visibility(f.token, { visible: false });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data).toMatchObject({ visible: false, status: "OPEN" });
    for (const sort of ["default", "sales", "minOrder"]) {
      const list = await request(app).get("/api/v1/public/stores?sort=" + sort);
      expect(
        list.body.data.list.some((s: { id: string }) => s.id === store.id),
      ).toBe(false);
    }
    for (const suffix of ["", "/reviews"]) {
      expect(
        (await request(app).get("/api/v1/public/stores/" + store.id + suffix))
          .status,
      ).toBe(404);
    }
    expect(
      (
        await request(app)
          .post("/api/v1/public/stores/" + store.id + "/visits")
          .send({})
      ).status,
    ).toBe(404);
    const stores = await import("./service");
    await expect(stores.requireOpenStore(store.id)).rejects.toMatchObject({
      status: 409,
    });
    expect(
      (
        await request(app)
          .get("/api/v1/merchant/store")
          .auth(f.token, { type: "bearer" })
      ).body.data.visible,
    ).toBe(false);
    expect(
      (await visibility(f.token, { visible: true })).body.data.status,
    ).toBe("OPEN");
    await request(app)
      .put("/api/v1/merchant/store/open")
      .auth(f.token, { type: "bearer" })
      .send({ open: false });
    expect(
      (await visibility(f.token, { visible: false })).body.data.status,
    ).toBe("CLOSED");
    expect(
      (await visibility(f.token, { visible: true })).body.data.status,
    ).toBe("CLOSED");
    expect(
      (await request(app).get("/api/v1/public/stores/" + store.id)).status,
    ).toBe(200);
  });
  it("切换不覆盖基础草稿、重复请求不重复审计，设置保存不覆盖可见状态", async () => {
    const f = await fixture();
    await apply(f.token, f.body);
    const store = await db.store.update({
      where: { ownerId: f.user.id },
      data: { status: "CLOSED" },
    });
    await visibility(f.token, { visible: false });
    await visibility(f.token, { visible: false });
    expect(
      await db.auditLog.count({
        where: { targetId: store.id, action: "store-visibility" },
      }),
    ).toBe(1);
    const result = await request(app)
      .put("/api/v1/merchant/store")
      .auth(f.token, { type: "bearer" })
      .send({ ...f.body, notice: "修改公告" });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      visible: false,
      notice: "修改公告",
    });
  });
  it("只操作本人已通过店铺，拒绝冻结、未审核、越权字段及游客", async () => {
    const f = await fixture(),
      other = await fixture();
    await apply(f.token, f.body);
    await apply(other.token, other.body);
    expect((await visibility(f.token, { visible: false })).status).toBe(403);
    const store = await db.store.update({
      where: { ownerId: f.user.id },
      data: { status: "CLOSED" },
    });
    expect(
      (await visibility(f.token, { visible: false, storeId: "other" })).status,
    ).toBe(400);
    await visibility(f.token, { visible: false });
    expect(
      (await db.store.findUniqueOrThrow({ where: { ownerId: other.user.id } }))
        .visible,
    ).toBe(true);
    await db.store.update({
      where: { id: store.id },
      data: { status: "FROZEN" },
    });
    expect((await visibility(f.token, { visible: true })).status).toBe(403);
    expect(
      (
        await request(app)
          .put("/api/v1/merchant/store/visibility")
          .send({ visible: false })
      ).status,
    ).toBe(401);
  });
});
