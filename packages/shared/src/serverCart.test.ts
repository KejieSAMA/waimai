import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useAccountCart, type GuestCartStorage } from "./serverCart";
import type { CartSnapshot, StoredCart, CheckoutRequest } from "./cart";
import type { Account, Product } from "./index";
const product = {
  id: "p",
  storeId: "s",
  dishCategoryId: "c",
  name: "面",
  images: "[]",
  priceCents: 1000,
  stock: 100,
  limitPerOrder: null,
  status: "ON",
  displayStatus: "ON",
} as Product;
const user = (id: string): Account => ({
  id,
  name: id,
  phone: "",
  role: "USER",
  roles: ["USER"],
});
const row = (qty = 1, revision = 1): StoredCart => ({
  storeId: "s",
  revision,
  type: "PICKUP",
  addressId: "own-address",
  note: "账号备注",
  name: "店",
  logo: "",
  updatedAt: revision,
  lines: qty ? [{ product, qty }] : [],
});
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
});
async function flush() {
  for (let i = 0; i < 30; i++) {
    await Promise.resolve();
    await nextTick();
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { resolve, reject, promise };
}
function setup(initialAccount?: string, initialGuest?: unknown) {
  const identity = ref<{
    account?: Account;
    role?: "USER" | "ADMIN";
    revision: number;
  }>({
    account: initialAccount ? user(initialAccount) : undefined,
    role: initialAccount ? "USER" : undefined,
    revision: 0,
  });
  const cloud = new Map<string, StoredCart[]>([
    ["A", [row(2)]],
    ["B", [{ ...row(4), note: "B备注" }]],
  ]);
  let saved = initialGuest,
    serial = 0;
  const storage: GuestCartStorage = {
    load: () => copy(saved ?? null),
    save: vi.fn((value) => {
      saved = copy(value);
    }),
    newId: () => "guest_nonce_" + String(++serial).padStart(16, "0"),
  };
  const receipts = new Set<string>();
  const request = vi.fn(
    async (
      path: string,
      options?: { method?: string; body?: unknown },
    ): Promise<unknown> => {
      const id = identity.value.account?.id ?? "guest";
      if (path === "/user/cart")
        return { version: 2, carts: copy(cloud.get(id) ?? []) };
      if (path === "/user/cart/merge") {
        const input = options!.body as {
          guestId: string;
          carts: {
            storeId: string;
            type: string;
            note: string;
            items: { productId: string; qty: number }[];
          }[];
        };
        if (!receipts.has(input.guestId)) {
          receipts.add(input.guestId);
          const next = copy(cloud.get(id) ?? []);
          for (const draft of input.carts) {
            const old = next.find((item) => item.storeId === draft.storeId);
            if (old) {
              old.lines[0].qty += draft.items[0].qty;
              old.revision!++;
            } else
              next.push({
                ...row(draft.items[0].qty),
                storeId: draft.storeId,
                note: draft.note,
              });
          }
          cloud.set(id, next);
        }
        return {
          snapshot: { version: 2, carts: copy(cloud.get(id) ?? []) },
          issues: [],
        };
      }
      if (path.startsWith("/user/cart/")) {
        const storeId = decodeURIComponent(path.slice("/user/cart/".length));
        const input = options!.body as {
          revision: number;
          items: { productId: string; qty: number }[];
          type: "PICKUP";
          note: string;
          addressId: string;
        };
        const carts = copy(cloud.get(id) ?? []),
          old = carts.find((item) => item.storeId === storeId);
        if ((old?.revision ?? 0) !== input.revision)
          throw Object.assign(new Error("购物车已更新"), { code: 409 });
        const updated = {
          ...row(0, input.revision + 1),
          storeId,
          type: input.type,
          note: input.note,
          addressId: input.addressId,
          lines: input.items.map((item) => ({
            product: { ...product, id: item.productId, storeId },
            qty: item.qty,
          })),
        };
        cloud.set(
          id,
          carts.filter((item) => item.storeId !== storeId).concat(updated),
        );
        return updated;
      }
      return { payCents: 1000, items: [] };
    },
  );
  const scope = effectScope();
  scopes.push(scope);
  const cart = scope.run(() =>
    useAccountCart(request as CheckoutRequest, storage, identity),
  )!;
  return {
    cart,
    identity,
    cloud,
    request,
    storage,
    scope,
    get saved() {
      return saved;
    },
  };
}
describe("游客与账号购物车", () => {
  it("进入结算时没有待保存修改，不会阻塞之后的数量和备注保存", async () => {
    const s = setup("A");
    await flush();
    expect(await s.cart.ensureSaved()).toBe(true);
    s.cart.forStore("s").set(product, 5);
    await flush();
    s.cart.forStore("s").note = "新的备注";
    await flush();
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(5);
    expect(s.cloud.get("A")![0].note).toBe("新的备注");
    expect(await s.cart.ensureSaved()).toBe(true);
  });
  it("保存期间改回原数量仍保存最后意图，不被已发出的加购覆盖", async () => {
    const s = setup("A");
    await flush();
    const delayed = deferred<StoredCart>();
    s.request.mockReturnValueOnce(delayed.promise);
    const cart = s.cart.forStore("s");
    cart.set(product, 3);
    cart.set(product, 2);
    s.cloud.set("A", [row(3, 2)]);
    delayed.resolve(row(3, 2));
    await flush();
    expect(cart.count).toBe(2);
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(2);
    expect(await s.cart.ensureSaved()).toBe(true);
  });
  it("登录前重新读取其他游客页面保存的商品", async () => {
    const s = setup();
    s.storage.save({
      version: 1,
      guestId: "another_guest_nonce_001",
      snapshot: { version: 2, carts: [row(5)] },
    });
    s.identity.value = { account: user("A"), role: "USER", revision: 1 };
    await flush();
    expect(s.cart.forStore("s").count).toBe(7);
  });
  it("迟到读取不能覆盖读取期间的新编辑；冲突后读取失败可重试恢复", async () => {
    const s = setup("A");
    await flush();
    const late = deferred<CartSnapshot>();
    s.request.mockReturnValueOnce(late.promise);
    const reading = s.cart.synchronize();
    s.cart.forStore("s").set(product, 6);
    await flush();
    late.resolve({ version: 2, carts: [row(2)] });
    await reading;
    expect(s.cart.forStore("s").count).toBe(6);
    s.cloud.set("A", [row(8, 3)]);
    s.request
      .mockRejectedValueOnce(Object.assign(new Error("冲突"), { code: 409 }))
      .mockRejectedValueOnce(new Error("读取失败"));
    s.cart.forStore("s").set(product, 7);
    await flush();
    expect(s.cart.syncError.value).toBe("读取失败");
    await s.cart.retry();
    expect(s.cart.forStore("s").count).toBe(8);
    expect(s.cart.syncError.value).toBe("");
  });
  it("游客仅本地保存、刷新恢复；登录自动合并且不覆盖账号结算信息，退出不泄漏账号数据", async () => {
    const s = setup();
    s.cart.forStore("s").set(product, 3);
    await flush();
    expect(s.request).not.toHaveBeenCalled();
    const guest = s.saved as {
      version: 1;
      guestId: string;
      snapshot: CartSnapshot;
    };
    expect(guest.snapshot.carts[0].lines[0].qty).toBe(3);
    const restored = setup(undefined, guest);
    expect(restored.cart.forStore("s").count).toBe(3);
    s.identity.value = { account: user("A"), role: "USER", revision: 1 };
    await flush();
    expect(s.cart.forStore("s").count).toBe(5);
    expect(s.cart.forStore("s").note).toBe("账号备注");
    expect(s.cart.forStore("s").addressId).toBe("own-address");
    expect((s.saved as typeof guest).snapshot.carts).toEqual([]);
    s.identity.value = { revision: 2 };
    await flush();
    expect(s.cart.totalCount.value).toBe(0);
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(5);
  });
  it("登录态只写服务器；快点加购按顺序保存，焦点同步不覆盖未保存编辑", async () => {
    const s = setup("A");
    await flush();
    const cart = s.cart.forStore("s");
    const localWrites = vi.mocked(s.storage.save).mock.calls.length;
    const pending = deferred<StoredCart>();
    s.request.mockReturnValueOnce(pending.promise);
    cart.set(product, 3);
    cart.set(product, 4);
    cart.note = "新备注";
    const syncing = s.cart.synchronize();
    s.cloud.set("A", [row(3, 2)]);
    pending.resolve(row(3, 2));
    await syncing;
    await flush();
    const writes = s.request.mock.calls.filter(
      ([path, options]) =>
        path.startsWith("/user/cart/") && options?.method === "PUT",
    );
    expect(
      (writes[0][1]!.body as { items: { qty: number }[] }).items[0].qty,
    ).toBe(3);
    expect(
      (writes[1][1]!.body as { items: { qty: number }[] }).items[0].qty,
    ).toBe(4);
    expect(cart.count).toBe(4);
    expect(s.cloud.get("A")![0].note).toBe("新备注");
    expect(vi.mocked(s.storage.save).mock.calls).toHaveLength(localWrites);
  });
  it("多设备版本冲突刷新并提示，不自动用旧整车覆盖新内容", async () => {
    const s = setup("A");
    await flush();
    s.cloud.set("A", [{ ...row(8, 2), note: "另一设备" }]);
    s.cart.forStore("s").set(product, 3);
    await flush();
    expect(s.cart.forStore("s").count).toBe(8);
    expect(s.cart.forStore("s").note).toBe("另一设备");
    expect(s.cart.notice.value).toContain("重新读取");
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(8);
  });
  it("进入或切回时读取服务端最新数据，登录和退出互不串车", async () => {
    const s = setup("A");
    await flush();
    s.cloud.set("A", [row(7, 2)]);
    await s.cart.synchronize();
    expect(s.cart.forStore("s").count).toBe(7);
    s.identity.value = { account: user("B"), role: "USER", revision: 1 };
    expect(s.cart.totalCount.value).toBe(0);
    await flush();
    expect(s.cart.forStore("s").count).toBe(4);
    expect(s.cart.forStore("s").note).toBe("B备注");
    s.identity.value = {
      account: { ...user("B"), role: "ADMIN" },
      role: "ADMIN",
      revision: 2,
    };
    await flush();
    s.cart.forStore("s").set(product, 9);
    expect(s.cart.totalCount.value).toBe(0);
    expect(s.cart.notice.value).toContain("用户身份");
  });
  it("保存失败保留内存草稿并禁止下单，重试成功后恢复", async () => {
    const s = setup("A");
    await flush();
    s.request.mockRejectedValueOnce(new Error("断网"));
    const cart = s.cart.forStore("s");
    cart.set(product, 6);
    await flush();
    expect(cart.count).toBe(6);
    expect(s.cart.syncError.value).toBe("断网");
    expect(await s.cart.ensureSaved()).toBe(false);
    await s.cart.retry();
    expect(s.cart.syncError.value).toBe("");
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(6);
  });
  it("账号切换时丢弃迟到加载和保存响应，不触碰另一账号草稿", async () => {
    const s = setup("A");
    await flush();
    const late = deferred<StoredCart>();
    s.request.mockReturnValueOnce(late.promise);
    s.cart.forStore("s").set(product, 5);
    s.identity.value = { account: user("B"), role: "USER", revision: 1 };
    await flush();
    late.resolve(row(5, 2));
    await flush();
    expect(s.cart.forStore("s").count).toBe(4);
    const delayed = deferred<CartSnapshot>();
    s.request.mockReturnValueOnce(delayed.promise);
    const refresh = s.cart.synchronize();
    s.identity.value = { revision: 2 };
    delayed.resolve({ version: 2, carts: [row(99)] });
    await refresh;
    expect(s.cart.totalCount.value).toBe(0);
  });
  it("合并响应丢失后保留游客副本与相同幂等标识，不重复累加", async () => {
    const s = setup();
    s.cart.forStore("s").set(product, 3);
    const guest = s.saved;
    const normal = s.request.getMockImplementation()!;
    let failed = false;
    s.request.mockImplementation(async (path, options) => {
      const result = await normal(path, options);
      if (path === "/user/cart/merge" && !failed) {
        failed = true;
        throw new Error("合并响应丢失");
      }
      return result;
    });
    s.identity.value = { account: user("A"), role: "USER", revision: 1 };
    await flush();
    expect(s.cart.ready.value).toBe(false);
    expect(s.saved).toEqual(guest);
    await s.cart.retry();
    expect(s.cart.forStore("s").count).toBe(5);
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(5);
    const merges = s.request.mock.calls.filter(
      ([path]) => path === "/user/cart/merge",
    );
    expect(merges[0][1]!.body).toEqual(merges[1][1]!.body);
  });
  it("下单确认只清理匹配版本，不清掉之后新增内容或另一店", async () => {
    const s = setup("A");
    await flush();
    const cart = s.cart.forStore("s");
    s.cloud.set("A", [row(0, 2)]);
    await cart.acknowledgeOrder!(1);
    expect(cart.count).toBe(0);
    cart.set(product, 3);
    await flush();
    expect(s.cloud.get("A")![0].lines[0].qty).toBe(3);
    await cart.acknowledgeOrder!(1);
    expect(cart.count).toBe(3);
  });
  it("卸载后忽略迟到请求，旧本地结构不导入账号", async () => {
    const s = setup(undefined, { version: 2, carts: [row(9)] });
    expect(s.cart.totalCount.value).toBe(0);
    const late = deferred<CartSnapshot>();
    s.request.mockReturnValueOnce(late.promise);
    s.identity.value = { account: user("A"), role: "USER", revision: 1 };
    s.scope.stop();
    late.resolve({ version: 2, carts: [row(9)] });
    await flush();
    expect(s.cart.totalCount.value).toBe(0);
  });
});
