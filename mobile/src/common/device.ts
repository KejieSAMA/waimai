import {
  detectDeviceMode,
  devicePreferenceKey,
  parseDevicePreference,
  watchDeviceRouting,
  type DeviceInfo,
  type DeviceMode,
} from "@waimai/shared";

function readDeviceInfo(): DeviceInfo {
  const clientHints = (
    navigator as Navigator & {
      userAgentData?: { mobile?: boolean };
    }
  ).userAgentData;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    mobileHint: clientHints?.mobile,
  };
}

function readPreference(detectedMode: DeviceMode) {
  try {
    const raw = localStorage.getItem(devicePreferenceKey);
    const preference = parseDevicePreference(raw);
    if (
      raw !== null &&
      (!preference || preference.detectedMode !== detectedMode)
    ) {
      localStorage.removeItem(devicePreferenceKey);
      return null;
    }
    return preference;
  } catch {
    return null;
  }
}

export function startDeviceRouting() {
  return watchDeviceRouting({
    read() {
      const device = readDeviceInfo();
      return {
        ...device,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        preference: readPreference(detectDeviceMode(device)),
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
      const onStorage = (event: StorageEvent) => {
        if (event.key === devicePreferenceKey || event.key === null) schedule();
      };
      const events = ["resize", "pageshow", "focus"] as const;
      for (const event of events) window.addEventListener(event, schedule);
      window.addEventListener("storage", onStorage);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        window.clearTimeout(timer);
        for (const event of events) window.removeEventListener(event, schedule);
        window.removeEventListener("storage", onStorage);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    },
  });
}
