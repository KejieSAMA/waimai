import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { useStoreReviews } from "./storeReviews";
import type { CheckoutRequest } from "@waimai/shared";
describe("店铺评价追加读取", () => {
  it("失败保留列表及页码，重试原目标页，重复点击不重入并合并重复项", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ list: [{ id: "1" }], total: 3 })
      .mockRejectedValueOnce(new Error("失败"));
    const scope = effectScope(),
      state = scope.run(() =>
        useStoreReviews(request as CheckoutRequest, "a"),
      )!;
    await state.load();
    await state.more();
    expect(state.page.value).toBe(1);
    expect(state.reviews.value).toHaveLength(1);
    request.mockResolvedValueOnce({
      list: [{ id: "1" }, { id: "2" }],
      total: 3,
    });
    const retry = state.load();
    void state.more();
    await retry;
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.lastCall?.[0]).toContain("page=2");
    expect(state.page.value).toBe(2);
    expect(state.reviews.value.map((r) => r.id)).toEqual(["1", "2"]);
    scope.stop();
  });
  it("恢复多页快照，下一次追加正确页；卸载隔离迟到响应", async () => {
    let finish!: (value: unknown) => void;
    const request = vi.fn(
      (_path: string) =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const scope = effectScope(),
      state = scope.run(() =>
        useStoreReviews(request as CheckoutRequest, "a", {
          list: [],
          page: 2,
          total: 6,
        }),
      )!;
    const pending = state.more();
    expect(request.mock.lastCall?.[0]).toContain("page=3");
    scope.stop();
    finish({ list: [{ id: "late" }], total: 9 });
    await pending;
    expect(state.reviews.value).toEqual([]);
    expect(state.total.value).toBe(6);
  });
});
