import {
  devicePreferenceKey,
  deviceUrl,
  watchDeviceRouting,
} from "@waimai/shared";

function readPreference() {
  try {
    return localStorage.getItem(devicePreferenceKey);
  } catch {
    return null;
  }
}

export function startDeviceRouting() {
  return watchDeviceRouting({
    read: () => ({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      viewportWidth: window.innerWidth,
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      preference: readPreference(),
    }),
    replace: (url) => location.replace(url),
    subscribe(check) {
      const events = ["resize", "pageshow", "storage"] as const;
      for (const event of events) window.addEventListener(event, check);
      return () => {
        for (const event of events) window.removeEventListener(event, check);
      };
    },
  });
}

export function switchDevice(mobile: boolean) {
  const mode = mobile ? "mobile" : "desktop";
  localStorage.setItem(devicePreferenceKey, mode);
  location.assign(deviceUrl(location, mode));
}
