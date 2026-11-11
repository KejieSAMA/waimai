import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { Product, Quote } from "@waimai/shared";
import { api } from "./api";
export const useCart = defineStore("cart", () => {
  type CartLine = { product: Product; qty: number };
  function restore() {
    try {
      return JSON.parse(localStorage.getItem("xz-cart") ?? "[]") as CartLine[];
    } catch {
      return [];
    }
  }
  const lines = ref<CartLine[]>(restore());
  const type = ref<"DELIVERY" | "PICKUP">("DELIVERY");
  const addressId = ref("");
  const quote = ref<Quote | null>(null);
  const quoteError = ref("");
  let version = 0;
  const storeOpen = ref(true);
  const count = computed(() => lines.value.reduce((n, it) => n + it.qty, 0));
  const payload = computed(() => ({
    storeId: lines.value[0]?.product.storeId,
    type: type.value,
    addressId: addressId.value,
    note: "",
    items: lines.value.map((it) => ({ productId: it.product.id, qty: it.qty })),
  }));
  function set(product: Product, qty: number) {
    version++;
    if (lines.value[0]?.product.storeId !== product.storeId) lines.value = [];
    const index = lines.value.findIndex((it) => it.product.id === product.id);
    if (index >= 0) lines.value.splice(index, 1);
    if (qty > 0) lines.value.push({ product, qty });
    quote.value = null;
  }
  function clear() {
    version++;
    lines.value = [];
    quote.value = null;
  }
  async function refresh() {
    const current = ++version;
    quote.value = null;
    quoteError.value = "";
    if (!lines.value.length) return;
    try {
      const value = await api<Quote>("/user/orders/preview", {
        method: "POST",
        body: payload.value,
      });
      if (current === version) quote.value = value;
    } catch (error) {
      if (current === version)
        quoteError.value =
          error instanceof Error ? error.message : "无法计算金额";
    }
  }
  watch(
    lines,
    () => localStorage.setItem("xz-cart", JSON.stringify(lines.value)),
    { deep: true },
  );
  return {
    storeOpen,
    lines,
    type,
    addressId,
    quote,
    quoteError,
    count,
    payload,
    set,
    clear,
    refresh,
  };
});
