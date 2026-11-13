import { nextTick, onScopeDispose, watch, type Ref } from "vue";
import type { CheckoutRequest } from "./cart";
import type { OrderActivity } from "./userOrderDetail";
import type { Stats } from "./index";
import { MERCHANT_STATS_POLL_MS } from "./rules";
export type PageActivity = Pick<
  OrderActivity,
  "now" | "visible" | "listen" | "every"
>;
export function shanghaiDateKey(now: number) {
  return new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
}
/** The server is authoritative. Memory only suppresses redundant page events. */
export function useStoreVisits(
  request: CheckoutRequest,
  storeId: Readonly<Ref<string>>,
  eligible: Readonly<Ref<boolean>>,
  activity: PageActivity,
) {
  let active = true;
  const registered = new Set<string>(),
    pending = new Set<string>();
  async function record() {
    await nextTick();
    if (!active || !activity.visible() || !eligible.value || !storeId.value)
      return;
    const id = storeId.value,
      key = id + ":" + shanghaiDateKey(activity.now());
    if (registered.has(key) || pending.has(key)) return;
    pending.add(key);
    try {
      const path = `/public/stores/${encodeURIComponent(id)}/visits`;
      let result = await request<{
        registered: boolean;
        cookieRequired: boolean;
      }>(path, { method: "POST", body: {} });
      if (
        active &&
        storeId.value === id &&
        eligible.value &&
        activity.visible() &&
        result.cookieRequired
      )
        result = await request(path, { method: "POST", body: {} });
      if (active && result.registered) registered.add(key);
    } catch {
      /* Best effort: never fail browsing or refresh authentication for telemetry. */
    } finally {
      pending.delete(key);
    }
  }
  const stopWatch = watch([storeId, eligible], () => void record(), {
    immediate: true,
    flush: "post",
  });
  const stopListen = activity.listen(() => void record());
  const stopTimer = activity.every(() => void record(), MERCHANT_STATS_POLL_MS);
  onScopeDispose(() => {
    active = false;
    stopWatch();
    stopListen();
    stopTimer();
  });
}
export function trafficDescription(stats?: Stats) {
  const explanation =
    "同店同日按浏览器去重，含游客；支付转化率按当日访客支付成功计算，退款不撤销。当前为模拟支付。";
  const traffic = stats?.traffic;
  if (!traffic?.partialDay) return explanation;
  const start = new Date(traffic.collectionStartedAt);
  const clock = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  return `今日自 ${clock} 开始采集。${explanation}`;
}
