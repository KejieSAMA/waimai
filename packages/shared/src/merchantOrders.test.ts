import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { merchantOrderQuery, useMerchantOrders } from "./merchantOrders";
import type { CheckoutRequest } from "./cart";
import type { MerchantOrderQuery } from "./merchantOrders";
import type { Order } from "./index";
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
const page = (id: string, total = 1) => ({
  list: [{ id }],
  total,
  page: 1,
  pageSize: 20,
  counts: { all: total, PENDING: total },
});
function setup() {
  const request = vi.fn().mockResolvedValue(page("initial")),
    query = ref<MerchantOrderQuery>({ status: "", keyword: "", page: 1 });
  const write = vi.fn(async (value: MerchantOrderQuery) => {
    query.value = value;
  });
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    useMerchantOrders(request as CheckoutRequest, query, write),
  )!;
  return { request, query, write, state, scope };
}
async function flush() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await nextTick();
  }
}
describe("商家订单列表与弹窗", () => {
  it("解析深链接并处理无效参数", () => {
    expect(
      merchantOrderQuery({ status: "REFUNDING", keyword: "单号", page: "3" }),
    ).toEqual({ status: "REFUNDING", keyword: "单号", page: 3 });
    expect(merchantOrderQuery({ status: "fake", page: "-1" })).toEqual({
      status: "",
      keyword: "",
      page: 1,
    });
  });
  it("状态和查询回第一页，页码跟随路由；输入关键词不自动查询", async () => {
    const { state, query, request, write } = setup();
    await flush();
    state.keyword.value = "abc";
    await nextTick();
    expect(request).toHaveBeenCalledTimes(1);
    await state.search();
    await flush();
    expect(query.value.keyword).toBe("abc");
    await state.changePage(3);
    await flush();
    await state.changeStatus("PENDING");
    await flush();
    expect(write).toHaveBeenLastCalledWith({
      status: "PENDING",
      keyword: "abc",
      page: 1,
    });
  });
  it("列表旧响应和卸载响应不能覆盖新筛选，失败保留列表", async () => {
    const { state, query, request, scope } = setup();
    await flush();
    let done!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const old = state.load();
    request.mockResolvedValueOnce(page("new"));
    query.value = { status: "DONE", keyword: "", page: 1 };
    await flush();
    done(page("old"));
    await old;
    expect(state.list.value[0].id).toBe("new");
    request.mockRejectedValueOnce(new Error("断网"));
    await state.load();
    expect(state.list.value[0].id).toBe("new");
    expect(state.error.value).toBe("断网");
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const late = state.load();
    scope.stop();
    done(page("late"));
    await late;
    expect(state.list.value[0].id).toBe("new");
  });
  it("切换和关闭详情隔离旧响应，原因操作互斥且成功刷新详情", async () => {
    const { state, request } = setup();
    await flush();
    let done!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    state.openDetail("old");
    request.mockResolvedValueOnce({ id: "new", status: "PENDING" } as Order);
    state.openDetail("new");
    await flush();
    done({ id: "old" });
    await flush();
    expect(state.detail.value?.id).toBe("new");
    state.act("new", "reject");
    expect(state.reasonTarget.value?.id).toBe("new");
    state.reason.value = "今日售完";
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const sending = state.send("new", "reject");
    const calls = request.mock.calls.length;
    await state.send("new", "reject");
    expect(request).toHaveBeenCalledTimes(calls);
    request
      .mockResolvedValueOnce(page("remain"))
      .mockResolvedValueOnce({ id: "new", status: "CANCELLED" });
    done({ id: "new", status: "CANCELLED" });
    await sending;
    expect(state.reasonTarget.value).toBeUndefined();
    expect(state.detail.value?.status).toBe("CANCELLED");
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const loading = state.loadDetail();
    state.closeDetail();
    done({ id: "new" });
    await loading;
    expect(state.detail.value).toBeUndefined();
  });
  it("缩页替换路由，操作失败保留原因，SSE 刷新不切换当前筛选页", async () => {
    const { state, query, write, request } = setup();
    await flush();
    request.mockResolvedValueOnce(page("empty", 21));
    query.value = { status: "PREPARING", keyword: "", page: 5 };
    await flush();
    expect(write).toHaveBeenCalledWith(
      { status: "PREPARING", keyword: "", page: 2 },
      true,
    );
    state.act("order", "refund-reject");
    state.reason.value = "已出餐";
    request.mockRejectedValueOnce(new Error("状态改变"));
    expect(await state.send("order", "refund-reject")).toBe(false);
    expect(state.reason.value).toBe("已出餐");
    expect(state.reasonTarget.value?.id).toBe("order");
    query.value = { status: "REFUNDING", keyword: "abc", page: 1 };
    await flush();
    await state.refresh();
    expect(query.value).toEqual({
      status: "REFUNDING",
      keyword: "abc",
      page: 1,
    });
  });
});
