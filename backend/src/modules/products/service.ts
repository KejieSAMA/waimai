import type { Prisma, Product } from "@prisma/client";
import { z } from "zod";
import { db } from "../../db";
import { config } from "../../config";
import { assert, pagination, pageResult } from "../../http";
import { productTransition } from "../../domain/productMachine";
import { dishCategoryExists } from "../categories/service";
import { recordAudit } from "../audit/service";
import { productSchema } from "./schema";
export const displayProduct = (p: Product) => ({
  ...p,
  displayStatus: p.status === "ON" && p.stock === 0 ? "SOLDOUT" : p.status,
});
export const findProduct = (
  id: string,
  storeId: string,
  tx: Prisma.TransactionClient = db,
) => tx.product.findFirst({ where: { id, storeId } });
export async function listProducts(
  query: Record<string, unknown>,
  storeId?: string,
) {
  const p = pagination(query);
  const group = z.enum(["on", "off", "review"]).optional().parse(query.group);
  const baseWhere: Prisma.ProductWhereInput = {
    storeId,
    ...(p.keyword ? { name: { contains: p.keyword } } : {}),
    ...(typeof query.categoryId === "string" && query.categoryId
      ? { dishCategoryId: query.categoryId }
      : {}),
    ...(query.stock === "soldout"
      ? { stock: 0 }
      : query.stock === "low"
        ? { stock: { lte: db.product.fields.lowStock } }
        : {}),
  };
  const constraints: Prisma.ProductWhereInput[] = [];
  if (group)
    constraints.push({
      status: {
        in:
          group === "on"
            ? ["ON"]
            : group === "off"
              ? ["OFF"]
              : ["REVIEW", "REJECTED"],
      },
    });
  if (p.status)
    constraints.push(
      p.status === "SOLDOUT"
        ? { status: "ON", stock: 0 }
        : { status: p.status },
    );
  const where: Prisma.ProductWhereInput = { ...baseWhere, AND: constraints };
  const [list, total] = await Promise.all([
    db.product.findMany({
      where,
      skip: p.skip,
      take: p.take,
      orderBy: { createdAt: "asc" },
    }),
    db.product.count({ where }),
  ]);
  const groups = await db.product.groupBy({
    by: ["status"],
    where: baseWhere,
    _count: { id: true },
  });
  const count = (states: string[]) =>
    groups
      .filter((g) => states.includes(g.status))
      .reduce((sum, g) => sum + g._count.id, 0);
  return {
    ...pageResult(list.map(displayProduct), total, p),
    counts: {
      ON: count(["ON"]),
      OFF: count(["OFF"]),
      REVIEW: count(["REVIEW", "REJECTED"]),
    },
  };
}
export async function saveProduct(
  storeId: string,
  id: string | undefined,
  body: unknown,
) {
  const { listed, ...data } = productSchema.parse(body);
  return db.$transaction(async (tx) => {
    assert(
      await dishCategoryExists(data.dishCategoryId, storeId, tx),
      400,
      "店内分类不存在",
    );
    const old = id ? await findProduct(id, storeId, tx) : null;
    assert(!id || old, 404, "商品不存在");
    const status =
      old?.forcedOff ||
      old?.status === "REJECTED" ||
      old?.status === "REVIEW" ||
      config.productReview
        ? "REVIEW"
        : listed
          ? "ON"
          : "OFF";
    const update = { ...data, status, rejectReason: null };
    const result = old
      ? await tx.product.update({ where: { id: old.id }, data: update })
      : await tx.product.create({ data: { ...update, storeId } });
    return displayProduct(result);
  });
}
export async function listing(storeId: string, id: string, listed: boolean) {
  return db.$transaction(async (tx) => {
    const old = await findProduct(id, storeId, tx);
    assert(old, 404, "商品不存在");
    const target = listed ? "ON" : "OFF";
    if (old.status === target) {
      assert(!old.forcedOff || !listed, 409, "商品需重新审核");
      return displayProduct(old);
    }
    return displayProduct(
      await tx.product.update({
        where: { id },
        data: {
          status: productTransition(
            old.status,
            listed ? "on" : "off",
            old.forcedOff,
          ),
        },
      }),
    );
  });
}
export async function batchProducts(
  storeId: string,
  ids: string[],
  action: string,
  stock?: number,
) {
  return db.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: ids }, storeId },
    });
    assert(products.length === new Set(ids).size, 404, "商品不存在");
    for (const p of products) {
      if (action === "stock") {
        await tx.product.update({ where: { id: p.id }, data: { stock } });
        continue;
      }
      const target = action === "on" ? "ON" : "OFF";
      if (p.status !== target)
        await tx.product.update({
          where: { id: p.id },
          data: { status: productTransition(p.status, action, p.forcedOff) },
        });
      else assert(!(action === "on" && p.forcedOff), 409, "商品需重新审核");
    }
    return { updated: products.length };
  });
}
export async function moderateProduct(
  id: string,
  action: string,
  actor: { id: string; role: string },
  reason?: string,
) {
  return db.$transaction(async (tx) => {
    const old = await tx.product.findUnique({ where: { id } });
    assert(old, 404, "商品不存在");
    const status = productTransition(old.status, action, old.forcedOff);
    await recordAudit(tx, actor, action, "Product", id, reason);
    return displayProduct(
      await tx.product.update({
        where: { id },
        data: {
          status,
          forcedOff: action === "force-off",
          rejectReason: action === "approve" ? null : reason,
        },
      }),
    );
  });
}
export const productCount = (storeId?: string) =>
  db.product.count({ where: { storeId } });
export async function productSummary(storeId?: string) {
  const [pendingProducts, lowStock] = await Promise.all([
    db.product.count({ where: { storeId, status: "REVIEW" } }),
    db.product.count({
      where: {
        storeId,
        status: "ON",
        stock: { lte: db.product.fields.lowStock },
      },
    }),
  ]);
  return { pendingProducts, lowStock };
}

export async function reserveProduct(
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  qty: number,
) {
  const result = await tx.product.updateMany({
    where: {
      id: productId,
      storeId,
      status: "ON",
      forcedOff: false,
      stock: { gte: qty },
    },
    data: { stock: { decrement: qty } },
  });
  assert(result.count === 1, 409, "库存发生变化，请重新下单");
}
export const restoreProduct = (
  tx: Prisma.TransactionClient,
  productId: string,
  qty: number,
) =>
  tx.product.update({
    where: { id: productId },
    data: { stock: { increment: qty } },
  });
export const recordProductSale = (
  tx: Prisma.TransactionClient,
  productId: string,
  qty: number,
) =>
  tx.product.update({
    where: { id: productId },
    data: { monthlySales: { increment: qty } },
  });
