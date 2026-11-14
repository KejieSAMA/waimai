import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import {
  useUserOrderDetail,
  type Order,
  type OrderStatus,
} from "@waimai/shared";
import { useOrderInteractions } from "./orderInteractions";
const fixture = (status: OrderStatus, extras: Partial<Order> = {}) =>
  ({
    id: "o",
    status,
    type: "DELIVERY",
    items: [],
    store: { name: "店铺" },
    addressSnapshot: "{}",
    review: null,
    ...extras,
  }) as Order;
async function flush() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await nextTick();
  }
}
async function setup(
  status: OrderStatus,
  hashValue = "",
  extras: Partial<Order> = {},
) {
  const request = vi.fn().mockResolvedValue(fixture(status, extras));
  const id = ref("o"),
    hash = ref(hashValue),
    scope = effectScope();
  const state = scope.run(() => {
    const detail = useUserOrderDetail(request, id);
    return { detail, ui: useOrderInteractions(detail, hash) };
  })!;
  await flush();
  return { ...state, request, id, hash, scope };
}
describe("手机订单 sheet 交互", () => {
  it("评价深链接打开可评价 sheet，已评价及非完成不打开", async () => {
    for (const [status, review, opens] of [
      ["DONE", null, true],
      ["DONE", { id: "r" }, false],
      ["PENDING", null, false],
    ] as const) {
      const s = await setup(status, "#review", { review });
      expect(s.ui.reviewOpen.value).toBe(opens);
      s.scope.stop();
    }
  });
  it("取消和完成先确认，不直接请求；处理中无法关闭编辑或重复提交", async () => {
    const s = await setup("PENDING");
    await s.ui.onAction("cancel");
    expect(s.ui.confirmation.value).toBe("cancel");
    expect(s.request).toHaveBeenCalledTimes(1);
    let finish!: (o: Order) => void;
    s.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const action = s.ui.confirm();
    void s.ui.confirm();
    expect(s.request).toHaveBeenCalledTimes(2);
    expect(s.ui.disabled.value).toBe(true);
    finish(fixture("CANCELLED"));
    await action;
    expect(s.ui.confirmation.value).toBeUndefined();
    s.scope.stop();
    const done = await setup("PICKUP");
    await done.ui.onAction("complete");
    expect(done.ui.confirmation.value).toBe("complete");
    expect(done.request).toHaveBeenCalledTimes(1);
    done.scope.stop();
  });
  it("退款失败保留原因和 sheet；放弃后清空草稿；成功后关闭", async () => {
    const s = await setup("PREPARING");
    await s.ui.onAction("refund");
    s.detail.reason.value = "不需要了";
    expect(s.ui.refundDirty.value).toBe(true);
    s.request.mockRejectedValueOnce(new Error("网络失败"));
    await s.ui.sendRefund();
    expect(s.ui.refundOpen.value).toBe(true);
    expect(s.detail.reason.value).toBe("不需要了");
    expect(s.ui.formError.value).toBe("网络失败");
    s.ui.closeRefund();
    expect(s.detail.reason.value).toBe("");
    await s.ui.onAction("refund");
    s.detail.reason.value = "重新申请";
    s.request.mockResolvedValueOnce(fixture("REFUNDING"));
    await s.ui.sendRefund();
    expect(s.ui.refundOpen.value).toBe(false);
    s.scope.stop();
  });
  it("评价请求互斥，失败保留评分与内容，成功显示已评价并关闭", async () => {
    const s = await setup("DONE");
    await s.ui.onAction("evaluate");
    s.detail.rating.value = "4";
    s.detail.content.value = "内容";
    s.request.mockRejectedValueOnce(new Error("失败"));
    await s.ui.sendReview();
    expect(s.ui.reviewOpen.value).toBe(true);
    expect(s.detail.rating.value).toBe("4");
    expect(s.detail.content.value).toBe("内容");
    let finish!: (o: { id: string }) => void;
    s.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const action = s.ui.sendReview();
    void s.ui.sendReview();
    s.ui.closeReview();
    expect(s.ui.reviewOpen.value).toBe(true);
    expect(s.request).toHaveBeenCalledTimes(3);
    finish({ id: "r" });
    await action;
    expect(s.detail.reviewed.value).toBe(true);
    expect(s.ui.reviewOpen.value).toBe(false);
    s.scope.stop();
  });
  it("切单隔离旧操作响应及错误，不关闭新订单 sheet", async () => {
    const s = await setup("PREPARING");
    await s.ui.onAction("refund");
    s.detail.reason.value = "旧单";
    let reject!: (e: Error) => void;
    s.request.mockReturnValueOnce(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    const old = s.ui.sendRefund();
    s.request.mockResolvedValueOnce(fixture("PREPARING", { id: "new" }));
    s.id.value = "new";
    await flush();
    await s.ui.onAction("refund");
    s.detail.reason.value = "新单";
    reject(new Error("旧错误"));
    await old;
    expect(s.ui.formError.value).toBe("");
    expect(s.ui.refundOpen.value).toBe(true);
    expect(s.detail.reason.value).toBe("新单");
    s.scope.stop();
  });
});
