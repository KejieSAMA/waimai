import { defineStore } from "pinia";
import { computed, onScopeDispose } from "vue";
import { useAccountCart } from "@waimai/shared";
import { api } from "./api";
import { useAuth } from "./auth";
export const useCart = defineStore("cart", () => {
  const auth = useAuth();
  try {
    localStorage.removeItem("xz-cart");
  } catch {
    /* Legacy carts are never read. */
  }
  function newId() {
    return (
      Date.now().toString(36) +
      "_" +
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
        value.toString(16).padStart(2, "0"),
      ).join("")
    );
  }
  const cart = useAccountCart(
    api,
    {
      load: () => JSON.parse(localStorage.getItem("xz-guest-cart") ?? "null"),
      save: (value) =>
        localStorage.setItem("xz-guest-cart", JSON.stringify(value)),
      newId,
    },
    computed(() => ({
      account: auth.account,
      role: auth.activeRole,
      revision: auth.revision,
    })),
  );
  const focus = () => {
    void cart.synchronize();
  };
  const visible = () => {
    if (document.visibilityState === "visible") focus();
  };
  window.addEventListener("focus", focus);
  document.addEventListener("visibilitychange", visible);
  onScopeDispose(() => {
    window.removeEventListener("focus", focus);
    document.removeEventListener("visibilitychange", visible);
  });
  return cart;
});
