import { defineStore } from "pinia";
import { useCartState } from "@waimai/shared";
import { api } from "./api";
export const useCart = defineStore("cart", () =>
  useCartState(api, {
    load: () => JSON.parse(localStorage.getItem("xz-cart") ?? "[]"),
    save: (lines) => localStorage.setItem("xz-cart", JSON.stringify(lines)),
  }),
);
