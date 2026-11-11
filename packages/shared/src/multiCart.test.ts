import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, reactive } from "vue";
import {
  restoreCarts,
  useCartState,
  type CartSnapshot,
  type CheckoutRequest,
} from "./cart";
import type { Product, Quote, Store } from "./index";
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
});
const a = {
  id: "a",
  storeId: "A",
  name: "面",
  dishCategoryId: "main",
} as Product;
const b = { ...a, id: "b", storeId: "B" };
function setup(load: unknown = []) {
  const request = vi
    .fn()
    .mockResolvedValue({ payCents: 1000, items: [], checkoutAllowed: true });
  const save = vi.fn();
  const scope = effectScope();
  scopes.push(scope);
  const carts = reactive(
    scope.run(() =>
      useCartState(request as CheckoutRequest, { load: () => load, save }),
    )!,
  );
  return { carts, request, save, scope };
}
function deferred() {
  let resolve!: (quote: Quote) => void;
  const promise = new Promise<Quote>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
describe("多店购物车隔离", () => {
  it("进入空的 B 店不显示 A，跨店加购不清空 A，清空只影响本店", () => {
    const { carts } = setup();
    const first = carts.forStore("A"),
      second = carts.forStore("B");
    first.set(a, 2);
    expect(second.count).toBe(0);
    second.set(b, 3);
    expect(first.count).toBe(2);
    expect(carts.totalCount).toBe(5);
    second.set(a, 9);
    expect(second.count).toBe(3);
    second.clear();
    expect(first.count).toBe(2);
    expect(carts.totalCount).toBe(2);
  });
  it("每店配送方式、地址、备注和摘要刷新恢复，报价不落盘", async () => {
    const { carts, save } = setup();
    const first = carts.forStore("A"),
      second = carts.forStore("B");
    first.set(a, 1);
    first.type = "PICKUP";
    first.addressId = "address-a";
    first.note = "不辣";
    second.set(b, 2);
    second.addressId = "address-b";
    second.note = "少盐";
    carts.rememberStore({ id: "A", name: "面馆", logo: "/logo" } as Store);
    carts.selectStore("A");
    await first.refresh();
    const saved = JSON.parse(
      JSON.stringify(save.mock.lastCall![0]),
    ) as CartSnapshot;
    expect(JSON.stringify(saved)).not.toContain("payCents");
    const restored = setup(saved).carts;
    expect(restored.resolveStoreId()).toBe("A");
    expect(restored.forStore("A")).toMatchObject({
      type: "PICKUP",
      addressId: "address-a",
      note: "不辣",
      count: 1,
      quote: null,
    });
    expect(restored.forStore("B")).toMatchObject({
      type: "DELIVERY",
      addressId: "address-b",
      note: "少盐",
      count: 2,
    });
    expect(restored.carts.find((entry) => entry.storeId === "A")?.name).toBe(
      "面馆",
    );
  });
  it("删去最后一件后仍持久化该店的配送与地址草稿", () => {
    const { carts, save } = setup();
    const first = carts.forStore("A");
    first.set(a, 1);
    first.type = "PICKUP";
    first.addressId = "address-a";
    first.note = "少盐";
    first.set(a, 0);
    const restored = setup(
      JSON.parse(JSON.stringify(save.mock.lastCall![0])),
    ).carts;
    expect(restored.carts).toHaveLength(0);
    expect(restored.forStore("A")).toMatchObject({
      count: 0,
      type: "PICKUP",
      addressId: "address-a",
      note: "少盐",
    });
  });
  it("迁移旧数组时按店分组，合并重复商品，忽略损坏记录并限制数量", () => {
    const result = restoreCarts([
      null,
      { product: a, qty: 2 },
      { product: b, qty: 4 },
      { product: a, qty: 998 },
      { product: b, qty: -1 },
      { product: {}, qty: 2 },
    ]);
    expect(result.carts).toHaveLength(2);
    expect(result.carts[0].lines[0].qty).toBe(999);
    expect(result.carts[1].lines[0].qty).toBe(4);
    expect(restoreCarts({ version: 99, carts: [] }).carts).toEqual([]);
  });
  it("A 的迟到报价不会覆盖 B，也不会覆盖 A 的较新数量", async () => {
    const { carts, request } = setup();
    const first = carts.forStore("A"),
      second = carts.forStore("B");
    first.set(a, 1);
    second.set(b, 1);
    const old = deferred();
    request.mockReturnValueOnce(old.promise);
    const pending = first.refresh();
    await second.refresh();
    first.set(a, 2);
    await first.refresh();
    old.resolve({ payCents: 99999, items: [] } as unknown as Quote);
    await pending;
    expect(first.quote?.payCents).toBe(1000);
    expect(second.quote?.payCents).toBe(1000);
  });
  it("只原子替换目标店铺，选店与清空后恢复选择不指向另一店的商品", () => {
    const { carts } = setup();
    carts.forStore("A").set(a, 1);
    carts.forStore("B").set(b, 4);
    carts.replaceStore("A", [{ product: a, qty: 3 }], "PICKUP");
    expect(carts.forStore("B").count).toBe(4);
    expect(carts.forStore("A").count).toBe(3);
    expect(carts.resolveStoreId()).toBe("A");
    expect(carts.resolveStoreId("missing")).toBe("missing");
    expect(carts.resolveStoreId("B")).toBe("B");
    expect(carts.resolveStoreId(["A", "B"])).toBe("");
    carts.forStore("A").clear();
    expect(carts.resolveStoreId()).toBe("B");
    expect(carts.forStore("missing").count).toBe(0);
  });
  it("存储失败不影响多店操作，销毁后报价不可写回", async () => {
    const { carts, request, scope } = setup();
    carts.forStore("A").set(a, 1);
    const pending = deferred();
    request.mockReturnValueOnce(pending.promise);
    const refreshing = carts.forStore("A").refresh();
    scope.stop();
    pending.resolve({ payCents: 500 } as Quote);
    await refreshing;
    expect(carts.forStore("A").quote).toBeNull();
  });
});
