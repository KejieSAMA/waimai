import { consumeDeviceEntry, watchDeviceRouting } from "@waimai/shared";

export function startDeviceRouting() {
  try {
    localStorage.removeItem("xz-device");
  } catch {
    // Obsolete preferences never affect routing, even when storage is blocked.
  }
  const entry = consumeDeviceEntry(location.search);
  if (entry.automaticEntry)
    history.replaceState(
      history.state,
      "",
      location.pathname + entry.search + location.hash,
    );
  // Memory only: a reload of the cleaned mobile URL becomes an explicit entry.
  const automaticEntry =
    entry.automaticEntry || !/^\/mobile(?:\/|$)/.test(location.pathname);
  return watchDeviceRouting({
    read() {
      const clientHints = (
        navigator as Navigator & { userAgentData?: { mobile?: boolean } }
      ).userAgentData;
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        mobileHint: clientHints?.mobile,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        automaticEntry,
      };
    },
    replace: (url) => location.replace(url),
    subscribe(check) {
      let timer: number | undefined;
      const schedule = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = undefined;
          check();
        }, 150);
      };
      const onVisibility = () => {
        if (document.visibilityState === "visible") schedule();
      };
      const events = ["resize", "pageshow", "focus"] as const;
      for (const event of events) window.addEventListener(event, schedule);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        window.clearTimeout(timer);
        for (const event of events) window.removeEventListener(event, schedule);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    },
  });
}
