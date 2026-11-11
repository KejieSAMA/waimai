import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { usePublicStores } from "./publicStores";
import type { CheckoutRequest } from "./cart";
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
function setup(append = false) {
  const request = vi.fn();
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    usePublicStores(request as CheckoutRequest, append),
  )!;
  return { state, request, scope };
}
describe("首页请求", () => {
  it("初始为加载态，筛选后的旧响应与卸载响应被隔离", async () => {
    const { state, request, scope } = setup();
    expect(state.pending.value).toBe(true);
    let finish!: (value: unknown) => void;
    request
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce({ list: [{ id: "new" }], total: 1 });
    const old = state.load();
    state.category.value = "new";
    await nextTick();
    await nextTick();
    finish({ list: [{ id: "old" }], total: 9 });
    await old;
    expect(state.stores.value.map((store) => store.id)).toEqual(["new"]);
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const late = state.load();
    scope.stop();
    finish({ list: [], total: 0 });
    await late;
    expect(state.total.value).toBe(1);
  });
  it("加载更多失败保留原页，重试同一页，连续点击只发一次", async () => {
    const { state, request } = setup(true);
    request.mockResolvedValueOnce({ list: [{ id: "1" }], total: 3 });
    await state.load();
    request.mockRejectedValueOnce(new Error("网络失败"));
    state.more();
    state.more();
    await nextTick();
    await nextTick();
    expect(request).toHaveBeenCalledTimes(2);
    expect(state.page.value).toBe(1);
    expect(state.stores.value).toHaveLength(1);
    request.mockResolvedValueOnce({ list: [{ id: "2" }], total: 3 });
    await state.load();
    expect(request.mock.lastCall![0]).toContain("page=2");
    expect(state.page.value).toBe(2);
    expect(state.stores.value).toHaveLength(2);
  });
  it("输入搜索词不自行查询，显式提交后才应用，分类失败可以重试", async () => {
    const { state, request } = setup();
    state.keyword.value = "面 馆";
    await nextTick();
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValueOnce({ list: [], total: 0 });
    state.search();
    await nextTick();
    expect(request.mock.lastCall![0]).toContain(encodeURIComponent("面 馆"));
    request.mockRejectedValueOnce(new Error("分类失败"));
    await state.loadCategories();
    expect(state.categoryError.value).toBe("分类失败");
    request.mockResolvedValueOnce([{ id: "main", name: "主食" }]);
    await state.loadCategories();
    expect(state.categories.value).toHaveLength(1);
    expect(state.categoryError.value).toBe("");
  });
});
