import type { OrderActivity } from "@waimai/shared";
export const orderActivity: OrderActivity = {
  now: () => Date.now(),
  visible: () => document.visibilityState === "visible",
  listen(callback) {
    window.addEventListener("focus", callback);
    document.addEventListener("visibilitychange", callback);
    return () => {
      window.removeEventListener("focus", callback);
      document.removeEventListener("visibilitychange", callback);
    };
  },
  every(callback, ms) {
    const timer = setInterval(callback, ms);
    return () => clearInterval(timer);
  },
  later(callback, ms) {
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  },
};
