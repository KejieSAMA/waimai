import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import {
  useCartState,
  restoreCarts,
  type CartSnapshot,
  type CheckoutRequest,
  type StoredCart,
  type CheckoutCart,
} from "./cart";
import type { Account, Role } from "./index";

export interface GuestCartStorage {
  load(): unknown;
  save(value: unknown): void;
  newId(): string;
}
interface GuestCart {
  version: 1;
  guestId: string;
  snapshot: CartSnapshot;
}
interface Identity {
  account?: Account;
  role?: Role;
  revision: number;
}
const empty = (): CartSnapshot => ({ version: 2, carts: [] });
const body = (entry: StoredCart) => ({
  type: entry.type,
  addressId: entry.addressId,
  note: entry.note,
  items: entry.lines
    .map((line) => ({ productId: line.product.id, qty: line.qty }))
    .sort((a, b) => a.productId.localeCompare(b.productId)),
});
const signature = (entry: StoredCart) => JSON.stringify(body(entry));
const blank = (id: string): StoredCart => ({
  storeId: id,
  lines: [],
  type: "DELIVERY",
  addressId: "",
  note: "",
  name: "",
  logo: "",
  updatedAt: 0,
  revision: 0,
});

export function useAccountCart(
  request: CheckoutRequest,
  storage: GuestCartStorage,
  identity: Readonly<Ref<Identity>>,
) {
  let guest: GuestCart = {
    version: 1,
    guestId: storage.newId(),
    snapshot: empty(),
  };
  function readGuest() {
    try {
      const saved = storage.load() as Partial<GuestCart> | null;
      if (
        saved?.version === 1 &&
        typeof saved.guestId === "string" &&
        /^[a-zA-Z0-9_-]{16,100}$/.test(saved.guestId)
      )
        guest = {
          version: 1,
          guestId: saved.guestId,
          snapshot: restoreCarts(saved.snapshot),
        };
    } catch {
      /* Guest memory remains usable when local storage is unavailable. */
    }
  }
  readGuest();
  const ready = ref(false),
    loading = ref(false),
    syncPending = ref(false),
    syncError = ref(""),
    notice = ref("");
  let applying = false,
    epoch = 0,
    changes = 0,
    disposed = false;
  let confirmed = new Map<string, StoredCart>(),
    dirty = new Map<string, StoredCart>();
  let worker: Promise<void> | undefined, loadingTask: Promise<void> | undefined;
  let conflicted: string | undefined;
  let conflictMessage = "";
  const ownerVersion = computed(
    () =>
      `${identity.value.account?.id ?? "guest"}:${identity.value.role ?? ""}:${identity.value.revision}`,
  );
  const user = () =>
    identity.value.role === "USER" &&
    !!identity.value.account &&
    !identity.value.account.mustChangePassword;
  const visitor = () => !identity.value.account;
  function saveGuest() {
    try {
      storage.save(guest);
    } catch {
      notice.value = "游客购物车暂时无法保存到本地，关闭页面后可能丢失";
    }
  }
  const model = useCartState(request, {
    load: () => empty(),
    save(snapshot) {
      if (applying || !ready.value) return;
      if (visitor()) {
        guest.snapshot = snapshot;
        saveGuest();
        return;
      }
      if (!user()) return;
      for (const entry of snapshot.carts) {
        const previous = confirmed.get(entry.storeId) ?? blank(entry.storeId);
        if (signature(entry) !== signature(previous))
          dirty.set(
            entry.storeId,
            JSON.parse(JSON.stringify(entry)) as StoredCart,
          );
        else dirty.delete(entry.storeId);
      }
      if (dirty.size) {
        changes++;
        if (!syncError.value) void drain();
      }
    },
  });
  function apply(snapshot: CartSnapshot, reset = false) {
    applying = true;
    try {
      model.applySnapshot(snapshot, reset);
    } finally {
      applying = false;
    }
  }
  function replaceRow(row: StoredCart) {
    const snapshot = model.snapshot();
    snapshot.carts = snapshot.carts
      .filter((entry) => entry.storeId !== row.storeId)
      .concat(row);
    apply(snapshot);
  }
  function accept(snapshot: CartSnapshot) {
    confirmed = new Map(snapshot.carts.map((entry) => [entry.storeId, entry]));
    const selection = model.checkoutStoreId.value;
    apply({ ...snapshot, checkoutStoreId: selection });
  }
  async function refreshConflict(id: string, version: number) {
    const snapshot = await request<CartSnapshot>("/user/cart");
    if (version !== epoch || disposed) return;
    const row =
      snapshot.carts.find((entry) => entry.storeId === id) ?? blank(id);
    confirmed.set(id, row);
    dirty.delete(id);
    replaceRow(row);
    conflicted = undefined;
    notice.value =
      conflictMessage || "购物车已在其他页面更新，请核对后重新调整";
  }
  async function drain(): Promise<void> {
    if (worker) return worker;
    if (!user() || !ready.value || syncError.value || !dirty.size) return;
    const version = epoch;
    syncPending.value = true;
    worker = (async () => {
      try {
        while (version === epoch && dirty.size) {
          const [id, draft] = dirty.entries().next().value!;
          const revision = confirmed.get(id)?.revision ?? 0;
          try {
            const row = await request<StoredCart>(
              `/user/cart/${encodeURIComponent(id)}`,
              { method: "PUT", body: { ...body(draft), revision } },
            );
            if (version !== epoch || disposed) return;
            confirmed.set(id, row);
            // A user may revert to the old confirmed quantity while this write
            // is in flight. Compare against live intent after acknowledging it.
            const latest =
              model.snapshot().carts.find((entry) => entry.storeId === id) ??
              blank(id);
            if (signature(latest) === signature(row)) dirty.delete(id);
            else
              dirty.set(id, JSON.parse(JSON.stringify(latest)) as StoredCart);
          } catch (error) {
            if (version !== epoch || disposed) return;
            if ((error as { code?: number })?.code === 409) {
              conflicted = id;
              conflictMessage =
                error instanceof Error
                  ? `${error.message}，已重新读取购物车，请核对后调整`
                  : "";
              await refreshConflict(id, version);
            } else throw error;
          }
        }
      } catch (error) {
        if (version === epoch && !disposed)
          syncError.value =
            error instanceof Error ? error.message : "购物车保存失败，请重试";
      } finally {
        if (version === epoch) {
          syncPending.value = false;
          worker = undefined;
        }
      }
    })();
    return worker;
  }
  async function load() {
    if (!user() || disposed) return;
    if (loadingTask) return loadingTask;
    const version = epoch;
    if (worker) await worker;
    if (version !== epoch || disposed || !user()) return;
    if (
      (dirty.size && !conflicted) ||
      (syncError.value && ready.value && !conflicted)
    )
      return;
    const changed = changes;
    loading.value = true;
    loadingTask = (async () => {
      try {
        if (conflicted) {
          await refreshConflict(conflicted, version);
          if (version === epoch) syncError.value = "";
          return;
        }
        let snapshot = await request<CartSnapshot>("/user/cart");
        if (version !== epoch || disposed) return;
        if (!ready.value) readGuest();
        if (
          !ready.value &&
          guest.snapshot.carts.some((entry) => entry.lines.length)
        ) {
          const result = await request<{
            snapshot: CartSnapshot;
            issues: string[];
          }>("/user/cart/merge", {
            method: "POST",
            body: {
              guestId: guest.guestId,
              carts: guest.snapshot.carts
                .filter((entry) => entry.lines.length)
                .map((entry) => ({
                  storeId: entry.storeId,
                  type: entry.type,
                  note: entry.note,
                  items: body(entry).items,
                })),
            },
          });
          if (version !== epoch || disposed) return;
          snapshot = result.snapshot;
          guest = { version: 1, guestId: storage.newId(), snapshot: empty() };
          saveGuest();
          if (result.issues.length) notice.value = result.issues.join("；");
        }
        if (version !== epoch || changed !== changes || dirty.size || disposed)
          return;
        accept(snapshot);
        ready.value = true;
        syncError.value = "";
      } catch (error) {
        if (version === epoch && !disposed)
          syncError.value =
            error instanceof Error ? error.message : "购物车读取失败，请重试";
      } finally {
        if (version === epoch) {
          loading.value = false;
          loadingTask = undefined;
        }
      }
    })();
    return loadingTask;
  }
  async function retry() {
    syncError.value = "";
    if (conflicted || !ready.value) {
      await load();
      if (ready.value && !syncError.value) await drain();
    } else {
      await drain();
      if (!syncError.value) await load();
    }
  }
  async function ensureSaved() {
    const version = epoch;
    if (!user()) return false;
    if (loadingTask) await loadingTask;
    await drain();
    if (syncError.value || !ready.value || version !== epoch) return false;
    await load();
    return version === epoch && ready.value && !syncError.value && !dirty.size;
  }
  const bound = new Map<string, CheckoutCart>();
  function forStore(id: string) {
    const cached = bound.get(id);
    if (cached) return cached;
    const view = model.forStore(id),
      originalSet = view.set,
      originalClear = view.clear;
    const canEdit = () => {
      if (!ready.value) {
        notice.value = "购物车正在读取，请稍后重试";
        return false;
      }
      if (!visitor() && !user()) {
        notice.value = "请切换到用户身份后选购";
        return false;
      }
      return true;
    };
    view.set = (product, qty) => {
      if (canEdit()) originalSet(product, qty);
    };
    view.clear = () => {
      if (canEdit()) originalClear();
    };
    Object.defineProperties(view, {
      cartRevision: {
        get: () => (user() ? (confirmed.get(id)?.revision ?? 0) : undefined),
      },
      syncPending: {
        get: () => loading.value || syncPending.value || !ready.value,
      },
      syncError: { get: () => syncError.value },
      ownerVersion: { get: () => ownerVersion.value },
    });
    view.ensureSaved = ensureSaved;
    view.newRequestId = storage.newId;
    view.acknowledgeOrder = async (revision) => {
      const old = confirmed.get(id) ?? blank(id);
      if (old.revision === revision && !dirty.has(id)) {
        const row = { ...old, lines: [], note: "", revision: revision + 1 };
        confirmed.set(id, row);
        replaceRow(row);
      }
      await load();
    };
    bound.set(id, view);
    return view;
  }
  watch(
    ownerVersion,
    () => {
      epoch++;
      changes++;
      confirmed = new Map();
      dirty = new Map();
      worker = undefined;
      loadingTask = undefined;
      conflicted = undefined;
      conflictMessage = "";
      syncError.value = "";
      notice.value = "";
      syncPending.value = false;
      loading.value = false;
      ready.value = false;
      apply(empty(), true);
      if (visitor()) {
        apply(guest.snapshot);
        ready.value = true;
      } else if (user()) void load();
      else ready.value = true;
    },
    { immediate: true, flush: "sync" },
  );
  onScopeDispose(() => {
    disposed = true;
    epoch++;
  });
  return {
    ...model,
    forStore,
    ready,
    loading,
    syncPending,
    syncError,
    notice,
    synchronize: load,
    retry,
    ensureSaved,
    replaceStore(...args: Parameters<typeof model.replaceStore>) {
      if (ready.value && (user() || visitor())) model.replaceStore(...args);
    },
    dismissNotice: () => {
      notice.value = "";
    },
  };
}
