import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, reactive } from "vue";
import { useCartState, type CheckoutRequest } from "./cart";
import { chooseCheckoutAddress, useCheckout } from "./checkout";
import type { Address, Product, Quote, Store } from "./index";
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
const product: Product = {
  id: "dish-1",
  storeId: "store-1",
  dishCategoryId: "category-1",
  name: "牛肉面",
  description: "",
  images: "[]",
  priceCents: 2800,
  originalPriceCents: null,
  stock: 100,
  lowStock: 5,
  limitPerOrder: null,
  status: "ON",
  displayStatus: "ON",
  forcedOff: false,
  rejectReason: null,
  monthlySales: 0,
};
const defaultAddress: Address = {
  id: "address-1",
  contact: "王先生",
  phone: "13900000001",
  detail: "望京 1 号",
  isDefault: true,
};
const otherAddress: Address = {
  ...defaultAddress,
  id: "address-2",
  detail: "望京 2 号",
  isDefault: false,
};
const initialQuote: Quote = {
  quoteFingerprint: "server-quote-fingerprint",
  minOrderCents: 2000,
  shortfallCents: 0,
  checkoutAllowed: true,
  itemsCents: 2800,
  deliveryFeeCents: 300,
  discountCents: 0,
  payCents: 3100,
  count: 1,
  items: [
    {
      productId: product.id,
      name: product.name,
      qty: 1,
      priceCents: 2800,
      lineTotalCents: 2800,
    },
  ],
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function flush() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await nextTick();
  }
}
function setup() {
  const server = {
    store: {
      id: "store-1",
      name: "面馆",
      status: "OPEN",
      products: [product],
    } as Store,
    addresses: [defaultAddress, otherAddress],
    quote: structuredClone(initialQuote),
    addressError: null as Error | null,
    saved: { ...otherAddress, id: "address-new" },
    saveError: null as Error | null,
    orderError: null as Error | null,
    orderWait: undefined as Promise<unknown> | undefined,
    recoveredOrder: undefined as { id: string } | undefined,
  };
  const request = vi.fn(
    async (
      path: string,
      options?: { method?: string; body?: unknown },
    ): Promise<unknown> => {
      if (path.startsWith("/public/stores/")) return server.store;
      if (path === "/user/orders/preview") return server.quote;
      if (path.startsWith("/user/addresses")) {
        if (options?.method) {
          if (server.saveError) throw server.saveError;
          return server.saved;
        }
        if (server.addressError) throw server.addressError;
        return server.addresses;
      }
      if (path === "/user/orders") {
        if (server.orderError) throw server.orderError;
        return server.orderWait ?? { id: "order-1" };
      }
      if (path.startsWith("/user/orders?requestId="))
        return {
          list: server.recoveredOrder ? [server.recoveredOrder] : [],
          total: server.recoveredOrder ? 1 : 0,
        };
      throw new Error("Unexpected request: " + path);
    },
  );
  const cartScope = effectScope();
  scopes.push(cartScope);
  const carts = reactive(
    cartScope.run(() =>
      useCartState(request as CheckoutRequest, {
        load: () => [{ product, qty: 1 }],
        save: vi.fn(),
      }),
    )!,
  );
  const cart = carts.forStore("store-1");
  const scope = effectScope();
  scopes.push(scope);
  const navigate = vi.fn().mockResolvedValue(undefined);
  const state = scope.run(() =>
    useCheckout(request as CheckoutRequest, cart, navigate),
  )!;
  const orderCalls = () =>
    request.mock.calls.filter(([path]) => path === "/user/orders");
  return { server, request, carts, cart, state, scope, navigate, orderCalls };
}
describe("结算地址", () => {
  it("购物车同步失败仍加载店铺和地址，重试后可继续结算", async () => {
    const { state, cart } = setup();
    cart.ensureSaved = vi.fn().mockResolvedValue(false);
    cart.syncError = "同步失败";
    await state.initialize();
    expect(state.store.value?.id).toBe("store-1");
    expect(state.selectedAddress.value?.id).toBe(defaultAddress.id);
    expect(state.canSubmit.value).toBe(false);
    cart.syncError = "";
    expect(state.canSubmit.value).toBe(true);
  });
  it("优先保留当前地址，缺失后回退默认、首项或空值", () => {
    expect(
      chooseCheckoutAddress([defaultAddress, otherAddress], otherAddress.id),
    ).toBe(otherAddress.id);
    expect(
      chooseCheckoutAddress([defaultAddress, otherAddress], "deleted"),
    ).toBe(defaultAddress.id);
    expect(chooseCheckoutAddress([otherAddress], "deleted")).toBe(
      otherAddress.id,
    );
    expect(chooseCheckoutAddress([], "deleted")).toBe("");
  });
  it("刷新列表不覆盖手动选择，配送与自提切换保留地址并重新报价", async () => {
    const { state, cart, request } = setup();
    cart.addressId = otherAddress.id;
    await state.initialize();
    await state.loadAddresses();
    expect(cart.addressId).toBe(otherAddress.id);
    cart.type = "PICKUP";
    await flush();
    expect(
      request.mock.calls
        .filter(([path]) => path === "/user/orders/preview")
        .at(-1)?.[1]?.body,
    ).toMatchObject({ type: "PICKUP" });
    expect(cart.addressId).toBe(otherAddress.id);
    cart.type = "DELIVERY";
    await flush();
    expect(state.selectedAddress.value?.id).toBe(otherAddress.id);
    expect(state.canSubmit.value).toBe(true);
  });
  it("新建后选中返回的地址，不擅自改变默认地址", async () => {
    const { state, cart, request } = setup();
    await state.initialize();
    state.selectorOpen.value = true;
    state.editAddress();
    await state.saveAddress({
      contact: "王先生",
      phone: "13900000001",
      detail: "望京 3 号",
      isDefault: false,
    });
    expect(cart.addressId).toBe("address-new");
    expect(
      state.addresses.value.find((a) => a.id === defaultAddress.id)?.isDefault,
    ).toBe(true);
    expect(state.editorOpen.value).toBe(false);
    expect(state.selectorOpen.value).toBe(false);
    expect(request).toHaveBeenCalledWith("/user/addresses", {
      method: "POST",
      body: {
        contact: "王先生",
        phone: "13900000001",
        detail: "望京 3 号",
        isDefault: false,
      },
    });
  });
  it("取消编辑不改变选择，失败保留编辑状态供重试", async () => {
    const { server, state, cart } = setup();
    await state.initialize();
    state.editAddress(otherAddress);
    state.editorOpen.value = false;
    expect(cart.addressId).toBe(defaultAddress.id);
    state.editAddress(otherAddress);
    server.saveError = new Error("保存失败");
    await state.saveAddress(otherAddress);
    expect(state.editorOpen.value).toBe(true);
    expect(state.addressSaveError.value).toBe("保存失败");
    expect(cart.addressId).toBe(defaultAddress.id);
    expect(state.addressSaving.value).toBe(false);
  });
  it("地址加载失败时配送不可提交，自提不依赖地址，重试可恢复", async () => {
    const { server, state, cart } = setup();
    server.addressError = new Error("地址加载失败");
    await state.initialize();
    expect(state.canSubmit.value).toBe(false);
    cart.type = "PICKUP";
    await flush();
    expect(state.canSubmit.value).toBe(true);
    cart.type = "DELIVERY";
    await flush();
    expect(state.canSubmit.value).toBe(false);
    server.addressError = null;
    await state.loadAddresses();
    await flush();
    expect(state.canSubmit.value).toBe(true);
  });
});

describe("服务端购物车结算", () => {
  it("提交前保存购物车，携带版本和幂等标识，由服务端清车而非本地无条件清空", async () => {
    const { cart, state, orderCalls } = setup();
    cart.ensureSaved = vi.fn().mockResolvedValue(true);
    cart.cartRevision = 2;
    cart.ownerVersion = "A";
    cart.newRequestId = () => "checkout_request_123456";
    cart.acknowledgeOrder = vi.fn().mockResolvedValue(undefined);
    await state.initialize();
    await state.submit();
    expect(orderCalls()[0][1]?.body).toMatchObject({
      cartRevision: 2,
      requestId: "checkout_request_123456",
    });
    expect(cart.acknowledgeOrder).toHaveBeenCalledWith(2);
    expect(cart.count).toBe(1);
  });
  it("创建响应丢失后只查询原请求，不自动重新创建订单", async () => {
    const { cart, state, server, navigate, orderCalls } = setup();
    cart.ensureSaved = vi.fn().mockResolvedValue(true);
    cart.cartRevision = 2;
    cart.ownerVersion = "A";
    cart.newRequestId = () => "checkout_lost_response_123";
    cart.acknowledgeOrder = vi.fn().mockResolvedValue(undefined);
    await state.initialize();
    server.orderError = new Error("网络中断");
    server.recoveredOrder = { id: "recovered-order" };
    await state.submit();
    expect(orderCalls()).toHaveLength(1);
    expect(state.createdOrderId.value).toBe("recovered-order");
    expect(navigate).toHaveBeenCalledWith("/orders/recovered-order");
  });
  it("下单期间切换账号，不触碰新账号购物车", async () => {
    const { cart, state, server } = setup();
    cart.ensureSaved = vi.fn().mockResolvedValue(true);
    cart.cartRevision = 2;
    cart.ownerVersion = "A";
    cart.newRequestId = () => "checkout_account_switch_123";
    cart.acknowledgeOrder = vi.fn().mockResolvedValue(undefined);
    await state.initialize();
    const wait = deferred<{ id: string }>();
    server.orderWait = wait.promise;
    const pending = state.submit();
    await flush();
    cart.ownerVersion = "B";
    wait.resolve({ id: "old-account-order" });
    await pending;
    expect(cart.acknowledgeOrder).not.toHaveBeenCalled();
    expect(cart.count).toBe(1);
  });
});
describe("可编辑清单与提交", () => {
  it("创建阶段发现报价变化时只更新金额，不重建、不清车，携带服务端指纹", async () => {
    const { state, cart, server, orderCalls } = setup();
    await state.initialize();
    server.orderError = Object.assign(new Error("变化"), {
      details: { reason: "QUOTE_CHANGED" },
    });
    await state.submit();
    expect(orderCalls()).toHaveLength(1);
    expect(orderCalls()[0][1]?.body).toMatchObject({
      quoteFingerprint: "server-quote-fingerprint",
    });
    expect(cart.count).toBe(1);
    expect(state.notice.value).toContain("金额已更新");
    server.orderError = null;
    await state.submit();
    expect(orderCalls()).toHaveLength(2);
    expect(cart.count).toBe(0);
  });

  it("调整数量和移除保留备注及店铺入口，空车取消提交", async () => {
    const { state, cart } = setup();
    await state.initialize();
    cart.note = "不要香菜";
    state.quantity(cart.lines[0], 2);
    expect(cart.lines[0].qty).toBe(2);
    expect(cart.quotePending).toBe(true);
    expect(state.canSubmit.value).toBe(false);
    state.quantity(cart.lines[0], 0);
    await flush();
    expect(cart.lines).toHaveLength(0);
    expect(cart.quote).toBeNull();
    expect(cart.note).toBe("不要香菜");
    expect(state.shopPath.value).toBe("/store/store-1");
    expect(state.canSubmit.value).toBe(false);
  });
  it.each(["stock", "missing", "limit", "closed"])(
    "%s 问题保留商品并阻止提交",
    async (problem) => {
      const { server, state, cart } = setup();
      if (problem === "stock")
        server.store = {
          ...server.store,
          products: [{ ...product, stock: 0 }],
        };
      if (problem === "missing")
        server.store = { ...server.store, products: [] };
      if (problem === "limit") {
        cart.set(product, 2);
        server.store = {
          ...server.store,
          products: [{ ...product, limitPerOrder: 1 }],
        };
      }
      if (problem === "closed")
        server.store = { ...server.store, status: "CLOSED" };
      await state.initialize();
      expect(cart.lines).toHaveLength(1);
      expect(state.canSubmit.value).toBe(false);
      expect(
        problem === "closed"
          ? state.storeIssue.value
          : state.itemIssue(cart.lines[0]),
      ).not.toBe("");
    },
  );
  it("A 提交成功只清空 A，切换结算选择不会影响 B 或提交目标", async () => {
    const { state, cart, carts, server, request } = setup();
    const other = { ...product, id: "other", storeId: "store-2" };
    carts.forStore("store-2").set(other, 4);
    carts.forStore("store-2").note = "B 的备注";
    await state.initialize();
    const pending = deferred<{ id: string }>();
    server.orderWait = pending.promise;
    const submit = state.submit();
    await flush();
    carts.selectStore("store-2");
    pending.resolve({ id: "order-a" });
    await submit;
    expect(cart.count).toBe(0);
    expect(carts.forStore("store-2")).toMatchObject({
      count: 4,
      note: "B 的备注",
    });
    expect(
      request.mock.calls.find(([path]) => path === "/user/orders")?.[1]?.body,
    ).toMatchObject({ storeId: "store-1" });
  });
  it("低于起送价时禁止提交，即使预览返回完整金额", async () => {
    const { server, state, orderCalls } = setup();
    server.quote = {
      ...initialQuote,
      shortfallCents: 200,
      checkoutAllowed: false,
    };
    await state.initialize();
    expect(state.canSubmit.value).toBe(false);
    await state.submit();
    expect(orderCalls()).toHaveLength(0);
  });
  it("提交前金额变化只更新报价，用户再次确认后才创建订单", async () => {
    const { server, state, cart, orderCalls, request } = setup();
    await state.initialize();
    server.quote = {
      ...initialQuote,
      itemsCents: 3000,
      payCents: 3300,
      items: [
        { ...initialQuote.items[0], priceCents: 3000, lineTotalCents: 3000 },
      ],
    };
    await state.submit();
    expect(orderCalls()).toHaveLength(0);
    expect(state.notice.value).toContain("金额已更新");
    expect(cart.quote?.payCents).toBe(3300);
    expect(cart.count).toBe(1);
    await state.submit();
    expect(orderCalls()).toHaveLength(1);
    expect(cart.lines).toHaveLength(0);
    expect(request.mock.calls.some(([path]) => path.endsWith("/pay"))).toBe(
      false,
    );
  });
  it("整个复核与提交期间互斥，重复点击只创建一次", async () => {
    const { state, cart, request, server, orderCalls } = setup();
    await state.initialize();
    const pending = deferred<Store>();
    request.mockReturnValueOnce(pending.promise);
    const first = state.submit();
    expect(state.submitting.value).toBe(true);
    state.quantity(cart.lines[0], 2);
    expect(cart.lines[0].qty).toBe(1);
    await state.submit();
    pending.resolve(server.store);
    await first;
    expect(orderCalls()).toHaveLength(1);
    expect(state.createdOrderId.value).toBe("order-1");
  });
  it("创建失败保留输入和清单，不自动重试", async () => {
    const { server, state, cart, orderCalls } = setup();
    await state.initialize();
    cart.note = "少放辣椒";
    state.selectAddress(otherAddress.id);
    await flush();
    server.orderError = new Error("库存发生变化，请重新下单");
    await state.submit();
    expect(orderCalls()).toHaveLength(1);
    expect(cart.count).toBe(1);
    expect(cart.note).toBe("少放辣椒");
    expect(cart.addressId).toBe(otherAddress.id);
    expect(state.submitError.value).toContain("库存发生变化");
    expect(state.submitting.value).toBe(false);
  });
  it("创建后跳转失败保留订单入口，重试导航不重新创建", async () => {
    const { state, cart, navigate, orderCalls } = setup();
    await state.initialize();
    navigate.mockRejectedValueOnce(new Error("路由失败"));
    await state.submit();
    expect(state.createdOrderId.value).toBe("order-1");
    expect(cart.lines).toHaveLength(0);
    expect(state.submitError.value).toContain("订单已创建");
    await state.submit();
    await state.viewOrder();
    expect(orderCalls()).toHaveLength(1);
    expect(navigate).toHaveBeenLastCalledWith("/orders/order-1");
    expect(navigate).toHaveBeenCalledTimes(2);
  });
  it("离开后返回的创建响应不会清空用户已修改的新购物车或强行导航", async () => {
    const { server, state, cart, scope, navigate } = setup();
    await state.initialize();
    const pending = deferred<{ id: string }>();
    server.orderWait = pending.promise;
    const submit = state.submit();
    await flush();
    scope.stop();
    cart.set(product, 2);
    pending.resolve({ id: "order-1" });
    await submit;
    expect(cart.lines[0].qty).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });
});
