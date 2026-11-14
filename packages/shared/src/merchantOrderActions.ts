import { computed, onScopeDispose, ref, watch } from "vue";
import type { Order } from "./index";
import type { CheckoutRequest } from "./cart";
import { invalidateRoleData } from "./roleNotices";

export const MAX_MERCHANT_ORDER_BATCH = 100;
export const merchantOrderActions = {
  accept: { label: "接单", status: "PENDING", notice: "确认接下所选订单？" },
  reject: {
    label: "拒单",
    status: "PENDING",
    notice: "所选订单将取消，请填写统一拒单原因。",
  },
  ready: {
    label: "出餐完成",
    status: "PREPARING",
    notice: "确认所选订单均已出餐？外卖进入配送中，自提进入待自提。",
  },
  arrive: {
    label: "到达",
    status: "DELIVERING",
    notice: "确认所选外卖订单均已实际送达？提交后将直接变为已完成。",
  },
  "refund-approve": {
    label: "同意退款",
    status: "REFUNDING",
    notice: "确认同意退款？所选订单将取消，沿用现有退款处理流程。",
  },
  "refund-reject": {
    label: "拒绝退款",
    status: "REFUNDING",
    notice: "确认拒绝所选退款申请？请填写统一拒绝原因。",
  },
} as const;
export type MerchantOrderAction = keyof typeof merchantOrderActions;
export const merchantActionsForStatus = (status: string) =>
  (Object.keys(merchantOrderActions) as MerchantOrderAction[]).filter(
    (action) => merchantOrderActions[action].status === status,
  );
export const merchantActionNeedsReason = (action: MerchantOrderAction) =>
  action === "reject" || action === "refund-reject";
export function canApplyMerchantAction(
  order: Pick<Order, "status" | "type" | "disputed" | "refundRejected">,
  action: MerchantOrderAction,
) {
  if (order.status !== merchantOrderActions[action].status) return false;
  if (action === "arrive") return order.type === "DELIVERY";
  if (action === "refund-approve" || action === "refund-reject")
    return (
      !order.disputed && (action !== "refund-reject" || !order.refundRejected)
    );
  return true;
}
export interface MerchantOrderActionResult {
  id: string;
  orderNo?: string;
  outcome: "applied" | "already_applied" | "failed";
  message?: string;
}
export function useMerchantOrderBatch(
  request: CheckoutRequest,
  context: {
    rows(): Order[];
    scope(): string;
    locked(): boolean;
    refresh(): Promise<unknown>;
  },
) {
  const action = ref<MerchantOrderAction>(),
    selected = ref<string[]>([]),
    pending = ref(false),
    error = ref(""),
    reason = ref("");
  const target = ref<{
    action: MerchantOrderAction;
    orders: { id: string; storeName: string }[];
    batch: boolean;
  }>();
  const results = ref<MerchantOrderActionResult[]>([]);
  const resultAction = ref<MerchantOrderAction>();
  const eligible = computed(() =>
    action.value
      ? context
          .rows()
          .filter((row) => canApplyMerchantAction(row, action.value!))
      : [],
  );
  const locked = computed(() => pending.value || context.locked());
  let active = true;
  onScopeDispose(() => {
    active = false;
  });
  function choose(value?: MerchantOrderAction) {
    if (pending.value || (value && context.locked())) return;
    action.value = value;
    selected.value = [];
    target.value = undefined;
    reason.value = "";
    error.value = "";
  }
  function select(ids: string[]) {
    if (locked.value || !action.value) return;
    const keys = [...new Set(ids)].filter((id) =>
      eligible.value.some((row) => row.id === id),
    );
    if (keys.length > MAX_MERCHANT_ORDER_BATCH) {
      error.value = `每批最多选择 ${MAX_MERCHANT_ORDER_BATCH} 单，请分批处理`;
      return;
    }
    selected.value = keys;
    error.value = "";
  }
  function open(single?: { order: Order; action: MerchantOrderAction }) {
    if (locked.value) return;
    const chosen = single?.action ?? action.value;
    if (!chosen) return;
    const rows = single
      ? [single.order]
      : eligible.value.filter((row) => selected.value.includes(row.id));
    if (
      !rows.length ||
      rows.length > MAX_MERCHANT_ORDER_BATCH ||
      rows.some((row) => !canApplyMerchantAction(row, chosen))
    )
      return;
    target.value = {
      action: chosen,
      orders: rows.map((row) => ({ id: row.id, storeName: row.store.name })),
      batch: !single,
    };
    if (
      single ||
      resultAction.value !== chosen ||
      !results.value.some((row) => row.outcome === "failed")
    )
      reason.value = "";
    error.value = "";
    results.value = [];
  }
  function close() {
    if (!pending.value) {
      target.value = undefined;
      reason.value = "";
      error.value = "";
    }
  }
  watch(context.scope, () => {
    if (!pending.value) choose();
    else selected.value = [];
  });
  watch(
    () => eligible.value.map((row) => row.id),
    (ids) => {
      selected.value = selected.value.filter((id) => ids.includes(id));
    },
  );
  async function confirm() {
    if (!target.value || locked.value) return;
    const snapshot = target.value,
      text = reason.value.trim();
    if (
      merchantActionNeedsReason(snapshot.action) &&
      (!text || text.length > 500)
    ) {
      error.value = "请填写 1–500 字的处理原因";
      return;
    }
    pending.value = true;
    error.value = "";
    try {
      const body = {
        ...(merchantActionNeedsReason(snapshot.action) ? { reason: text } : {}),
      };
      let received: MerchantOrderActionResult[];
      if (snapshot.batch)
        received = (
          await request<{ results: MerchantOrderActionResult[] }>(
            "/merchant/orders/batch-action",
            {
              method: "POST",
              body: {
                action: snapshot.action,
                ids: snapshot.orders.map((row) => row.id),
                ...body,
              },
            },
          )
        ).results;
      else {
        const order = await request<Order>(
          `/merchant/orders/${encodeURIComponent(snapshot.orders[0].id)}/${snapshot.action}`,
          { method: "POST", body },
        );
        received = [
          { id: order.id, orderNo: order.orderNo, outcome: "applied" },
        ];
      }
      if (!active) return;
      results.value = received;
      resultAction.value = snapshot.action;
      const failed = new Set(
        received.filter((row) => row.outcome === "failed").map((row) => row.id),
      );
      selected.value = selected.value.filter((id) => failed.has(id));
      target.value = undefined;
      if (!failed.size) reason.value = "";
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
          if (active) error.value ||= "列表刷新失败，请重新核对订单";
        }
        if (active) {
          invalidateRoleData("MERCHANT");
          pending.value = false;
        }
      }
    }
  }
  return {
    action,
    selected,
    pending,
    locked,
    error,
    reason,
    target,
    results,
    resultAction,
    eligible,
    choose,
    select,
    open,
    close,
    confirm,
    clearSelection: () => {
      if (!pending.value) selected.value = [];
    },
    canSelectAll: computed(
      () =>
        !locked.value &&
        eligible.value.length > 0 &&
        eligible.value.length <= MAX_MERCHANT_ORDER_BATCH,
    ),
    summary: computed(() => ({
      applied: results.value.filter((r) => r.outcome === "applied").length,
      alreadyApplied: results.value.filter(
        (r) => r.outcome === "already_applied",
      ).length,
      failed: results.value.filter((r) => r.outcome === "failed"),
    })),
  };
}
