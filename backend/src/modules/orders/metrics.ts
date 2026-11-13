import type { Prisma } from "@prisma/client";
import { db } from "../../db";
import { shanghaiDay } from "../../http";
export function salesWindow(now = new Date()) {
  return {
    gte: new Date(shanghaiDay(now).getTime() - 29 * 86400000),
    lte: now,
  };
}
export async function storeMetrics(
  ids: string[],
  tx: Prisma.TransactionClient = db,
) {
  if (!ids.length)
    return new Map<
      string,
      { monthlySales: number; rating: number | null; reviewCount: number }
    >();
  const [sales, reviews] = await Promise.all([
    tx.order.groupBy({
      by: ["storeId"],
      where: { storeId: { in: ids }, status: "DONE", doneAt: salesWindow() },
      _count: { id: true },
    }),
    tx.review.groupBy({
      by: ["storeId"],
      where: { storeId: { in: ids } },
      _count: { id: true },
      _avg: { rating: true },
    }),
  ]);
  return new Map(
    ids.map((id) => {
      const sale = sales.find((s) => s.storeId === id),
        review = reviews.find((r) => r.storeId === id);
      return [
        id,
        {
          monthlySales: sale?._count.id ?? 0,
          reviewCount: review?._count.id ?? 0,
          rating:
            review?._avg.rating == null
              ? null
              : Math.round(review._avg.rating * 10) / 10,
        },
      ];
    }),
  );
}
export async function withStoreMetrics<T extends { id: string }>(
  rows: T[],
  tx: Prisma.TransactionClient = db,
) {
  const metrics = await storeMetrics(
    rows.map((r) => r.id),
    tx,
  );
  return rows.map((row) => ({ ...row, ...metrics.get(row.id)! }));
}
export async function withProductMetrics<T extends { id: string }>(
  rows: T[],
  tx: Prisma.TransactionClient = db,
) {
  const sales = rows.length
    ? await tx.orderItem.groupBy({
        by: ["productId"],
        where: {
          productId: { in: rows.map((r) => r.id) },
          order: { status: "DONE", doneAt: salesWindow() },
        },
        _sum: { qty: true },
      })
    : [];
  const amounts = new Map(sales.map((s) => [s.productId, s._sum.qty ?? 0]));
  return rows.map((row) => ({
    ...row,
    monthlySales: amounts.get(row.id) ?? 0,
  }));
}
