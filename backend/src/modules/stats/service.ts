import { z } from "zod";
import { orderStats, dailyStoreOrders } from "../orders/service";
import { storeCounts, rankings, expiringLicenses } from "../stores/service";
import { productCount, productSummary } from "../products/service";
import { shanghaiDay } from "../../http";
export async function overview(storeId?: string) {
  const [orders, stores, products, productDetails, licenses] =
    await Promise.all([
      orderStats(storeId),
      storeCounts(storeId),
      productCount(storeId),
      productSummary(storeId),
      expiringLicenses(storeId),
    ]);
  return {
    ...orders,
    stores: stores.stores,
    pending: storeId ? orders.pending : stores.pending,
    products,
    ...productDetails,
    expiringLicenses: licenses,
    newStores: stores.newStores,
    visitors: null,
    conversionRate: null,
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
export async function ranking() {
  const daily = await dailyStoreOrders();
  const stores = await rankings(daily.map((row) => row.storeId));
  return stores
    .map((store) => {
      const row = daily.find((item) => item.storeId === store.id);
      return {
        ...store,
        todayOrders: row?._count.id ?? 0,
        todayRevenueCents: row?._sum.payCents ?? 0,
      };
    })
    .sort((a, b) => b.todayOrders - a.todayOrders)
    .slice(0, 10);
}
export async function todos(storeId?: string) {
  const data = await overview(storeId);
  return storeId
    ? [
        { label: "新订单", count: data.pending, path: "/merchant/orders" },
        {
          label: "退款申请",
          count: data.refundPending,
          path: "/merchant/orders?status=REFUNDING",
        },
        {
          label: "库存预警",
          count: data.lowStock,
          path: "/merchant/products?stock=low",
        },
        { label: "差评待回复", count: data.badReviews, path: "/merchant/me" },
      ]
    : [
        { label: "商家入驻待审核", count: data.pending, path: "/admin/audit" },
        {
          label: "商品待审核",
          count: data.pendingProducts,
          path: "/admin/products?status=REVIEW",
        },
        {
          label: "退款纠纷",
          count: data.refundPending,
          path: "/admin/disputes",
        },
        {
          label: "证照 30 天内到期",
          count: data.expiringLicenses,
          path: "/admin/merchants",
        },
      ];
}
