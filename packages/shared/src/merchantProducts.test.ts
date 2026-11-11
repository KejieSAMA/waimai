import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { useMerchantProducts } from "./merchantProducts";
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
function setup() {
  const request = vi
    .fn()
    .mockResolvedValue({
      list: [{ id: "one" }],
      total: 1,
      counts: { ON: 1, OFF: 0, REVIEW: 0 },
    });
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() => useMerchantProducts(request))!;
  return { request, state };
}
describe("商品列表筛选与选择", () => {
  it("草稿条件不提前影响请求，应用后重置页码和选择并使用服务端计数", async () => {
    const { request, state } = setup();
    state.filters.keyword = "新关键词";
    state.selected.value = ["one"];
    state.page.value = 3;
    await state.load();
    expect(request.mock.calls[0][0]).not.toContain(
      encodeURIComponent("新关键词"),
    );
    await state.apply();
    expect(state.page.value).toBe(1);
    expect(state.selected.value).toEqual([]);
    expect(request.mock.calls[1][0]).toContain(encodeURIComponent("新关键词"));
    expect(state.counts.value.ON).toBe(1);
  });
  it("快速切换条件时丢弃旧响应", async () => {
    const { request, state } = setup();
    let finish!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const old = state.load();
    state.filters.keyword = "新";
    await state.apply();
    finish({ list: [{ id: "old" }], total: 100, counts: { ON: 100 } });
    await old;
    expect(state.list.value[0].id).toBe("one");
    expect(state.total.value).toBe(1);
  });
  it("切换分组清除选择并回第一页", async () => {
    const { state } = setup();
    state.selected.value = ["one"];
    state.page.value = 3;
    state.status.value = "REVIEW";
    await nextTick();
    expect(state.page.value).toBe(1);
    expect(state.selected.value).toEqual([]);
  });
  it("失败允许重试，库存只发送明确选中的 ID", async () => {
    const { request, state } = setup();
    request.mockRejectedValueOnce(new Error("网络错误"));
    expect(await state.load()).toBe(false);
    expect(state.error.value).toBe("网络错误");
    state.selected.value = ["one"];
    request.mockResolvedValueOnce({ updated: 1 });
    expect(await state.batch("stock", state.selected.value, 7)).toBe(true);
    expect(request).toHaveBeenCalledWith("/merchant/products/batch", {
      method: "POST",
      body: { ids: ["one"], action: "stock", stock: 7 },
    });
    expect(state.error.value).toBe("");
  });
});
