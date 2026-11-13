import { describe, expect, it, vi } from "vitest";
import { effectScope, ref, nextTick } from "vue";
import {
  useStoreVisits,
  shanghaiDateKey,
  trafficDescription,
  type PageActivity,
} from "./traffic";
import { useMerchantDashboard } from "./merchantDashboard";
import type { CheckoutRequest } from "./cart";
import type { Stats, Store } from "./index";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  NEW_STORE_DEFAULTS,
  ORDER_DETAIL_POLL_MS,
  MERCHANT_STATS_POLL_MS,
} from "./rules";
import { storeDraft } from "./storeEditor";
const flush = async () => {
  for (let i = 0; i < 15; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function activity() {
  let now = Date.parse("2026-11-13T03:00:00Z"),
    visible = true;
  const events = new Set<() => void>(),
    timers = new Set<() => void>();
  const every = vi.fn((callback: () => void, _ms: number) => {
    timers.add(callback);
    return () => {
      timers.delete(callback);
    };
  });
  const api: PageActivity = {
    now: () => now,
    visible: () => visible,
    listen: (callback) => {
      events.add(callback);
      return () => {
        events.delete(callback);
      };
    },
    every,
  };
  return {
    api,
    events,
    timers,
    every,
    day: () => {
      now += 86_400_000;
    },
    show: (value: boolean) => {
      visible = value;
      events.forEach((fn) => fn());
    },
    focus: () => events.forEach((fn) => fn()),
    tick: () => timers.forEach((fn) => fn()),
  };
}
describe("店铺访问控制", () => {
  it("成功可见后握手一次、确认一次，同日数量/分类变化不重报，次日补登记并清理监听", async () => {
    const a = activity(),
      id = ref(""),
      eligible = ref(true),
      scope = effectScope();
    const request = vi
      .fn<CheckoutRequest>()
      .mockResolvedValueOnce({ registered: false, cookieRequired: true })
      .mockResolvedValue({ registered: true, cookieRequired: false });
    scope.run(() =>
      useStoreVisits(request as CheckoutRequest, id, eligible, a.api),
    );
    await flush();
    expect(request).not.toHaveBeenCalled();
    id.value = "shop";
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
    a.focus();
    a.tick();
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
    a.day();
    a.tick();
    await flush();
    expect(request).toHaveBeenCalledTimes(3);
    id.value = "another";
    await flush();
    expect(request).toHaveBeenCalledTimes(4);
    scope.stop();
    expect(a.events.size + a.timers.size).toBe(0);
    a.focus();
    a.tick();
    id.value = "after-stop";
    await flush();
    expect(request).toHaveBeenCalledTimes(4);
  });
  it("隐藏/后台身份不采集，恢复后触发；阻止 Cookie 只尝试两次且失败不传播", async () => {
    const a = activity(),
      id = ref("shop"),
      eligible = ref(false),
      scope = effectScope();
    a.show(false);
    const request = vi
      .fn<CheckoutRequest>()
      .mockResolvedValue({ registered: false, cookieRequired: true });
    scope.run(() =>
      useStoreVisits(request as CheckoutRequest, id, eligible, a.api),
    );
    await flush();
    eligible.value = true;
    await flush();
    expect(request).not.toHaveBeenCalled();
    a.show(true);
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
    request.mockRejectedValue(new Error("offline"));
    a.focus();
    await flush();
    expect(request).toHaveBeenCalledTimes(3);
    scope.stop();
  });
  it("登记中切店/切身份/卸载不继续旧页 Cookie 确认；相同在途请求合并", async () => {
    const a = activity(),
      id = ref("a"),
      eligible = ref(true),
      scope = effectScope(),
      old = deferred<unknown>();
    const request = vi
      .fn<CheckoutRequest>()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue({ registered: true, cookieRequired: false });
    scope.run(() =>
      useStoreVisits(request as CheckoutRequest, id, eligible, a.api),
    );
    await flush();
    a.focus();
    a.tick();
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    id.value = "b";
    await flush();
    eligible.value = false;
    old.resolve({ registered: false, cookieRequired: true });
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
    scope.stop();
  });
});
describe("经营统计加载", () => {
  const shop = { id: "shop", name: "店铺" } as Store;
  const stats = { visitors: 3, conversionRate: 33.3 } as Stats;
  const setup = (request: CheckoutRequest) => {
    const a = activity(),
      identity = ref("merchant"),
      scope = effectScope();
    const loadStore = vi.fn().mockResolvedValue(shop),
      missing = vi.fn().mockResolvedValue(undefined);
    const state = scope.run(() =>
      useMerchantDashboard(request, identity, a.api, { loadStore, missing }),
    )!;
    return { a, identity, scope, state, loadStore };
  };
  it("可见每分钟/焦点只刷新统计；失败保留数字，可重试；隐藏和卸载不请求", async () => {
    const request = vi
      .fn<CheckoutRequest>()
      .mockImplementation(
        async (path) =>
          (path.includes("trend")
            ? []
            : path.includes("orders")
              ? { list: [] }
              : stats) as never,
      );
    const s = setup(request as CheckoutRequest);
    await flush();
    expect(s.state.stats.value).toEqual(stats);
    expect(s.a.every).toHaveBeenCalledWith(
      expect.any(Function),
      MERCHANT_STATS_POLL_MS,
    );
    request.mockClear();
    request.mockRejectedValueOnce(new Error("网络失败"));
    s.a.focus();
    await flush();
    expect(s.state.error.value).toBe("网络失败");
    expect(s.state.stats.value).toEqual(stats);
    await s.state.refresh(false);
    expect(s.state.error.value).toBe("");
    expect(
      request.mock.calls.every(([url]) => url === "/merchant/stats/today"),
    ).toBe(true);
    s.a.show(false);
    const count = request.mock.calls.length;
    s.a.tick();
    await flush();
    expect(request).toHaveBeenCalledTimes(count);
    s.scope.stop();
    expect(s.a.events.size + s.a.timers.size).toBe(0);
  });
  it("合并并发刷新，SSE 完整刷新排队一次；账号改变后丢弃旧响应", async () => {
    const old = deferred<unknown>();
    const request = vi
      .fn<CheckoutRequest>()
      .mockImplementation(
        async (path) =>
          (path.includes("trend")
            ? []
            : path.includes("orders")
              ? { list: [] }
              : stats) as never,
      );
    request.mockReturnValueOnce(old.promise);
    const s = setup(request as CheckoutRequest);
    await flush();
    s.a.focus();
    s.a.tick();
    s.state.refresh();
    s.state.refresh();
    expect(
      request.mock.calls.filter(([url]) => url.includes("today")).length,
    ).toBe(1);
    old.resolve({ visitors: 100 });
    await flush();
    expect(
      request.mock.calls.filter(([url]) => url.includes("today")).length,
    ).toBe(2);
    const late = deferred<unknown>();
    request.mockReturnValueOnce(late.promise);
    void s.state.refresh(false);
    await flush();
    s.identity.value = "next";
    await flush();
    expect(s.state.stats.value).toEqual(stats);
    late.resolve({ visitors: 999 });
    await flush();
    expect(s.state.stats.value).toEqual(stats);
    s.identity.value = "";
    await flush();
    expect(s.state.stats.value).toBeUndefined();
    s.scope.stop();
  });
  it("首次失败显示错误，不冒充零值，重试后恢复", async () => {
    const request = vi
      .fn<CheckoutRequest>()
      .mockRejectedValue(new Error("暂不可用"));
    const s = setup(request as CheckoutRequest);
    await flush();
    expect(s.state.stats.value).toBeUndefined();
    expect(s.state.error.value).toBe("暂不可用");
    request.mockImplementation(
      async (path) =>
        (path.includes("trend")
          ? []
          : path.includes("orders")
            ? { list: [] }
            : stats) as never,
    );
    await s.state.refresh();
    expect(s.state.stats.value).toEqual(stats);
    s.scope.stop();
  });
});
it("上海跨日、首日口径与新店默认值，已有零金额/城市不被默认覆盖", () => {
  expect(shanghaiDateKey(Date.parse("2026-11-12T16:00:00Z"))).toBe(
    "2026-11-13",
  );
  expect(
    trafficDescription({
      traffic: {
        partialDay: true,
        collectionStartedAt: "2026-11-13T01:30:00Z",
      },
    } as Stats),
  ).toContain("09:30");
  expect(trafficDescription()).toContain("模拟支付");
  expect([DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ORDER_DETAIL_POLL_MS]).toEqual([
    20, 100, 15_000,
  ]);
  expect(storeDraft()).toMatchObject({
    city: "",
    openHours: NEW_STORE_DEFAULTS.openHours,
    min: "20",
    fee: "3",
  });
  expect(
    storeDraft({
      city: "北京",
      minOrderCents: 0,
      deliveryFeeCents: 0,
      openHours: "00:00-23:00",
    } as Store),
  ).toMatchObject({
    city: "北京",
    min: "0",
    fee: "0",
    openHours: "00:00-23:00",
  });
});
