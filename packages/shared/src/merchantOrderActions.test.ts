import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { Order } from "./index";
import type { CheckoutRequest } from "./cart";
import {
  canApplyMerchantAction,
  merchantActionsForStatus,
  useMerchantOrderBatch,
} from "./merchantOrderActions";

const row = (id: string, status = "PENDING", type = "DELIVERY") =>
  ({
    id,
    orderNo: id,
    status,
    type,
    disputed: false,
    refundRejected: false,
    store: { name: "店铺" },
  }) as Order;
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
function setup(initial = [row("a"), row("b"), row("other", "DONE")]) {
  const rows = ref(initial),
    scopeKey = ref("PENDING:1"),
    readonly = ref(false);
  const request = vi.fn(),
    refresh = vi.fn().mockResolvedValue(undefined),
    scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    useMerchantOrderBatch(request as CheckoutRequest, {
      rows: () => rows.value,
      scope: () => scopeKey.value,
      locked: () => readonly.value,
      refresh,
    }),
  )!;
  return { state, rows, scopeKey, readonly, request, refresh, scope };
}
describe("商家批量动作选择与提交", () => {
  it("仅四种状态页提供对应动作，先选动作才能选择订单", () => {
    expect(merchantActionsForStatus("PENDING")).toEqual(["accept", "reject"]);
    expect(merchantActionsForStatus("PREPARING")).toEqual(["ready"]);
    expect(merchantActionsForStatus("DELIVERING")).toEqual(["arrive"]);
    expect(merchantActionsForStatus("REFUNDING")).toEqual([
      "refund-approve",
      "refund-reject",
    ]);
    for (const status of ["", "PENDING_PAY", "PICKUP", "DONE", "CANCELLED"])
      expect(merchantActionsForStatus(status)).toEqual([]);
    const s = setup();
    s.state.select(["a"]);
    expect(s.state.selected.value).toEqual([]);
    s.state.choose("accept");
    s.state.select(["a", "a", "missing", "other"]);
    expect(s.state.selected.value).toEqual(["a"]);
  });
  it("根据所选动作排除平台处理、重复拒退及自提到达，允许已拒退订单同意退款", () => {
    const refund = row("r", "REFUNDING");
    expect(canApplyMerchantAction(refund, "refund-reject")).toBe(true);
    refund.refundRejected = true;
    expect(canApplyMerchantAction(refund, "refund-reject")).toBe(false);
    expect(canApplyMerchantAction(refund, "refund-approve")).toBe(true);
    refund.disputed = true;
    expect(canApplyMerchantAction(refund, "refund-approve")).toBe(false);
    expect(
      canApplyMerchantAction(row("p", "DELIVERING", "PICKUP"), "arrive"),
    ).toBe(false);
    expect(
      canApplyMerchantAction(row("p", "PREPARING", "PICKUP"), "ready"),
    ).toBe(true);
  });
  it("切动作、退出、筛选与页码变化清空选择，追加不清空，刷新剔除失效项", async () => {
    const s = setup();
    s.state.choose("accept");
    s.state.select(["a"]);
    s.state.choose("reject");
    expect(s.state.selected.value).toEqual([]);
    s.state.select(["b"]);
    s.rows.value.push(row("later"));
    await nextTick();
    expect(s.state.selected.value).toEqual(["b"]);
    s.rows.value[1].status = "CANCELLED";
    await nextTick();
    expect(s.state.selected.value).toEqual([]);
    s.state.select(["a"]);
    s.scopeKey.value = "PENDING:2";
    await nextTick();
    expect(s.state.action.value).toBeUndefined();
    expect(s.state.selected.value).toEqual([]);
  });
  it("100单上限与全选条件，冻结不能进入或提交但可退出", () => {
    const s = setup(Array.from({ length: 101 }, (_, i) => row(String(i))));
    s.state.choose("accept");
    s.state.select(["0"]);
    s.state.select(s.rows.value.map((row) => row.id));
    expect(s.state.selected.value).toEqual(["0"]);
    expect(s.state.error.value).toContain("100");
    expect(s.state.canSelectAll.value).toBe(false);
    s.rows.value.pop();
    expect(s.state.canSelectAll.value).toBe(true);
    s.readonly.value = true;
    s.state.open();
    expect(s.state.target.value).toBeUndefined();
    s.state.choose("reject");
    expect(s.state.action.value).toBe("accept");
    s.state.choose();
    expect(s.state.action.value).toBeUndefined();
  });
  it("拒单和拒退必须填写1–500字，提交统一修剪原因，确认前不请求", async () => {
    for (const action of ["reject", "refund-reject"] as const) {
      const s = setup([
        row("a", action === "reject" ? "PENDING" : "REFUNDING"),
      ]);
      s.state.choose(action);
      s.state.select(["a"]);
      s.state.open();
      expect(s.request).not.toHaveBeenCalled();
      s.state.reason.value = " ";
      await s.state.confirm();
      s.state.reason.value = "字".repeat(501);
      await s.state.confirm();
      expect(s.request).not.toHaveBeenCalled();
      expect(s.state.error.value).toContain("1–500");
      s.state.reason.value = "  统一原因  ";
      s.request.mockResolvedValueOnce({
        results: [{ id: "a", outcome: "applied" }],
      });
      await s.state.confirm();
      expect(s.request.mock.calls[0]).toEqual([
        "/merchant/orders/batch-action",
        { method: "POST", body: { action, ids: ["a"], reason: "统一原因" } },
      ]);
    }
  });
  it("提交快照、选择和关闭互斥，追加订单不加入本批，成功汇总并刷新", async () => {
    const s = setup();
    s.state.choose("accept");
    s.state.select(["a", "b"]);
    s.state.open();
    let finish!: (value: unknown) => void;
    s.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = s.state.confirm();
    s.state.choose("reject");
    s.state.select([]);
    s.state.close();
    void s.state.confirm();
    s.rows.value.push(row("later"));
    expect(s.state.action.value).toBe("accept");
    expect(s.state.target.value).toBeDefined();
    expect(s.request).toHaveBeenCalledOnce();
    finish({
      results: [
        { id: "a", outcome: "applied" },
        { id: "b", outcome: "already_applied" },
      ],
    });
    await pending;
    expect(s.request.mock.calls[0][1].body).toEqual({
      action: "accept",
      ids: ["a", "b"],
    });
    expect(s.state.summary.value).toMatchObject({
      applied: 1,
      alreadyApplied: 1,
      failed: [],
    });
    expect(s.state.selected.value).toEqual([]);
    expect(s.refresh).toHaveBeenCalledOnce();
  });
  it("部分失败仅保留仍符合条件项及统一原因，重新打开可直接核对重试", async () => {
    const s = setup([row("a"), row("b"), row("c")]);
    s.state.choose("reject");
    s.state.select(["a", "b", "c"]);
    s.state.open();
    s.state.reason.value = "缺货";
    s.request.mockResolvedValueOnce({
      results: [
        { id: "a", outcome: "applied" },
        { id: "b", outcome: "failed", message: "临时错误" },
        { id: "c", outcome: "failed", message: "已接单" },
      ],
    });
    s.refresh.mockImplementationOnce(async () => {
      s.rows.value = [row("b"), row("c", "PREPARING")];
    });
    await s.state.confirm();
    await nextTick();
    expect(s.state.selected.value).toEqual(["b"]);
    expect(s.state.summary.value.failed).toHaveLength(2);
    expect(s.state.reason.value).toBe("缺货");
    s.state.open();
    expect(s.state.reason.value).toBe("缺货");
    expect(s.state.target.value?.orders.map((row) => row.id)).toEqual(["b"]);
  });
  it("响应丢失先刷新核对，不自动重发，保留确认快照与原因", async () => {
    const s = setup();
    s.state.choose("reject");
    s.state.select(["a"]);
    s.state.open();
    s.state.reason.value = "缺货";
    s.request.mockRejectedValueOnce(new Error("连接中断"));
    await s.state.confirm();
    expect(s.request).toHaveBeenCalledOnce();
    expect(s.refresh).toHaveBeenCalledOnce();
    expect(s.state.target.value).toBeDefined();
    expect(s.state.reason.value).toBe("缺货");
    expect(s.state.error.value).toContain("核对结果");
  });
  it("单笔到达保留原端点，加载失败保留结果，离开页面不应用迟到响应", async () => {
    const s = setup([row("a", "DELIVERING")]);
    s.state.open({ order: s.rows.value[0], action: "arrive" });
    s.request.mockResolvedValueOnce(row("a", "DONE"));
    s.refresh.mockRejectedValueOnce(new Error("失败"));
    await s.state.confirm();
    expect(s.request.mock.calls[0][0]).toBe("/merchant/orders/a/arrive");
    expect(s.state.results.value).toHaveLength(1);
    expect(s.state.error.value).toContain("刷新失败");
    const late = setup();
    late.state.choose("accept");
    late.state.select(["a"]);
    late.state.open();
    let finish!: (value: unknown) => void;
    late.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = late.state.confirm();
    late.scope.stop();
    finish({ results: [{ id: "a", outcome: "applied" }] });
    await pending;
    expect(late.state.results.value).toEqual([]);
    expect(late.refresh).not.toHaveBeenCalled();
  });
});
