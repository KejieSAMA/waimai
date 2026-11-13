import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import type { Order } from "./index";
import { ORDER_DETAIL_POLL_MS } from "./rules";

type Request = <T>(
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<T>;
export interface OrderActivity {
  now(): number;
  visible(): boolean;
  listen(callback: () => void): () => void;
  every(callback: () => void, ms: number): () => void;
  later(callback: () => void, ms: number): () => void;
}
type UserOrderAction = "pay" | "cancel" | "complete" | "refund" | "dispute";

export function useUserOrderDetail(
  request: Request,
  id: Readonly<Ref<string>>,
  activity?: OrderActivity,
) {
  const order = ref<Order>(),
    pending = ref(false),
    processing = ref(false),
    error = ref(""),
    reason = ref(""),
    rating = ref("5"),
    content = ref("");
  let version = 0,
    active = true;
  const clock = ref(activity?.now() ?? Date.now());
  const paymentExpired = computed(
    () =>
      !!order.value?.paymentExpiresAt &&
      clock.value >= Date.parse(order.value.paymentExpiresAt),
  );
  const reviewed = computed(() => !!order.value?.review);

  async function load() {
    if (processing.value || pending.value) return;
    const current = ++version,
      target = id.value;
    pending.value = true;
    error.value = "";
    try {
      const result = await request<Order>(`/user/orders/${target}`);
      if (active && current === version) order.value = result;
    } catch (cause) {
      if (active && current === version)
        error.value = cause instanceof Error ? cause.message : "订单加载失败";
    } finally {
      if (active && current === version) pending.value = false;
    }
  }
  watch(
    id,
    () => {
      ++version;
      order.value = undefined;
      pending.value = false;
      processing.value = false;
      reason.value = "";
      rating.value = "5";
      content.value = "";
      void load();
    },
    { immediate: true, flush: "sync" },
  );
  onScopeDispose(() => {
    active = false;
    ++version;
  });

  async function submit(action: UserOrderAction | "review", body: unknown) {
    if (!order.value || pending.value || processing.value) return false;
    if (action === "pay" && paymentExpired.value) {
      await load();
      error.value = "支付时间已到，请核对订单状态";
      return false;
    }
    const current = ++version,
      target = order.value.id;
    processing.value = true;
    error.value = "";
    try {
      if (action === "review") {
        const result = await request<{ id: string }>(
          `/user/orders/${target}/review`,
          { method: "POST", body },
        );
        if (active && current === version && order.value)
          order.value.review = { id: result.id };
      } else {
        const result = await request<Order>(
          `/user/orders/${target}/${action}`,
          { method: "POST", body },
        );
        if (active && current === version) order.value = result;
      }
      return active && current === version;
    } catch (cause) {
      if (
        active &&
        current === version &&
        id.value === target &&
        (cause as { details?: { reason?: string } })?.details?.reason ===
          "PAYMENT_EXPIRED"
      ) {
        processing.value = false;
        await load();
        if (active && id.value === target)
          error.value =
            cause instanceof Error ? cause.message : "订单已超时取消";
        return false;
      }
      if (active && current === version)
        error.value =
          cause instanceof Error ? cause.message : "操作失败，请重试";
      return false;
    } finally {
      if (active && current === version) processing.value = false;
    }
  }
  if (activity) {
    let stopInterval = () => {},
      stopDeadline = () => {};
    function schedule() {
      stopInterval();
      stopDeadline();
      clock.value = activity!.now();
      if (
        !active ||
        !activity!.visible() ||
        !order.value ||
        ["DONE", "CANCELLED"].includes(order.value.status)
      )
        return;
      stopInterval = activity!.every(() => {
        clock.value = activity!.now();
        void load();
      }, ORDER_DETAIL_POLL_MS);
      if (
        order.value.status === "PENDING_PAY" &&
        order.value.paymentExpiresAt
      ) {
        const delay =
          Date.parse(order.value.paymentExpiresAt) - activity!.now();
        if (delay > 0)
          stopDeadline = activity!.later(() => {
            clock.value = activity!.now();
            void load();
          }, delay);
      }
    }
    watch(() => [order.value?.status, order.value?.paymentExpiresAt], schedule);
    const stopListen = activity.listen(() => {
      schedule();
      if (activity.visible()) void load();
    });
    onScopeDispose(() => {
      stopListen();
      stopInterval();
      stopDeadline();
    });
  }
  const act = (action: UserOrderAction) =>
    submit(action, { reason: reason.value.trim() });
  const review = () =>
    submit("review", {
      rating: Number(rating.value),
      content: content.value.trim(),
    });

  return {
    order,
    pending,
    processing,
    error,
    reason,
    rating,
    content,
    reviewed,
    paymentExpired,
    load,
    act,
    review,
  };
}
