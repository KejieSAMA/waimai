import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import { orderStatuses, type Order, type Page } from "./index";
import type { CheckoutRequest } from "./cart";
export interface MerchantOrderQuery {
  status: string;
  keyword: string;
  page: number;
}
export function merchantOrderQuery(
  value: Record<string, unknown>,
): MerchantOrderQuery {
  const status =
    typeof value.status === "string" &&
    Object.hasOwn(orderStatuses, value.status)
      ? value.status
      : "";
  const page = Number(value.page);
  return {
    status,
    keyword:
      typeof value.keyword === "string" ? value.keyword.slice(0, 100) : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
export const merchantOrderTabs = [
  { key: "", label: "全部" },
  { key: "PENDING_PAY", label: "待支付" },
  { key: "PENDING", label: "新订单" },
  { key: "PREPARING", label: "备餐中" },
  { key: "DELIVERING", label: "配送中" },
  { key: "PICKUP", label: "待自提" },
  { key: "DONE", label: "已完成" },
  { key: "CANCELLED", label: "已取消" },
  { key: "REFUNDING", label: "退款" },
];
export function merchantOrderContact(order: Order) {
  try {
    const contact = JSON.parse(order.addressSnapshot);
    return (
      (order.type === "PICKUP" ? "到店自提" : "外卖配送") +
      (contact.phone ? " · " + contact.phone : "")
    );
  } catch {
    return order.type === "PICKUP" ? "到店自提" : "外卖配送";
  }
}
export function useMerchantOrders(
  request: CheckoutRequest,
  query: Ref<MerchantOrderQuery>,
  write: (query: MerchantOrderQuery, replace?: boolean) => Promise<unknown>,
) {
  const list = ref<Order[]>([]),
    total = ref(0),
    counts = ref<Record<string, number>>({}),
    loading = ref(false),
    error = ref(""),
    keyword = ref(query.value.keyword);
  const detailId = ref(""),
    detail = ref<Order>(),
    detailLoading = ref(false),
    detailError = ref(""),
    mutating = ref(false),
    actionError = ref(""),
    reason = ref(""),
    reasonTarget = ref<{ id: string; action: string }>();
  let active = true,
    version = 0,
    detailVersion = 0;
  async function load() {
    const current = ++version,
      value = { ...query.value };
    loading.value = true;
    error.value = "";
    try {
      const result = await request<Page<Order>>(
        `/merchant/orders?status=${encodeURIComponent(value.status)}&keyword=${encodeURIComponent(value.keyword)}&page=${value.page}`,
      );
      if (!active || current !== version) return;
      const last = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (value.page > last) {
        await write({ ...value, page: last }, true);
        return;
      }
      list.value = result.list;
      total.value = result.total;
      counts.value = result.counts ?? {};
    } catch (cause) {
      if (active && current === version)
        error.value = cause instanceof Error ? cause.message : "订单加载失败";
    } finally {
      if (active && current === version) loading.value = false;
    }
  }
  async function loadDetail() {
    const id = detailId.value,
      current = ++detailVersion;
    if (!id) return;
    detailLoading.value = true;
    detailError.value = "";
    try {
      const result = await request<Order>(
        `/merchant/orders/${encodeURIComponent(id)}`,
      );
      if (active && current === detailVersion) detail.value = result;
    } catch (cause) {
      if (active && current === detailVersion)
        detailError.value =
          cause instanceof Error ? cause.message : "订单详情加载失败";
    } finally {
      if (active && current === detailVersion) detailLoading.value = false;
    }
  }
  function openDetail(id: string) {
    if (mutating.value) return;
    detailId.value = id;
    detail.value = undefined;
    actionError.value = "";
    void loadDetail();
  }
  function closeDetail() {
    if (mutating.value) return;
    ++detailVersion;
    detailId.value = "";
    detail.value = undefined;
    detailLoading.value = false;
    detailError.value = "";
  }
  async function refresh() {
    if (!mutating.value)
      await Promise.all([
        load(),
        detailId.value ? loadDetail() : Promise.resolve(),
      ]);
  }
  async function send(id: string, action: string) {
    if (mutating.value) return false;
    mutating.value = true;
    actionError.value = "";
    try {
      const result = await request<Order>(
        `/merchant/orders/${encodeURIComponent(id)}/${action}`,
        { method: "POST", body: { reason: reason.value } },
      );
      if (!active) return false;
      if (detailId.value === id) detail.value = result;
      reasonTarget.value = undefined;
      reason.value = "";
      await load();
      if (detailId.value === id) await loadDetail();
      return true;
    } catch (cause) {
      if (active)
        actionError.value =
          cause instanceof Error ? cause.message : "处理失败，请重试";
      return false;
    } finally {
      if (active) mutating.value = false;
    }
  }
  function act(id: string, action: string) {
    if (mutating.value) return;
    actionError.value = "";
    if (["reject", "refund-reject"].includes(action)) {
      reasonTarget.value = { id, action };
      reason.value = "";
    } else void send(id, action);
  }
  const tabs = computed(() =>
    merchantOrderTabs.map((tab) => ({
      ...tab,
      count: counts.value[tab.key || "all"] ?? 0,
    })),
  );
  watch(
    query,
    () => {
      keyword.value = query.value.keyword;
      void load();
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    active = false;
    ++version;
    ++detailVersion;
  });
  function apply(value: MerchantOrderQuery) {
    return JSON.stringify(value) === JSON.stringify(query.value)
      ? load()
      : write(value);
  }
  return {
    list,
    total,
    counts,
    loading,
    error,
    keyword,
    detailId,
    detail,
    detailLoading,
    detailError,
    mutating,
    actionError,
    reason,
    reasonTarget,
    tabs,
    load,
    loadDetail,
    refresh,
    openDetail,
    closeDetail,
    act,
    send,
    changeStatus: (status: string) =>
      apply({ ...query.value, status, page: 1 }),
    search: () =>
      apply({ ...query.value, keyword: keyword.value.trim(), page: 1 }),
    changePage: (page: number) => apply({ ...query.value, page }),
  };
}
