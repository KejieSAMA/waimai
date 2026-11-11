import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, reactive } from "vue";
import { useCartState, type CheckoutCart, type CheckoutRequest } from "./cart";
import type { Product, Quote } from "./index";
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
const product = { id: "dish", storeId: "store", name: "面" } as Product;
const quote = { payCents: 3100, items: [] } as unknown as Quote;
function setup() {
  const request = vi.fn().mockResolvedValue(quote);
  const scope = effectScope();
  scopes.push(scope);
  const cart = reactive(
    scope.run(() =>
      useCartState(request as CheckoutRequest, {
        load: () => [],
        save: vi.fn(),
      }),
    )!,
  ).forStore("store") as CheckoutCart;
  return { cart, request, scope };
}
describe("两端共用购物车状态", () => {
  it("配送方式与地址变化立即阻止旧报价提交，等待时保留金额", async () => {
    const { cart, request } = setup();
    cart.set(product, 1);
    await cart.refresh();
    let finish!: (value: Quote) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const old = cart.refresh();
    cart.type = "PICKUP";
    expect(cart.quotePending).toBe(true);
    expect(cart.quote?.payCents).toBe(3100);
    await cart.refresh();
    finish({ ...quote, payCents: 9999 });
    await old;
    expect(cart.quote?.payCents).toBe(3100);
    expect(cart.quotePending).toBe(false);
    cart.addressId = "address";
    expect(cart.quotePending).toBe(true);
  });
  it("备注不触发重新报价，拒绝其他店的商品，清空本店清除备注", async () => {
    const { cart } = setup();
    cart.set(product, 1);
    await cart.refresh();
    cart.note = "不要香菜";
    expect(cart.quotePending).toBe(false);
    cart.set(product, 0);
    expect(cart.note).toBe("不要香菜");
    expect(cart.lastStoreId).toBe("store");
    cart.set({ ...product, id: "second", storeId: "other" }, 1);
    expect(cart.note).toBe("不要香菜");
    expect(cart.lines).toHaveLength(0);
    cart.note = "少辣";
    cart.clear();
    expect(cart.note).toBe("");
    expect(cart.quote).toBeNull();
  });
  it("持久化不可用时仍可操作，卸载后忽略未完成报价", async () => {
    const request = vi.fn();
    const scope = effectScope();
    scopes.push(scope);
    const cart = reactive(
      scope.run(() =>
        useCartState(request as CheckoutRequest, {
          load: () => {
            throw new Error("不可用");
          },
          save: () => {
            throw new Error("不可用");
          },
        }),
      )!,
    ).forStore("store") as CheckoutCart;
    cart.set(product, 1);
    let finish!: (value: Quote) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const loading = cart.refresh();
    scope.stop();
    finish(quote);
    await loading;
    expect(cart.quote).toBeNull();
  });
});
