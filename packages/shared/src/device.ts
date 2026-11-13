export type DeviceMode = "desktop" | "mobile";

export interface DeviceInfo {
  userAgent: string;
  platform?: string;
  mobileHint?: boolean;
  maxTouchPoints?: number;
}

export interface DeviceRouteState extends DeviceInfo {
  pathname: string;
  search: string;
  hash: string;
  automaticEntry?: boolean;
}

export function detectDeviceMode(state: DeviceInfo): DeviceMode {
  if (typeof state.mobileHint === "boolean")
    return state.mobileHint ? "mobile" : "desktop";
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(state.userAgent);
  const iPadDesktopAgent =
    state.platform === "MacIntel" && (state.maxTouchPoints ?? 0) > 1;
  return mobileAgent || iPadDesktopAgent ? "mobile" : "desktop";
}

const isMobilePath = (pathname: string) => /^\/mobile(?:\/|$)/.test(pathname);
const autoEntryParameter = "__xz_auto_entry=1";

// The marker only crosses an automatic full-page redirect. It is consumed before
// mounting, never stored, so refreshing a clean /mobile URL is an explicit entry.
export function consumeDeviceEntry(search: string) {
  const parts = search.replace(/^\?/, "").split("&");
  const automaticEntry = parts.includes(autoEntryParameter);
  const rest = parts.filter((part) => part !== autoEntryParameter).join("&");
  return {
    automaticEntry,
    search: automaticEntry ? (rest ? "?" + rest : "") : search,
  };
}

export function deviceNavigationUrl(target: string) {
  const index = target.indexOf("#");
  const path = index < 0 ? target : target.slice(0, index);
  const hash = index < 0 ? "" : target.slice(index);
  return path + (path.includes("?") ? "&" : "?") + autoEntryParameter + hash;
}

export function resolveDeviceRedirect(state: DeviceRouteState): string | null {
  const mobilePath = isMobilePath(state.pathname);
  if (mobilePath && !state.automaticEntry) return null;
  const target = detectDeviceMode(state);
  if (mobilePath === (target === "mobile")) return null;
  const path = state.pathname.replace(/^\/mobile(?=\/|$)/, "") || "/";
  return (
    (target === "mobile" ? "/mobile" : "") + path + state.search + state.hash
  );
}

interface DeviceRoutingEnvironment {
  read(): DeviceRouteState;
  replace(url: string): void;
  subscribe(check: () => void): () => void;
}

export function watchDeviceRouting(environment: DeviceRoutingEnvironment) {
  let redirected = false,
    stopped = false;
  let unsubscribe = () => {};
  function stop() {
    if (stopped) return;
    stopped = true;
    unsubscribe();
  }
  function check(state = environment.read()) {
    if (stopped || redirected) return;
    const target = resolveDeviceRedirect(state);
    if (target === null) return;
    redirected = true;
    stop();
    environment.replace(deviceNavigationUrl(target));
  }
  const initial = environment.read();
  check(initial);
  if (
    !redirected &&
    (!isMobilePath(initial.pathname) || initial.automaticEntry)
  )
    unsubscribe = environment.subscribe(() => check());
  return { redirected, stop };
}
