import { z } from "zod";
import { Prisma, type Store } from "@prisma/client";
import { db } from "../../db";
import { assert, pagination, pageResult, shanghaiDay } from "../../http";
import { storeTransition } from "../../domain/storeMachine";
import { recordAudit } from "../audit/service";
import { privateOwner } from "../uploads/service";
import { categoryExists } from "../categories/service";
import { storeSchema, applicationSchema } from "./schema";
export const ownStore = (ownerId: string) =>
  db.store.findUnique({ where: { ownerId } });
export function safeStore<T extends Store>(store: T) {
  const {
    ownerId,
    contactPhone,
    licenseImage,
    foodPermitImage,
    licenseExpireAt,
    permitExpireAt,
    ...visible
  } = store;
  void ownerId;
  void contactPhone;
  void licenseImage;
  void foodPermitImage;
  void licenseExpireAt;
  void permitExpireAt;
  return visible;
}
export async function requireOpenStore(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  const store = await tx.store.findUnique({
    where: { id },
    include: { promotions: true },
  });
  assert(store?.status === "OPEN", 409, "店铺当前无法接单");
  return store;
}
export async function storeList(query: Record<string, unknown>, admin = false) {
  const p = pagination(query);
  const categoryId = z.string().optional().parse(query.categoryId) || undefined;
  const city = z.string().optional().parse(query.city) || undefined;
  const status = admin ? p.status : undefined;
  const where: Prisma.StoreWhereInput = {
    ...(status
      ? { status }
      : admin
        ? {}
        : { status: { in: ["OPEN", "CLOSED"] } }),
    categoryId,
    city,
    ...(p.keyword ? { name: { contains: p.keyword } } : {}),
  };
  const sort = z
    .enum(["default", "distance", "sales", "minOrder"])
    .default("default")
    .parse(query.sort);
  const orderBy: Prisma.StoreOrderByWithRelationInput =
    sort === "sales"
      ? { monthlySales: "desc" }
      : sort === "minOrder"
        ? { minOrderCents: "asc" }
        : { createdAt: "asc" };
  const [list, total] = await Promise.all([
    db.store.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      include: {
        category: true,
        promotions: true,
        owner: admin ? { select: { name: true } } : false,
      },
    }),
    db.store.count({ where }),
  ]);
  const result = pageResult(admin ? list : list.map(safeStore), total, p);
  if (!admin) return result;
  const groups = await db.store.groupBy({
    by: ["status"],
    where: { ...where, status: undefined },
    _count: { id: true },
  });
  const counts: Record<string, number> = {
    all: groups.reduce((sum, group) => sum + group._count.id, 0),
  };
  for (const group of groups) counts[group.status] = group._count.id;
  const cities = await db.store.findMany({
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return {
    ...result,
    counts,
    filterOptions: { cities: cities.map((s) => s.city).filter(Boolean) },
  };
}
export async function storeDetail(id: string, admin = false) {
  const store = await db.store.findUnique({
    where: { id },
    include: {
      category: true,
      owner: admin ? { select: { name: true } } : false,
      promotions: true,
      dishCategories: { orderBy: { sort: "asc" } },
      products: admin
        ? true
        : { where: { status: "ON" }, orderBy: { createdAt: "asc" } },
    },
  });
  assert(
    store && (admin || ["OPEN", "CLOSED"].includes(store.status)),
    404,
    "店铺不存在",
  );
  const result = {
    ...store,
    products: store.products.map((p) => ({
      ...p,
      displayStatus: p.status === "ON" && p.stock === 0 ? "SOLDOUT" : p.status,
    })),
  };
  return admin ? result : safeStore(result);
}
export async function saveStore(
  ownerId: string,
  body: unknown,
  application = false,
) {
  const data = (application ? applicationSchema : storeSchema).parse(body);
  assert(await categoryExists(data.categoryId), 400, "平台类目不存在");
  if (application) {
    for (const url of [data.licenseImage, data.foodPermitImage])
      assert(
        (await privateOwner(url.replace("/uploads/", ""))) === ownerId,
        400,
        "请上传本人证照材料",
      );
  }
  return db.$transaction(async (tx) => {
    const old = await tx.store.findUnique({ where: { ownerId } });
    if (!old) {
      assert(application, 404, "请先申请入驻");
      return tx.store.create({ data: { ...data, ownerId, status: "PENDING" } });
    }
    assert(old.status !== "FROZEN", 403, "已冻结店铺只允许查看");
    if (application) {
      assert(
        ["REJECTED", "PENDING"].includes(old.status),
        409,
        "当前状态无法重提申请",
      );
      return tx.store.update({
        where: { id: old.id },
        data: {
          ...data,
          status:
            old.status === "REJECTED"
              ? storeTransition(old.status, "submit")
              : old.status,
          rejectReason: null,
          submitCount: { increment: 1 },
        },
      });
    }
    assert(
      ["OPEN", "CLOSED"].includes(old.status),
      403,
      "审核通过后可修改店铺",
    );
    const {
      licenseImage,
      foodPermitImage,
      licenseExpireAt,
      permitExpireAt,
      ...settings
    } = data;
    void licenseImage;
    void foodPermitImage;
    void licenseExpireAt;
    void permitExpireAt;
    return tx.store.update({ where: { id: old.id }, data: settings });
  });
}
export async function setOpen(ownerId: string, open: boolean) {
  return db.$transaction(async (tx) => {
    const old = await tx.store.findUnique({ where: { ownerId } });
    assert(old, 404, "店铺不存在");
    const target = open ? "OPEN" : "CLOSED";
    if (old.status === target) return old;
    return tx.store.update({
      where: { id: old.id },
      data: { status: storeTransition(old.status, open ? "open" : "close") },
    });
  });
}
export async function moderateStore(
  id: string,
  action: string,
  actor: { id: string; role: string },
  reason?: string,
) {
  return db.$transaction(async (tx) => {
    const old = await tx.store.findUnique({ where: { id } });
    assert(old, 404, "店铺不存在");
    const status = storeTransition(old.status, action, old.previousStatus);
    await recordAudit(tx, actor, action, "Store", id, reason);
    return tx.store.update({
      where: { id },
      data: {
        status,
        ...(action === "freeze"
          ? { previousStatus: old.status, frozenReason: reason }
          : {}),
        ...(action === "reject" ? { rejectReason: reason } : {}),
        ...(action === "unfreeze" ? { frozenReason: null } : {}),
      },
    });
  });
}
export const storeCounts = async (storeId?: string) => ({
  stores: await db.store.count({ where: { id: storeId, status: "OPEN" } }),
  pending: await db.store.count({ where: { id: storeId, status: "PENDING" } }),
  newStores: await db.store.count({
    where: { id: storeId, createdAt: { gte: shanghaiDay() } },
  }),
});
export async function expiringLicenses(storeId?: string) {
  const end = new Date(Date.now() + 30 * 86400000);
  return db.store.count({
    where: {
      id: storeId,
      OR: [{ licenseExpireAt: { lte: end } }, { permitExpireAt: { lte: end } }],
    },
  });
}
export const rankings = async (ids?: string[]) =>
  (
    await db.store.findMany({
      where: ids ? { id: { in: ids } } : { status: "OPEN" },
      orderBy: { monthlySales: "desc" },
      take: ids ? undefined : 10,
      include: { category: true },
    })
  ).map(safeStore);

export const recordStoreSale = (
  tx: Prisma.TransactionClient,
  storeId: string,
) =>
  tx.store.update({
    where: { id: storeId },
    data: { monthlySales: { increment: 1 } },
  });
