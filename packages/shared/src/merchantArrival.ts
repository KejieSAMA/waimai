import { computed, onScopeDispose, ref, watch } from "vue";
import type { Order } from "./index";
import type { CheckoutRequest } from "./cart";
import { invalidateRoleData } from "./roleNotices";
export const MAX_ARRIVAL_ORDERS = 100;
export interface ArrivalItemResult {
  id: string;
  orderNo?: string;
  outcome: "completed" | "already_completed" | "failed";
  message?: string;
}
export interface ArrivalBatchResult {
  results: ArrivalItemResult[];
}
export const canArrive = (order: Pick<Order, "status" | "type">) =>
  order.type === "DELIVERY" && order.status === "DELIVERING";
export function useMerchantArrival(
  request: CheckoutRequest,
  context: {
    rows(): Order[];
    scope(): string;
    locked(): boolean;
    refresh(): Promise<unknown>;
  },
) {
  const selected = ref<string[]>([]),
    pending = ref(false),
    error = ref("");
  const target = ref<{
    orders: { id: string; storeName: string }[];
    batch: boolean;
  }>();
  const results = ref<ArrivalItemResult[]>([]);
  const eligible = computed(() => context.rows().filter(canArrive));
  const locked = computed(() => pending.value || context.locked());
  let active = true;
  onScopeDispose(() => {
    active = false;
  });
  function select(ids: string[]) {
    if (locked.value) return;
    const keys = [...new Set(ids)].filter((id) =>
      eligible.value.some((row) => row.id === id),
    );
    if (keys.length > MAX_ARRIVAL_ORDERS) {
      error.value = `每批最多选择 ${MAX_ARRIVAL_ORDERS} 单，请分批处理`;
      return;
    }
    selected.value = keys;
    error.value = "";
  }
  function open(orders?: Order[]) {
    if (locked.value) return;
    const rows =
      orders ?? eligible.value.filter((row) => selected.value.includes(row.id));
    if (
      !rows.length ||
      rows.length > MAX_ARRIVAL_ORDERS ||
      rows.some((row) => !canArrive(row))
    )
      return;
    target.value = {
      orders: rows.map((row) => ({ id: row.id, storeName: row.store.name })),
      batch: !orders,
    };
    error.value = "";
    results.value = [];
  }
  function close() {
    if (!pending.value) {
      target.value = undefined;
      error.value = "";
    }
  }
  watch(context.scope, () => {
    selected.value = [];
    if (!pending.value) target.value = undefined;
  });
  watch(
    () => eligible.value.map((row) => row.id),
    (ids) => {
      selected.value = selected.value.filter((id) => ids.includes(id));
    },
  );
  async function confirm() {
    if (!target.value || locked.value) return;
    const snapshot = target.value;
    pending.value = true;
    error.value = "";
    let refreshError = false;
    try {
      let received: ArrivalItemResult[];
      if (snapshot.batch)
        received = (
          await request<ArrivalBatchResult>("/merchant/orders/batch-arrive", {
            method: "POST",
            body: { ids: snapshot.orders.map((row) => row.id) },
          })
        ).results;
      else {
        const order = await request<Order>(
          `/merchant/orders/${encodeURIComponent(snapshot.orders[0].id)}/arrive`,
          { method: "POST", body: {} },
        );
        received = [
          { id: order.id, orderNo: order.orderNo, outcome: "completed" },
        ];
      }
      if (!active) return;
      results.value = received;
      const failures = new Set(
        received.filter((row) => row.outcome === "failed").map((row) => row.id),
      );
      selected.value = selected.value.filter((id) => failures.has(id));
      target.value = undefined;
    } catch (cause) {
      if (active)
        error.value =
          (cause instanceof Error ? cause.message : "处理失败") +
          "；请刷新订单核对结果后重试";
    } finally {
      if (active) {
        try {
          await context.refresh();
        } catch {
          refreshError = true;
        }
        if (active) {
          if (refreshError) error.value ||= "列表刷新失败，请重新核对订单";
          invalidateRoleData("MERCHANT");
          pending.value = false;
        }
      }
    }
  }
  return {
    selected,
    pending,
    locked,
    error,
    target,
    results,
    eligible,
    select,
    clearSelection: () => {
      if (!pending.value) selected.value = [];
    },
    open,
    close,
    confirm,
    canSelectAll: computed(
      () =>
        !locked.value &&
        eligible.value.length > 0 &&
        eligible.value.length <= MAX_ARRIVAL_ORDERS,
    ),
    summary: computed(() => ({
      completed: results.value.filter((r) => r.outcome === "completed").length,
      alreadyCompleted: results.value.filter(
        (r) => r.outcome === "already_completed",
      ).length,
      failed: results.value.filter((r) => r.outcome === "failed"),
    })),
  };
}
