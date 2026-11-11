export type DeviceMode = "desktop" | "mobile";

export const devicePreferenceKey = "xz-device";
export const desktopMinWidth = 768;

export interface DeviceRouteState {
  pathname: string;
  search: string;
  hash: string;
  viewportWidth: number;
  userAgent: string;
  maxTouchPoints?: number;
  preference: string | null;
}

export function detectDeviceMode(state: DeviceRouteState): DeviceMode {
  if (state.preference === "desktop" || state.preference === "mobile")
    return state.preference;
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(state.userAgent);
  const iPadDesktopAgent =
    /Macintosh/i.test(state.userAgent) && (state.maxTouchPoints ?? 0) > 1;
  const narrowViewport =
    state.viewportWidth > 0 && state.viewportWidth < desktopMinWidth;
  return mobileAgent || iPadDesktopAgent || narrowViewport
    ? "mobile"
    : "desktop";
}

export function deviceUrl(
  location: Pick<DeviceRouteState, "pathname" | "search" | "hash">,
  mode: DeviceMode,
): string {
  const path = location.pathname.replace(/^\/mobile(?=\/|$)/, "") || "/";
  return (
    (mode === "mobile" ? "/mobile" : "") +
    path +
    location.search +
    location.hash
  );
}

export function resolveDeviceRedirect(state: DeviceRouteState): string | null {
  const current = /^\/mobile(?:\/|$)/.test(state.pathname)
    ? "mobile"
    : "desktop";
  const target = detectDeviceMode(state);
  return current === target ? null : deviceUrl(state, target);
}

interface DeviceRoutingEnvironment {
  read(): DeviceRouteState;
  replace(url: string): void;
  subscribe(check: () => void): () => void;
}

// Browser event wiring stays in each app; shared routing has no DOM dependency.
export function watchDeviceRouting(environment: DeviceRoutingEnvironment) {
  let redirected = false;
  let stopped = false;
  let unsubscribe = () => {};
  function stop() {
    stopped = true;
    unsubscribe();
  }
  function check() {
    if (stopped || redirected) return;
    const target = resolveDeviceRedirect(environment.read());
    if (!target) return;
    redirected = true;
    stop();
    environment.replace(target);
  }
  check();
  if (!redirected) unsubscribe = environment.subscribe(check);
  return { redirected, stop };
}
