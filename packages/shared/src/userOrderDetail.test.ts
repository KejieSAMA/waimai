import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { useUserOrderDetail } from "./userOrderDetail";
import type { Order } from "./index";

const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
const order = (id: string, status = "DONE") =>
  ({ id, status, review: null }) as Order;
function controller() {
  const initial = deferred();
  const request = vi
    .fn<
      (
        path: string,
        options?: { method?: string; body?: unknown },
      ) => Promise<unknown>
    >()
    .mockReturnValueOnce(initial.promise);
  const id = ref("first"),
    scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    useUserOrderDetail(request as Parameters<typeof useUserOrderDetail>[0], id),
  )!;
  return { initial, request, id, scope, state };
}

describe("订单详情路由及操作", () => {
  it("切换订单清理旧表单，较晚返回的旧订单不会覆盖新订单", async () => {
    const { initial, request, id, state } = controller();
    request.mockResolvedValueOnce(order("second"));
    state.reason.value = "旧原因";
    state.content.value = "旧评价";
    id.value = "second";
    await Promise.resolve();
    initial.resolve(order("first"));
    await Promise.resolve();
    expect(state.order.value?.id).toBe("second");
    expect(state.reason.value).toBe("");
    expect(state.content.value).toBe("");
    expect(state.pending.value).toBe(false);
  });

  it("详情加载失败可重试恢复", async () => {
    const { initial, request, state } = controller();
    initial.resolve(order("first"));
    await Promise.resolve();
    request.mockRejectedValueOnce(new Error("订单不存在"));
    await state.load();
    expect(state.error.value).toBe("订单不存在");
    request.mockResolvedValueOnce(order("first", "PREPARING"));
    await state.load();
    expect(state.error.value).toBe("");
    expect(state.order.value?.status).toBe("PREPARING");
  });

  it("等待操作期间拦截重复提交，状态使用后端响应", async () => {
    const { initial, request, state } = controller();
    initial.resolve(order("first", "PENDING_PAY"));
    await Promise.resolve();
    const operation = deferred();
    request.mockReturnValueOnce(operation.promise);
    const first = state.act("pay");
    expect(await state.act("pay")).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
    operation.resolve(order("first", "PENDING"));
    expect(await first).toBe(true);
    expect(state.order.value?.status).toBe("PENDING");
    expect(state.processing.value).toBe(false);
  });

  it("操作请求未返回时切换路由不会污染新页面", async () => {
    const { initial, request, id, state } = controller();
    initial.resolve(order("first", "PENDING_PAY"));
    await Promise.resolve();
    const operation = deferred();
    request
      .mockReturnValueOnce(operation.promise)
      .mockResolvedValueOnce(order("second"));
    const pending = state.act("pay");
    id.value = "second";
    await Promise.resolve();
    operation.resolve(order("first", "PENDING"));
    expect(await pending).toBe(false);
    expect(state.order.value?.id).toBe("second");
    expect(state.processing.value).toBe(false);
  });

  it("评价成功使用服务端 ID 标记已评价，失败则保留正文供重试", async () => {
    const { initial, request, state } = controller();
    initial.resolve(order("first"));
    await Promise.resolve();
    state.content.value = "  味道很好  ";
    request.mockRejectedValueOnce(new Error("网络错误"));
    expect(await state.review()).toBe(false);
    expect(state.reviewed.value).toBe(false);
    expect(state.content.value).toBe("  味道很好  ");
    request.mockResolvedValueOnce({ id: "review-1" });
    expect(await state.review()).toBe(true);
    expect(state.reviewed.value).toBe(true);
    expect(request).toHaveBeenLastCalledWith("/user/orders/first/review", {
      method: "POST",
      body: { rating: 5, content: "味道很好" },
    });
  });

  it("离开详情后忽略未返回的请求", async () => {
    const { initial, state, scope } = controller();
    scope.stop();
    initial.resolve(order("first"));
    await Promise.resolve();
    expect(state.order.value).toBeUndefined();
  });
});

describe("前台订单活动刷新", () => {
  afterEach(() => vi.useRealTimers());
  it("可见非终态定期刷新、隐藏暂停、恢复立即检查、支付到期和卸载清理", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
    let visible = true,
      listener = () => {};
    const expires = new Date(Date.now() + 60000).toISOString();
    const request = vi.fn().mockResolvedValue({
      ...order("p", "PENDING_PAY"),
      paymentExpiresAt: expires,
    });
    const scope = effectScope();
    scopes.push(scope);
    const state = scope.run(() =>
      useUserOrderDetail(request, ref("p"), {
        now: () => Date.now(),
        visible: () => visible,
        listen: (cb) => {
          listener = cb;
          return () => {
            listener = () => {};
          };
        },
        every: (cb, ms) => {
          const id = setInterval(cb, ms);
          return () => clearInterval(id);
        },
        later: (cb, ms) => {
          const id = setTimeout(cb, ms);
          return () => clearTimeout(id);
        },
      }),
    )!;
    await vi.advanceTimersByTimeAsync(15000);
    expect(request).toHaveBeenCalledTimes(2);
    visible = false;
    listener();
    await vi.advanceTimersByTimeAsync(30000);
    expect(request).toHaveBeenCalledTimes(2);
    visible = true;
    listener();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(15000);
    expect(state.paymentExpired.value).toBe(true);
    const before = request.mock.calls.length;
    await state.act("pay");
    expect(
      request.mock.calls
        .slice(before)
        .some((args) => String(args[0]).endsWith("/pay")),
    ).toBe(false);
    request.mockResolvedValue(order("p", "DONE"));
    await state.load();
    await vi.advanceTimersByTimeAsync(30000);
    const count = request.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30000);
    expect(request).toHaveBeenCalledTimes(count);
    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("服务端到期拒绝后读取已提交的取消状态，保留错误说明", async () => {
    const { state, initial, request } = controller();
    initial.resolve(order("first", "PENDING_PAY"));
    await Promise.resolve();
    request
      .mockRejectedValueOnce(
        Object.assign(new Error("订单已超时取消"), {
          details: { reason: "PAYMENT_EXPIRED" },
        }),
      )
      .mockResolvedValueOnce(order("first", "CANCELLED"));
    expect(await state.act("pay")).toBe(false);
    expect(state.order.value?.status).toBe("CANCELLED");
    expect(state.error.value).toContain("超时");
  });
});

describe("过期响应的路由隔离", () => {
  it("过期错误触发读取期间换单，不把旧错误写到新订单", async () => {
    const { state, initial, request, id } = controller();
    initial.resolve(order("first", "PENDING_PAY"));
    await Promise.resolve();
    const refresh = deferred();
    request
      .mockRejectedValueOnce(
        Object.assign(new Error("旧订单到期"), {
          details: { reason: "PAYMENT_EXPIRED" },
        }),
      )
      .mockReturnValueOnce(refresh.promise);
    const paying = state.act("pay");
    await Promise.resolve();
    await Promise.resolve();
    request.mockResolvedValueOnce(order("second", "PREPARING"));
    id.value = "second";
    await Promise.resolve();
    refresh.resolve(order("first", "CANCELLED"));
    await paying;
    expect(state.order.value?.id).toBe("second");
    expect(state.error.value).toBe("");
  });
});
