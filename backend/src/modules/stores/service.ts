import {
  storeMetrics,
  withStoreMetrics,
  withProductMetrics,
} from "../orders/metrics";
import { z } from "zod";
import { Prisma, type Store } from "@prisma/client";
import { db } from "../../db";
import {
  assert,
  HttpError,
  pagination,
  pageResult,
  shanghaiDay,
} from "../../http";
import { canOperateStore } from "../auth/service";
import { storeTransition } from "../../domain/storeMachine";
import { recordAudit } from "../audit/service";
import { privateOwner } from "../uploads/service";
import { categoryExists } from "../categories/service";
import { storeSchema, applicationSchema, managedStoreSchema } from "./schema";
export async function visibleStore(id: string) {
  const store = await db.store.findFirst({
    where: { id, status: { in: ["OPEN", "CLOSED"] } },
    select: { id: true, ownerId: true },
  });
  assert(store, 404, "店铺不存在");
  return store;
}
export async function createManagedStore(
  tx: Prisma.TransactionClient,
  ownerId: string,
  data: z.output<typeof managedStoreSchema>,
  actor: { id: string; role: string },
) {
  if (!(await categoryExists(data.categoryId, tx)))
    throw new HttpError(400, "平台类目不存在，请重新选择", {
      reason: "CATEGORY_UNAVAILABLE",
    });
  const store = await tx.store.create({
    data: {
      ...data,
      ownerId,
      status: "CLOSED",
      previousStatus: "CLOSED",
      submitCount: 0,
      rating: null,
      monthlySales: 0,
    },
  });
  await recordAudit(
    tx,
    actor,
    "store-create",
    "Store",
    store.id,
    "管理员直接创建，初始休息中",
  );
  return store;
}
export async function ownsStoreCertificate(ownerId: string, url: string) {
  return !!(await db.store.findFirst({
    where: { ownerId, OR: [{ licenseImage: url }, { foodPermitImage: url }] },
    select: { id: true },
  }));
}
export const ownStore = async (ownerId: string) => {
  const row = await db.store.findUnique({ where: { ownerId } });
  return row ? (await withStoreMetrics([row]))[0] : null;
};
export const cartStore = (id: string, tx: Prisma.TransactionClient = db) =>
  tx.store.findUnique({
    where: { id },
    select: { id: true, name: true, logo: true, status: true },
  });
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
    .enum(["default", "sales", "minOrder"])
    .default("default")
    .parse(query.sort);
  const orderBy: Prisma.StoreOrderByWithRelationInput =
    sort === "sales"
      ? { monthlySales: "desc" }
      : sort === "minOrder"
        ? { minOrderCents: "asc" }
        : { createdAt: "asc" };
  let ranked: string[] | undefined;
  if (sort === "sales") {
    const candidates = await db.store.findMany({ where, select: { id: true } });
    const metrics = await storeMetrics(candidates.map((c) => c.id));
    ranked = candidates
      .sort(
        (a, b) =>
          metrics.get(b.id)!.monthlySales - metrics.get(a.id)!.monthlySales ||
          a.id.localeCompare(b.id),
      )
      .slice(p.skip, p.skip + p.pageSize)
      .map((c) => c.id);
  }
  const [list, total] = await Promise.all([
    db.store.findMany({
      where: ranked ? { ...where, id: { in: ranked } } : where,
      orderBy,
      ...(ranked ? {} : { skip: p.skip, take: p.take }),
      include: {
        category: true,
        promotions: true,
        owner: admin
          ? {
              select: {
                id: true,
                name: true,
                username: true,
                mustChangePassword: true,
              },
            }
          : false,
      },
    }),
    db.store.count({ where }),
  ]);
  if (ranked) list.sort((a, b) => ranked.indexOf(a.id) - ranked.indexOf(b.id));
  const enriched = await withStoreMetrics(list);
  const result = pageResult(
    admin ? enriched : enriched.map(safeStore),
    total,
    p,
  );
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
      owner: admin
        ? {
            select: {
              id: true,
              name: true,
              username: true,
              mustChangePassword: true,
            },
          }
        : false,
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
    ...(await storeMetrics([store.id])).get(store.id)!,
    products: (await withProductMetrics(store.products)).map((p) => ({
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
    for (const url of [data.licenseImage, data.foodPermitImage].filter(Boolean))
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
    if (action === "unfreeze" || action === "approve")
      assert(
        await canOperateStore(old.ownerId, tx),
        409,
        "请先启用账号并授予商家身份",
      );
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
export const rankings = async (ids?: string[]) => {
  const rows = await db.store.findMany({
    where: ids ? { id: { in: ids } } : { status: "OPEN" },
    include: { category: true },
  });
  const enriched = (await withStoreMetrics(rows)).sort(
    (a, b) => b.monthlySales - a.monthlySales || a.id.localeCompare(b.id),
  );
  return (ids ? enriched : enriched.slice(0, 10)).map(safeStore);
};

export async function freezeForAccount(
  tx: Prisma.TransactionClient,
  ownerId: string,
  actor: { id: string; role: string },
) {
  const store = await tx.store.findUnique({ where: { ownerId } });
  if (!store || store.status === "FROZEN") return;
  await tx.store.update({
    where: { id: store.id },
    data: {
      status: "FROZEN",
      previousStatus: store.status,
      frozenReason: "账号停用或商家身份已撤销",
    },
  });
  await recordAudit(
    tx,
    actor,
    "freeze",
    "Store",
    store.id,
    "账号停用或商家身份已撤销",
  );
}

export const updateStoreRating = (
  tx: Prisma.TransactionClient,
  id: string,
  rating: number,
) => tx.store.update({ where: { id }, data: { rating } });
