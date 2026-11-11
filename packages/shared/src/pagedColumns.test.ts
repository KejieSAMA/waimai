import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { usePagedColumns } from "./pagedColumns";
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
const page = (id: string, total = 50) => ({
  list: [{ id }],
  total,
  page: 1,
  pageSize: 20,
});
function setup() {
  const request = vi.fn().mockResolvedValue(page("first"));
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    usePagedColumns<{ id: string }>(["PENDING", "PREPARING"], request),
  )!;
  return { request, state, scope };
}
describe("订单看板分页隔离", () => {
  it("翻页只请求所属栏目，其余栏目页码与内容不变", async () => {
    const { request, state } = setup();
    await state.refresh();
    request.mockClear();
    await state.changePage("PENDING", 2);
    expect(request).toHaveBeenCalledExactlyOnceWith("PENDING", 2);
    expect(state.boards.PREPARING.page).toBe(1);
    expect(state.boards.PREPARING.list).toEqual([{ id: "first" }]);
  });
  it("栏目旧请求较晚返回不覆盖新页", async () => {
    const { request, state } = setup();
    let finish!: (value: ReturnType<typeof page>) => void;
    request
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce(page("new"));
    const old = state.load("PENDING");
    await state.changePage("PENDING", 2);
    finish(page("old"));
    await old;
    expect(state.boards.PENDING.list).toEqual([{ id: "new" }]);
  });
  it("一栏失败不清空其他栏，重试成功清除错误", async () => {
    const { request, state } = setup();
    request.mockRejectedValueOnce(new Error("连接失败"));
    await state.refresh();
    expect(state.boards.PENDING.error).toBe("连接失败");
    expect(state.boards.PREPARING.list).toHaveLength(1);
    await state.load("PENDING");
    expect(state.boards.PENDING.error).toBe("");
  });
  it("数量减少自动回到有效末页", async () => {
    const { request, state } = setup();
    request
      .mockResolvedValueOnce(page("empty", 1))
      .mockResolvedValueOnce(page("last", 1));
    await state.changePage("PENDING", 3);
    expect(state.boards.PENDING.page).toBe(1);
    expect(state.boards.PENDING.list[0].id).toBe("last");
  });
  it("卸载后忽略未返回结果", async () => {
    const { request, state, scope } = setup();
    let finish!: (value: ReturnType<typeof page>) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const old = state.load("PENDING");
    scope.stop();
    finish(page("old"));
    await old;
    expect(state.boards.PENDING.list).toHaveLength(0);
  });
});
