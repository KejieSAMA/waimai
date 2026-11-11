import { z } from "zod";
import { orderStats } from "../orders/service";
import { storeCounts, rankings } from "../stores/service";
import { productCount } from "../products/service";
import { shanghaiDay } from "../../http";
export async function overview(storeId?: string) {
  const [orders, stores, products] = await Promise.all([
    orderStats(storeId),
    storeCounts(),
    productCount(storeId),
  ]);
  return {
    ...orders,
    stores: stores.stores,
    pending: storeId ? orders.pending : stores.pending,
    products,
  };
}
export async function trend(value: unknown, storeId?: string) {
  const days = z.coerce.number().int().min(1).max(90).default(7).parse(value);
  const today = shanghaiDay();
  return Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const date = new Date(today.getTime() - (days - i - 1) * 86400000);
      const next = new Date(date.getTime() + 86400000);
      const stats = await orderStats(storeId, date, next);
      return {
        label: new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai",
          month: "2-digit",
          day: "2-digit",
        }).format(date),
        value: stats.revenueCents / 100,
      };
    }),
  );
}
export const ranking = rankings;
export async function todos(storeId?: string) {
  const data = await overview(storeId);
  return storeId
    ? [{ label: "新订单待处理", count: data.pending, path: "/merchant/orders" }]
    : [{ label: "商家待审核", count: data.pending, path: "/admin/audit" }];
}
