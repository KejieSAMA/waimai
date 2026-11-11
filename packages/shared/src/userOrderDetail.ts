import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import type { Order } from "./index";

type Request = <T>(
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<T>;
type UserOrderAction = "pay" | "cancel" | "complete" | "refund" | "dispute";

export function useUserOrderDetail(
  request: Request,
  id: Readonly<Ref<string>>,
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
  const reviewed = computed(() => !!order.value?.review);

  async function load() {
    if (processing.value) return;
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
      order.value = undefined;
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
      if (active && current === version)
        error.value =
          cause instanceof Error ? cause.message : "操作失败，请重试";
      return false;
    } finally {
      if (active && current === version) processing.value = false;
    }
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
    load,
    act,
    review,
  };
}
