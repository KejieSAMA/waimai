/** Public business defaults. Monetary values are integer cents; persisted values win. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const ORDER_DETAIL_POLL_MS = 15_000;
export const MERCHANT_STATS_POLL_MS = 60_000;
export const NEW_STORE_DEFAULTS = Object.freeze({
  city: "",
  openHours: "09:00-22:00",
  minOrderCents: 2000,
  deliveryFeeCents: 300,
});
