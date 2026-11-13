export const PAYMENT_TTL_MS = 15 * 60_000;
export const PAYMENT_SWEEP_MS = 60_000;
export const TRAFFIC_RULES = Object.freeze({
  cookieName: "xz_visitor",
  cookieMaxAgeMs: 365 * 86_400_000,
  retentionDays: 30,
  cleanupMs: 24 * 60 * 60_000,
  rateWindowMs: 60_000,
  rateLimit: 120,
});
