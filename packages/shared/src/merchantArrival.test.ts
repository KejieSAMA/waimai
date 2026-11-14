import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { Order } from "./index";
import type { CheckoutRequest } from "./cart";
import { canArrive, useMerchantArrival } from "./merchantArrival";
const row = (id: string, status = "DELIVERING", type = "DELIVERY") =>
  ({ id, orderNo: id, status, type, store: { name: "店铺" } }) as Order;
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
function setup(
  initial = [row("a"), row("b"), row("pickup", "PICKUP", "PICKUP")],
) {
  const rows = ref(initial),
    scopeKey = ref("DELIVERING:1"),
    readonly = ref(false);
  const request = vi.fn(),
    refresh = vi.fn().mockResolvedValue(undefined),
    scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    useMerchantArrival(request as CheckoutRequest, {
      rows: () => rows.value,
      scope: () => scopeKey.value,
      locked: () => readonly.value,
      refresh,
    }),
  )!;
  return { state, rows, scopeKey, readonly, request, refresh, scope };
}
describe("商家到达选择与提交", () => {
  it("只选择当前列表配送中外卖，切筛选／页码清空，刷新剔除失效选择", async () => {
    const s = setup();
    s.state.select(["a", "pickup", "missing", "a"]);
    expect(s.state.selected.value).toEqual(["a"]);
    s.rows.value[0].status = "DONE";
    await nextTick();
    expect(s.state.selected.value).toEqual([]);
    s.state.select(["b"]);
    s.scopeKey.value = "DELIVERING:2";
    await nextTick();
    expect(s.state.selected.value).toEqual([]);
    expect(canArrive(row("done", "DONE"))).toBe(false);
    expect(canArrive(row("bad", "DELIVERING", "PICKUP"))).toBe(false);
  });
  it("最多100单，不静默截断，超过上限不提供全选，冻结不可选择或提交", () => {
    const s = setup(Array.from({ length: 101 }, (_, i) => row(String(i))));
    s.state.select(["0"]);
    s.state.select(s.rows.value.map((row) => row.id));
    expect(s.state.selected.value).toEqual(["0"]);
    expect(s.state.error.value).toContain("100");
    expect(s.state.canSelectAll.value).toBe(false);
    s.readonly.value = true;
    s.state.open();
    expect(s.state.target.value).toBeUndefined();
    s.state.select([]);
    expect(s.state.selected.value).toEqual(["0"]);
    s.state.clearSelection();
    expect(s.state.selected.value).toEqual([]);
  });
  it("单笔先确认，提交互斥且禁止关闭，使用单笔端点，成功刷新", async () => {
    const s = setup();
    s.state.open([s.rows.value[0]]);
    expect(s.request).not.toHaveBeenCalled();
    expect(s.state.target.value).toMatchObject({
      batch: false,
      orders: [{ id: "a", storeName: "店铺" }],
    });
    let finish!: (value: unknown) => void;
    s.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = s.state.confirm();
    void s.state.confirm();
    s.state.close();
    s.state.select(["b"]);
    expect(s.state.target.value).toBeDefined();
    expect(s.request).toHaveBeenCalledOnce();
    expect(s.state.selected.value).toEqual([]);
    finish(row("a", "DONE"));
    await pending;
    expect(s.request.mock.calls[0][0]).toBe("/merchant/orders/a/arrive");
    expect(s.refresh).toHaveBeenCalledOnce();
    expect(s.state.target.value).toBeUndefined();
  });
  it("批量捕获选单快照，部分成功汇总并保留仍可重试失败项", async () => {
    const s = setup();
    s.state.select(["a", "b"]);
    s.state.open();
    s.request.mockResolvedValueOnce({
      results: [
        { id: "a", outcome: "completed" },
        { id: "b", outcome: "failed", message: "失败" },
      ],
    });
    s.refresh.mockImplementationOnce(async () => {
      s.rows.value = [row("b"), row("pickup", "PICKUP", "PICKUP")];
    });
    await s.state.confirm();
    expect(s.request.mock.calls[0]).toEqual([
      "/merchant/orders/batch-arrive",
      { method: "POST", body: { ids: ["a", "b"] } },
    ]);
    expect(s.state.summary.value).toMatchObject({
      completed: 1,
      alreadyCompleted: 0,
      failed: [{ id: "b", message: "失败" }],
    });
    expect(s.state.selected.value).toEqual(["b"]);
  });
  it("状态变化失败项不再选中，已完成单独汇总，确认期间追加不会加入原批次", async () => {
    const s = setup();
    s.state.select(["a", "b"]);
    s.state.open();
    s.rows.value.push(row("later"));
    s.request.mockResolvedValueOnce({
      results: [
        { id: "a", outcome: "already_completed" },
        { id: "b", outcome: "failed", message: "退款中" },
      ],
    });
    s.refresh.mockImplementationOnce(async () => {
      s.rows.value = [row("b", "REFUNDING"), row("later")];
    });
    await s.state.confirm();
    expect(s.state.selected.value).toEqual([]);
    expect(s.state.summary.value.alreadyCompleted).toBe(1);
    expect(s.request.mock.calls[0][1].body.ids).toEqual(["a", "b"]);
  });
  it("响应丢失不自动重发，先刷新核对；失败保留确认内容及错误", async () => {
    const s = setup();
    s.state.select(["a"]);
    s.state.open();
    s.request.mockRejectedValueOnce(new Error("连接断开"));
    await s.state.confirm();
    expect(s.request).toHaveBeenCalledOnce();
    expect(s.refresh).toHaveBeenCalledOnce();
    expect(s.state.target.value).toBeDefined();
    expect(s.state.error.value).toContain("核对结果");
    expect(s.state.pending.value).toBe(false);
  });
  it("成功后的刷新失败保留处理结果，卸载／换身份后旧响应不更新状态", async () => {
    const s = setup();
    s.state.open([s.rows.value[0]]);
    s.request.mockResolvedValueOnce(row("a", "DONE"));
    s.refresh.mockRejectedValueOnce(new Error("读取失败"));
    await s.state.confirm();
    expect(s.state.results.value).toHaveLength(1);
    expect(s.state.error.value).toContain("刷新失败");
    const late = setup();
    late.state.open([late.rows.value[0]]);
    let finish!: (value: unknown) => void;
    late.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const action = late.state.confirm();
    late.scope.stop();
    finish(row("a", "DONE"));
    await action;
    expect(late.state.results.value).toEqual([]);
    expect(late.refresh).not.toHaveBeenCalled();
  });
});
