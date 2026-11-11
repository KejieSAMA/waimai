import type { CartLine, CheckoutCart } from "./cart";
import { onMounted, onScopeDispose, ref, watch } from "vue";
import type { Action, Order, Page, Quote, Store } from "./index";

export const userOrderTabs = [
  { key: "all", label: "全部" },
  { key: "ongoing", label: "进行中" },
  { key: "unreviewed", label: "待评价" },
  { key: "refund", label: "退款" },
];

export function orderTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === name)?.value;
  const days =
    Math.floor((now.getTime() + 28800000) / 86400000) -
    Math.floor((date.getTime() + 28800000) / 86400000);
  return `${days === 0 ? "今天" : days === 1 ? "昨天" : `${part("month")}-${part("day")}`} ${part("hour")}:${part("minute")}`;
}

export function userOrderActions(
  order: Order,
  details: () => void,
  review: () => void,
  reorder: () => void,
): Action[] {
  if (order.status === "DONE")
    return [
      ...(!order.review ? [{ label: "评价", onClick: review }] : []),
      { label: "再来一单", variant: "secondary", onClick: reorder },
    ];
  if (order.status === "CANCELLED")
    return [{ label: "再来一单", variant: "secondary", onClick: reorder }];
  if (order.status === "REFUNDING")
    return [{ label: "查看进度", onClick: details }];
  return [
    {
      label: order.status === "PENDING_PAY" ? "去支付" : "查看订单",
      variant: "secondary",
      onClick: details,
    },
  ];
}

type Request = <T>(
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<T>;
interface Cart {
  forStore(id: string): CheckoutCart;
  replaceStore(
    id: string,
    lines: CartLine[],
    type: "DELIVERY" | "PICKUP",
  ): void;
  rememberStore(store: Store): void;
}

export function useUserOrders(
  request: Request,
  cart: Cart,
  navigate: (path: string) => unknown,
  append = false,
) {
  const tab = ref("all"),
    list = ref<Order[]>([]),
    page = ref(1),
    total = ref(0),
    pending = ref(false),
    error = ref("");
  const replacement = ref<Order>();
  const reordering = ref(false);
  let version = 0,
    active = true;
  onScopeDispose(() => {
    active = false;
    ++version;
  });
  async function load() {
    const current = ++version;
    pending.value = true;
    error.value = "";
    try {
      const result = await request<Page<Order>>(
        `/user/orders?tab=${tab.value}&page=${page.value}`,
      );
      if (current !== version) return;
      list.value =
        append && page.value > 1
          ? [
              ...list.value.filter(
                (o) => !result.list.some((next) => next.id === o.id),
              ),
              ...result.list,
            ]
          : result.list;
      total.value = result.total;
    } catch (cause) {
      if (current === version)
        error.value = cause instanceof Error ? cause.message : "订单加载失败";
    } finally {
      if (current === version) pending.value = false;
    }
  }
  watch(tab, () => {
    list.value = [];
    total.value = 0;
    if (page.value !== 1) page.value = 1;
    else void load();
  });
  watch(page, () => void load());
  onMounted(() => void load());
  async function reorder(order: Order) {
    if (reordering.value) return;
    reordering.value = true;
    error.value = "";
    try {
      const store = await request<Store>(`/public/stores/${order.storeId}`);
      const lines = order.items.map((item) => ({
        product: store.products?.find((p) => p.id === item.productId),
        qty: item.qty,
      }));
      if (lines.some((line) => !line.product))
        throw new Error("部分商品已不可购买，请进入店铺重新选购");
      const quote = await request<Quote>("/user/orders/preview", {
        method: "POST",
        body: {
          storeId: order.storeId,
          type: order.type,
          items: order.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
          })),
        },
      });
      if (quote.checkoutAllowed === false)
        throw new Error("未达到起送金额，请进入店铺重新选购");
      if (!active) return;
      cart.replaceStore(
        order.storeId,
        lines.map((line) => ({ product: line.product!, qty: line.qty })),
        order.type,
      );
      cart.rememberStore(store);
      replacement.value = undefined;
      await navigate(`/store/${order.storeId}`);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "无法再次购买";
    } finally {
      reordering.value = false;
    }
  }
  function actions(order: Order) {
    return userOrderActions(
      order,
      () => navigate(`/orders/${order.id}`),
      () => navigate(`/orders/${order.id}#review`),
      () => {
        if (cart.forStore(order.storeId).count) replacement.value = order;
        else void reorder(order);
      },
    );
  }
  return {
    tab,
    list,
    page,
    total,
    pending,
    error,
    replacement,
    reordering,
    load,
    reorder,
    actions,
  };
}
