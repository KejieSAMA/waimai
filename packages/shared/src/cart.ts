import { computed, onScopeDispose, ref, watch } from "vue";
import type { Product, Quote } from "./index";

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
export interface CartPersistence {
  load(): unknown;
  save(lines: CartLine[]): void;
}

function restoreLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const valid = value.filter(
    (line): line is CartLine =>
      !!line &&
      typeof line === "object" &&
      line.product &&
      typeof line.product.id === "string" &&
      typeof line.product.storeId === "string" &&
      typeof line.product.name === "string" &&
      Number.isInteger(line.qty) &&
      line.qty > 0 &&
      line.qty <= 999,
  );
  return valid.filter(
    (line) => line.product.storeId === valid[0]?.product.storeId,
  );
}

export function useCartState(
  request: CheckoutRequest,
  persistence: CartPersistence,
) {
  let restored: CartLine[] = [];
  try {
    restored = restoreLines(persistence.load());
  } catch {
    /* Storage can be unavailable. */
  }
  const lines = ref<CartLine[]>(restored),
    type = ref<"DELIVERY" | "PICKUP">("DELIVERY"),
    addressId = ref("");
  const note = ref(""),
    lastStoreId = ref<string | undefined>(restored[0]?.product.storeId);
  const quote = ref<Quote | null>(null),
    quotePending = ref(false),
    quoteError = ref(""),
    storeOpen = ref(true);
  let version = 0,
    active = true;
  const count = computed(() =>
    lines.value.reduce((sum, line) => sum + line.qty, 0),
  );
  const payload = computed<CartPayload>(() => ({
    storeId: lines.value[0]?.product.storeId,
    type: type.value,
    addressId: addressId.value,
    note: "",
    items: lines.value.map((line) => ({
      productId: line.product.id,
      qty: line.qty,
    })),
  }));
  function dirty() {
    ++version;
    quoteError.value = "";
    quotePending.value = lines.value.length > 0;
    if (!lines.value.length) quote.value = null;
  }
  watch([type, addressId], dirty, { flush: "sync" });
  function set(product: Product, qty: number) {
    if (!Number.isInteger(qty) || qty < 0 || qty > 999) return;
    ++version;
    if (lastStoreId.value && lastStoreId.value !== product.storeId) {
      lines.value = [];
      quote.value = null;
      note.value = "";
    }
    lastStoreId.value = product.storeId;
    const index = lines.value.findIndex(
      (line) => line.product.id === product.id,
    );
    if (qty === 0) {
      if (index >= 0) lines.value.splice(index, 1);
    } else if (index >= 0) lines.value[index] = { product, qty };
    else lines.value.push({ product, qty });
    dirty();
  }
  function invalidateQuote(message: string) {
    ++version;
    quote.value = null;
    quotePending.value = false;
    quoteError.value = message;
  }
  function clear() {
    ++version;
    lines.value = [];
    quote.value = null;
    quotePending.value = false;
    quoteError.value = "";
    note.value = "";
  }
  async function refresh(): Promise<Quote | undefined> {
    const current = ++version;
    quoteError.value = "";
    if (!lines.value.length) {
      quote.value = null;
      quotePending.value = false;
      return;
    }
    quotePending.value = true;
    try {
      const value = await request<Quote>("/user/orders/preview", {
        method: "POST",
        body: payload.value,
      });
      if (active && current === version) {
        quote.value = value;
        return value;
      }
    } catch (cause) {
      if (active && current === version) {
        quote.value = null;
        quoteError.value =
          cause instanceof Error ? cause.message : "无法计算金额";
      }
    } finally {
      if (active && current === version) quotePending.value = false;
    }
  }
  watch(
    lines,
    () => {
      try {
        persistence.save(lines.value);
      } catch {
        /* Keep the live cart usable. */
      }
    },
    { deep: true },
  );
  onScopeDispose(() => {
    active = false;
    ++version;
  });
  return {
    lines,
    type,
    addressId,
    note,
    lastStoreId,
    quote,
    quotePending,
    quoteError,
    storeOpen,
    count,
    payload,
    set,
    clear,
    refresh,
    invalidateQuote,
  };
}
