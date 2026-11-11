import {
  computed,
  effectScope,
  onScopeDispose,
  reactive,
  ref,
  watch,
} from "vue";
import type { Product, Quote, Store } from "./index";

export interface CartLine {
  product: Product;
  qty: number;
}
export interface CartPayload {
  storeId?: string;
  type: "DELIVERY" | "PICKUP";
  addressId: string;
  note: string;
  items: { productId: string; qty: number }[];
}
export type CheckoutRequest = <T>(
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<T>;
export interface CheckoutCart {
  lines: CartLine[];
  type: "DELIVERY" | "PICKUP";
  addressId: string;
  note: string;
  lastStoreId?: string;
  quote: Quote | null;
  quotePending: boolean;
  quoteError: string;
  count: number;
  storeOpen: boolean;
  readonly payload: CartPayload;
  set(product: Product, qty: number): void;
  clear(): void;
  refresh(): Promise<Quote | undefined>;
  invalidateQuote(message: string): void;
}
export interface StoredCart {
  storeId: string;
  lines: CartLine[];
  type: "DELIVERY" | "PICKUP";
  addressId: string;
  note: string;
  name: string;
  logo: string;
  updatedAt: number;
}
export interface CartSnapshot {
  version: 2;
  checkoutStoreId?: string;
  carts: StoredCart[];
}
export interface CartPersistence {
  load(): unknown;
  save(value: CartSnapshot): void;
}

export function restoreCarts(value: unknown): CartSnapshot {
  const result: CartSnapshot = { version: 2, carts: [] };
  const root = value as Partial<CartSnapshot> | null;
  const sources: unknown[] = Array.isArray(value)
    ? [{ lines: value }]
    : root?.version === 2 && Array.isArray(root.carts)
      ? root.carts
      : [];
  const grouped = new Map<string, StoredCart>();
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const row = source as Partial<StoredCart>;
    if (!Array.isArray(row.lines)) continue;
    function ensure(id: string) {
      const existing = grouped.get(id);
      if (existing) return existing;
      const entry: StoredCart = {
        storeId: id,
        lines: [],
        type: row.type === "PICKUP" ? "PICKUP" : "DELIVERY",
        addressId: typeof row.addressId === "string" ? row.addressId : "",
        note: typeof row.note === "string" ? row.note.slice(0, 300) : "",
        name: typeof row.name === "string" ? row.name : "",
        logo: typeof row.logo === "string" ? row.logo : "",
        updatedAt:
          typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt)
            ? row.updatedAt
            : 0,
      };
      grouped.set(id, entry);
      return entry;
    }
    if (typeof row.storeId === "string" && row.storeId) ensure(row.storeId);
    for (const candidate of row.lines) {
      const line = candidate as CartLine | null;
      const p = line?.product;
      if (
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        typeof p.storeId !== "string" ||
        !p.storeId ||
        typeof p.name !== "string" ||
        !Number.isInteger(line?.qty) ||
        line!.qty < 1 ||
        line!.qty > 999 ||
        (row.storeId && row.storeId !== p.storeId)
      )
        continue;
      const entry = ensure(p.storeId);
      const old = entry.lines.find((it) => it.product.id === p.id);
      if (old) old.qty = Math.min(999, old.qty + line!.qty);
      else if (entry.lines.length < 100)
        entry.lines.push({ product: p, qty: line!.qty });
    }
  }
  result.carts = [...grouped.values()];
  result.checkoutStoreId =
    typeof root?.checkoutStoreId === "string"
      ? root.checkoutStoreId
      : result.carts[0]?.storeId;
  return result;
}

export function useCartState(
  request: CheckoutRequest,
  persistence: CartPersistence,
) {
  let restored: CartSnapshot = { version: 2, carts: [] };
  try {
    restored = restoreCarts(persistence.load());
  } catch {
    /* unavailable storage */
  }
  const entries = reactive<Record<string, StoredCart>>(Object.create(null));
  for (const entry of restored.carts) entries[entry.storeId] = entry;
  const checkoutStoreId = ref(restored.checkoutStoreId);
  const storeInfo = reactive<Record<string, Store>>(Object.create(null));
  const views = new Map<string, CheckoutCart>();
  const scope = effectScope();
  let active = true;
  function forStore(id: string): CheckoutCart {
    const cached = views.get(id);
    if (cached) return cached;
    if (!Object.hasOwn(entries, id))
      entries[id] = {
        storeId: id,
        lines: [],
        type: "DELIVERY",
        addressId: "",
        note: "",
        name: "",
        logo: "",
        updatedAt: 0,
      };
    const entry = entries[id];
    const transient = reactive({
      quote: null as Quote | null,
      quotePending: false,
      quoteError: "",
      storeOpen: false,
    });
    let version = 0;
    function dirty() {
      ++version;
      transient.quoteError = "";
      transient.quotePending = entry.lines.length > 0;
      if (!entry.lines.length) transient.quote = null;
    }
    scope.run(() =>
      watch(() => [entry.type, entry.addressId], dirty, { flush: "sync" }),
    );
    const view: CheckoutCart = reactive({
      get lines() {
        return entry.lines;
      },
      get type() {
        return entry.type;
      },
      set type(value) {
        entry.type = value;
      },
      get addressId() {
        return entry.addressId;
      },
      set addressId(value) {
        entry.addressId = value;
      },
      get note() {
        return entry.note;
      },
      set note(value) {
        entry.note = value.slice(0, 300);
      },
      lastStoreId: id || undefined,
      get quote() {
        return transient.quote;
      },
      set quote(value) {
        transient.quote = value;
      },
      get quotePending() {
        return transient.quotePending;
      },
      set quotePending(value) {
        transient.quotePending = value;
      },
      get quoteError() {
        return transient.quoteError;
      },
      set quoteError(value) {
        transient.quoteError = value;
      },
      get storeOpen() {
        return transient.storeOpen;
      },
      set storeOpen(value) {
        transient.storeOpen = value;
      },
      get count() {
        return entry.lines.reduce((sum, line) => sum + line.qty, 0);
      },
      get payload(): CartPayload {
        return {
          storeId: id || undefined,
          type: entry.type,
          addressId: entry.addressId,
          note: "",
          items: entry.lines.map((line) => ({
            productId: line.product.id,
            qty: line.qty,
          })),
        };
      },
      set(product: Product, qty: number) {
        if (
          product.storeId !== id ||
          !Number.isInteger(qty) ||
          qty < 0 ||
          qty > 999
        )
          return;
        const index = entry.lines.findIndex(
          (line) => line.product.id === product.id,
        );
        if (qty === 0) {
          if (index >= 0) entry.lines.splice(index, 1);
        } else if (index >= 0) entry.lines[index] = { product, qty };
        else if (entry.lines.length < 100) entry.lines.push({ product, qty });
        entry.updatedAt = Date.now();
        dirty();
      },
      clear() {
        entry.lines = [];
        entry.note = "";
        dirty();
        transient.quotePending = false;
      },
      invalidateQuote(message: string) {
        ++version;
        transient.quote = null;
        transient.quotePending = false;
        transient.quoteError = message;
      },
      async refresh() {
        const current = ++version;
        transient.quoteError = "";
        if (!entry.lines.length) {
          transient.quote = null;
          transient.quotePending = false;
          return;
        }
        transient.quotePending = true;
        const payload = view.payload;
        try {
          const value = await request<Quote>("/user/orders/preview", {
            method: "POST",
            body: payload,
          });
          if (active && current === version) {
            transient.quote = value;
            return value;
          }
        } catch (cause) {
          if (active && current === version) {
            transient.quote = null;
            transient.quoteError =
              cause instanceof Error ? cause.message : "无法计算金额";
          }
        } finally {
          if (active && current === version) transient.quotePending = false;
        }
      },
    });
    views.set(id, view);
    return view;
  }
  const carts = computed(() =>
    Object.values(entries)
      .filter((entry) => entry.lines.length)
      .sort((a, b) => b.updatedAt - a.updatedAt),
  );
  const totalCount = computed(() =>
    carts.value.reduce(
      (sum, entry) => sum + entry.lines.reduce((n, line) => n + line.qty, 0),
      0,
    ),
  );
  function resolveStoreId(preferred?: unknown) {
    if (preferred !== undefined)
      return typeof preferred === "string" ? preferred : "";
    return carts.value.some((entry) => entry.storeId === checkoutStoreId.value)
      ? checkoutStoreId.value
      : carts.value[0]?.storeId;
  }
  function selectStore(id: string) {
    checkoutStoreId.value = id;
  }
  function rememberStore(store: Store) {
    storeInfo[store.id] = store;
    forStore(store.id);
    entries[store.id].name = store.name;
    entries[store.id].logo = store.logo;
  }
  function replaceStore(
    id: string,
    lines: CartLine[],
    type: "DELIVERY" | "PICKUP",
  ) {
    const view = forStore(id);
    entries[id].lines = lines
      .filter((line) => line.product.storeId === id)
      .map((line) => ({ ...line }));
    view.type = type;
    view.note = "";
    entries[id].updatedAt = Date.now();
    view.invalidateQuote("");
    selectStore(id);
  }
  function snapshot(): CartSnapshot {
    return {
      version: 2,
      checkoutStoreId: checkoutStoreId.value,
      carts: Object.values(entries)
        .filter(
          (entry) =>
            entry.storeId &&
            (entry.lines.length ||
              entry.name ||
              entry.addressId ||
              entry.note ||
              entry.type === "PICKUP"),
        )
        .map((entry) => ({
          ...entry,
          lines: entry.lines.map((line) => ({ ...line })),
        })),
    };
  }
  watch(
    () => JSON.stringify(snapshot()),
    () => {
      try {
        persistence.save(snapshot());
      } catch {
        /* live state remains usable */
      }
    },
    { flush: "sync" },
  );
  // Normalize legacy data immediately, including malformed records.
  try {
    persistence.save(snapshot());
  } catch {
    /* unavailable storage */
  }
  onScopeDispose(() => {
    active = false;
    scope.stop();
  });
  return {
    storeInfo,
    carts,
    totalCount,
    checkoutStoreId,
    forStore,
    selectStore,
    resolveStoreId,
    rememberStore,
    replaceStore,
  };
}
