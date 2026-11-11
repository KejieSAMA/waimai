import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { orderTime, userOrderActions, useUserOrders } from "./userOrders";
import type { Order } from "./index";

vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
function controller() {
  const request =
    vi.fn<
      (
        path: string,
        options?: { method?: string; body?: unknown },
      ) => Promise<unknown>
    >();
  const cart = {
    count: 2,
    type: "DELIVERY" as "DELIVERY" | "PICKUP",
    clear: vi.fn(),
    set: vi.fn(),
    forStore: vi.fn(() => ({ count: 2 }) as import("./cart").CheckoutCart),
    replaceStore: vi.fn(),
    rememberStore: vi.fn(),
  };
  const navigate = vi.fn();
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    useUserOrders(
      request as Parameters<typeof useUserOrders>[0],
      cart,
      navigate,
    ),
  )!;
  return { state, request, cart, navigate };
}

describe("订单展示规则", () => {
  it("以上海日期显示今天、昨天及历史日期，跨年正确", () => {
    const now = new Date("2026-01-01T03:00:00Z");
    expect(orderTime("2026-01-01T02:00:00Z", now)).toBe("今天 10:00");
    expect(orderTime("2025-12-31T15:30:00Z", now)).toBe("昨天 23:30");
    expect(orderTime("2025-12-30T15:30:00Z", now)).toBe("12-30 23:30");
    expect(orderTime("2025-12-31T16:00:00Z", now)).toBe("今天 00:00");
  });
  it("已完成提供评价与再来一单，评价后只保留再来一单", () => {
    const details = vi.fn(),
      review = vi.fn(),
      reorder = vi.fn();
    const order = { status: "DONE", review: null } as Order;
    const actions = userOrderActions(order, details, review, reorder);
    expect(actions.map((a) => [a.label, a.variant])).toEqual([
      ["评价", undefined],
      ["再来一单", "secondary"],
    ]);
    actions[0].onClick?.();
    actions[1].onClick?.();
    expect(review).toHaveBeenCalledOnce();
    expect(reorder).toHaveBeenCalledOnce();
    expect(
      userOrderActions(
        { ...order, review: { id: "review" } },
        details,
        review,
        reorder,
      ),
    ).toHaveLength(1);
  });
  it.each([
    ["REFUNDING", "查看进度", undefined],
    ["CANCELLED", "再来一单", "secondary"],
    ["DELIVERING", "查看订单", "secondary"],
    ["PENDING_PAY", "去支付", "secondary"],
  ] as const)("%s 使用 %s 操作", (status, label, variant) => {
    const fn = vi.fn();
    const actions = userOrderActions({ status } as Order, fn, fn, fn);
    expect(actions[0].label).toBe(label);
    expect(actions[0].variant).toBe(variant);
    actions[0].onClick?.();
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("订单请求与再次购买", () => {
  it("快速切换筛选后忽略较晚返回的旧列表", async () => {
    const { state, request } = controller();
    let finish!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    request.mockResolvedValueOnce({ list: [{ id: "new" }], total: 1 });
    const old = state.load();
    state.tab.value = "unreviewed";
    await nextTick();
    finish({ list: [{ id: "old" }], total: 99 });
    await old;
    expect(state.list.value.map((order) => order.id)).toEqual(["new"]);
    expect(state.total.value).toBe(1);
  });
  it("再来一单先由后端验证，报价失败保留当前购物车", async () => {
    const { state, request, cart, navigate } = controller();
    request.mockResolvedValueOnce({ products: [{ id: "product" }] });
    request.mockRejectedValueOnce(new Error("库存不足"));
    await state.reorder({
      storeId: "store",
      type: "PICKUP",
      items: [{ productId: "product", qty: 3 }],
    } as Order);
    expect(cart.clear).not.toHaveBeenCalled();
    expect(cart.set).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(state.error.value).toBe("库存不足");
  });
  it("目标店为空时直接再次购买，不因其他店的商品弹出替换确认", async () => {
    const { state, request, cart } = controller();
    cart.forStore.mockReturnValueOnce({
      count: 0,
    } as import("./cart").CheckoutCart);
    request
      .mockResolvedValueOnce({ products: [{ id: "p", storeId: "target" }] })
      .mockResolvedValueOnce({ checkoutAllowed: true });
    state
      .actions({
        storeId: "target",
        status: "DONE",
        type: "PICKUP",
        items: [{ productId: "p", qty: 2 }],
      } as Order)
      .at(-1)
      ?.onClick?.();
    await nextTick();
    await nextTick();
    expect(state.replacement.value).toBeUndefined();
    expect(cart.forStore).toHaveBeenCalledWith("target");
    expect(cart.clear).not.toHaveBeenCalled();
    expect(cart.replaceStore).toHaveBeenCalledWith(
      "target",
      [{ product: { id: "p", storeId: "target" }, qty: 2 }],
      "PICKUP",
    );
  });
  it("现有购物车先确认，报价成功后使用最新商品和原数量重新选购", async () => {
    const { state, request, cart, navigate } = controller();
    const order = {
      id: "order",
      status: "DONE",
      review: {},
      storeId: "store",
      type: "PICKUP",
      items: [{ productId: "product", qty: 3 }],
    } as Order;
    state.actions(order).at(-1)?.onClick?.();
    expect(state.replacement.value?.id).toBe("order");
    expect(request).not.toHaveBeenCalled();
    const product = { id: "product", priceCents: 3200 };
    request.mockResolvedValueOnce({ products: [product] });
    request.mockResolvedValueOnce({ payCents: 9600 });
    await state.reorder(order);
    expect(cart.replaceStore).toHaveBeenCalledOnce();
    expect(cart.replaceStore).toHaveBeenCalledWith(
      "store",
      [{ product, qty: 3 }],
      "PICKUP",
    );
    expect(cart.clear).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/store/store");
    expect(state.replacement.value).toBeUndefined();
  });
});
