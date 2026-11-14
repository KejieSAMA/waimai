import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import type { Order, OrderActivity } from "./index";
export function remainingPaymentSeconds(
  expiresAt: string | undefined,
  now: number,
) {
  const deadline = Date.parse(expiresAt ?? "");
  return Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : undefined;
}
export function usePaymentClock(
  order: Readonly<Ref<Order | undefined>>,
  activity: OrderActivity,
  onExpired: () => unknown,
) {
  const now = ref(activity.now());
  let stop = () => {},
    expiredKey = "";
  const seconds = computed(() =>
    remainingPaymentSeconds(order.value?.paymentExpiresAt, now.value),
  );
  const expired = computed(
    () => order.value?.status === "PENDING_PAY" && seconds.value === 0,
  );
  const text = computed(() =>
    seconds.value === undefined
      ? ""
      : `${String(Math.floor(seconds.value / 60)).padStart(2, "0")}:${String(seconds.value % 60).padStart(2, "0")}`,
  );
  function tick() {
    now.value = activity.now();
    const key = order.value?.id + ":" + order.value?.paymentExpiresAt;
    if (expired.value) stop();
    if (expired.value && expiredKey !== key) {
      expiredKey = key;
      void onExpired();
    }
  }
  function schedule() {
    stop();
    now.value = activity.now();
    if (!activity.visible()) return;
    tick();
    if (
      activity.visible() &&
      order.value?.status === "PENDING_PAY" &&
      seconds.value !== undefined &&
      seconds.value > 0
    )
      stop = activity.every(tick, 1000);
  }
  watch(
    () => [order.value?.id, order.value?.status, order.value?.paymentExpiresAt],
    schedule,
    { immediate: true },
  );
  const unlisten = activity.listen(schedule);
  onScopeDispose(() => {
    stop();
    unlisten();
  });
  return { text, expired };
}
