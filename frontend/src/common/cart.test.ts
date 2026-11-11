import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import type { Product, Quote } from "@waimai/shared";
import { api } from "./api";
import { useCart } from "./cart";

vi.mock("./api", () => ({ api: vi.fn() }));
const preview = vi.mocked(api);
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
const firstQuote: Quote = {
  itemsCents: 2800,
  deliveryFeeCents: 300,
  discountCents: 0,
  payCents: 3100,
  count: 1,
  items: [
    {
      productId: "dish-1",
      name: "牛肉面",
      qty: 1,
      priceCents: 2800,
      lineTotalCents: 2800,
    },
  ],
};
const secondQuote: Quote = {
  itemsCents: 5600,
  deliveryFeeCents: 300,
  discountCents: 500,
  payCents: 5400,
  count: 2,
  items: [
    {
      productId: "dish-1",
      name: "牛肉面",
      qty: 2,
      priceCents: 2800,
      lineTotalCents: 5600,
    },
  ],
};

function deferredQuote() {
  let resolve!: (value: Quote) => void;
  const promise = new Promise<Quote>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function pricedCart() {
  const cart = useCart();
  cart.set(product, 1);
  preview.mockResolvedValueOnce(firstQuote);
  await cart.refresh();
  return cart;
}

beforeEach(() => {
  setActivePinia(createPinia());
  preview.mockReset();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});
afterEach(async () => {
  await nextTick();
  vi.unstubAllGlobals();
});

describe("购物车报价更新", () => {
  it("修改数量和等待新报价期间保留金额，完成后一次更新", async () => {
    const cart = await pricedCart();
    const pending = deferredQuote();
    preview.mockReturnValueOnce(pending.promise);
    cart.set(product, 2);
    expect(cart.quote).toEqual(firstQuote);
    expect(cart.quotePending).toBe(true);
    const refresh = cart.refresh();
    expect(cart.quote).toEqual(firstQuote);
    pending.resolve(secondQuote);
    await refresh;
    expect(cart.quote).toEqual(secondQuote);
    expect(cart.quotePending).toBe(false);
  });

  it("修改已有商品数量时保留购物车顺序", () => {
    const cart = useCart();
    cart.set(product, 1);
    cart.set({ ...product, id: "dish-2" }, 1);
    cart.set(product, 3);
    expect(cart.lines.map((line) => line.product.id)).toEqual([
      "dish-1",
      "dish-2",
    ]);
    expect(cart.lines[0].qty).toBe(3);
  });

  it("较早请求返回时保持最新请求的等待状态", async () => {
    const cart = await pricedCart();
    const older = deferredQuote(),
      newer = deferredQuote();
    preview
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const oldRefresh = cart.refresh();
    cart.set(product, 2);
    const newRefresh = cart.refresh();
    older.resolve(firstQuote);
    await oldRefresh;
    expect(cart.quotePending).toBe(true);
    newer.resolve(secondQuote);
    await newRefresh;
    expect(cart.quote).toEqual(secondQuote);
    expect(cart.quotePending).toBe(false);
  });

  it("清空购物车后忽略尚未返回的报价", async () => {
    const cart = await pricedCart();
    const pending = deferredQuote();
    preview.mockReturnValueOnce(pending.promise);
    const refresh = cart.refresh();
    cart.clear();
    pending.resolve(secondQuote);
    await refresh;
    expect(cart.quote).toBeNull();
    expect(cart.quotePending).toBe(false);
    expect(cart.quoteError).toBe("");
  });

  it("切换店铺时清除之前店铺的金额", async () => {
    const cart = await pricedCart();
    cart.set({ ...product, id: "dish-3", storeId: "store-2" }, 1);
    expect(cart.quote).toBeNull();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].product.storeId).toBe("store-2");
  });

  it("报价失败后清除失效金额并结束等待状态", async () => {
    const cart = await pricedCart();
    preview.mockRejectedValueOnce(new Error("库存不足"));
    cart.set(product, 2);
    await cart.refresh();
    expect(cart.quote).toBeNull();
    expect(cart.quoteError).toBe("库存不足");
    expect(cart.quotePending).toBe(false);
  });
});
