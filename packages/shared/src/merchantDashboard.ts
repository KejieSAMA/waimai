import { onScopeDispose, ref, watch, type Ref } from "vue";
import type { Stats, Store, Order, Page } from "./index";
import type { CheckoutRequest } from "./cart";
import type { PageActivity } from "./traffic";
import { MERCHANT_STATS_POLL_MS } from "./rules";
export function useMerchantDashboard(
  request: CheckoutRequest,
  identity: Readonly<Ref<string>>,
  activity: PageActivity,
  options: { loadStore(): Promise<Store | null>; missing(): Promise<unknown> },
) {
  const store = ref<Store>(),
    stats = ref<Stats>(),
    trend = ref<{ label: string; value: number }[]>([]),
    orders = ref<Order[]>([]);
  const loading = ref(false),
    error = ref("");
  let active = true,
    version = 0,
    flight: Promise<void> | undefined,
    fullQueued = false;
  function refresh(full = true): Promise<void> {
    if (!active || !identity.value) return Promise.resolve();
    if (flight) {
      fullQueued ||= full;
      return flight;
    }
    const current = version;
    loading.value = true;
    error.value = "";
    const valid = () => active && current === version;
    flight = (async () => {
      try {
        if (full || !store.value) {
          const s = await options.loadStore();
          if (!valid()) return;
          if (!s) {
            await options.missing();
            return;
          }
          store.value = s;
        }
        if (!valid()) return;
        const a = request<Stats>("/merchant/stats/today");
        if (full) {
          const [s, t, o] = await Promise.all([
            a,
            request<{ label: string; value: number }[]>(
              "/merchant/stats/trend?days=7",
            ),
            request<Page<Order>>("/merchant/orders?status=PENDING"),
          ]);
          if (valid()) {
            stats.value = s;
            trend.value = t;
            orders.value = o.list;
          }
        } else {
          const s = await a;
          if (valid()) stats.value = s;
        }
      } catch (cause) {
        if (valid())
          error.value =
            cause instanceof Error ? cause.message : "经营数据读取失败";
      } finally {
        if (valid()) loading.value = false;
      }
    })().finally(() => {
      if (current !== version) return;
      flight = undefined;
      if (active && fullQueued) {
        fullQueued = false;
        void refresh(true);
      }
    });
    return flight;
  }
  const stop = watch(
    identity,
    () => {
      version++;
      flight = undefined;
      fullQueued = false;
      store.value = undefined;
      stats.value = undefined;
      trend.value = [];
      orders.value = [];
      loading.value = false;
      error.value = "";
      void refresh(true);
    },
    { immediate: true, flush: "sync" },
  );
  const visibleRefresh = () => {
    if (activity.visible()) void refresh(!stats.value);
  };
  const stopListen = activity.listen(visibleRefresh);
  const stopTimer = activity.every(visibleRefresh, MERCHANT_STATS_POLL_MS);
  onScopeDispose(() => {
    active = false;
    version++;
    stop();
    stopListen();
    stopTimer();
  });
  return { store, stats, trend, orders, loading, error, refresh };
}
