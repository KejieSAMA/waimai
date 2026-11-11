export type DeviceMode = "desktop" | "mobile";

export const devicePreferenceKey = "xz-device";

export interface DeviceInfo {
  userAgent: string;
  platform?: string;
  mobileHint?: boolean;
  maxTouchPoints?: number;
}

export interface DevicePreference {
  version: 2;
  mode: DeviceMode;
  detectedMode: DeviceMode;
}

export interface DeviceRouteState extends DeviceInfo {
  pathname: string;
  search: string;
  hash: string;
  preference: DevicePreference | null;
}

export function detectDeviceMode(state: DeviceInfo): DeviceMode {
  if (typeof state.mobileHint === "boolean")
    return state.mobileHint ? "mobile" : "desktop";
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(state.userAgent);
  const iPadDesktopAgent =
    state.platform === "MacIntel" && (state.maxTouchPoints ?? 0) > 1;
  return mobileAgent || iPadDesktopAgent ? "mobile" : "desktop";
}

export function parseDevicePreference(
  raw: string | null,
): DevicePreference | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "version" in value &&
      value.version === 2 &&
      "mode" in value &&
      (value.mode === "mobile" || value.mode === "desktop") &&
      "detectedMode" in value &&
      (value.detectedMode === "mobile" || value.detectedMode === "desktop")
    ) {
      return { version: 2, mode: value.mode, detectedMode: value.detectedMode };
    }
  } catch {
    // Legacy strings and malformed records must not pin a browser to one app.
  }
  return null;
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
  const detectedMode = detectDeviceMode(state);
  const target =
    state.preference?.detectedMode === detectedMode
      ? state.preference.mode
      : detectedMode;
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
    if (stopped) return;
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
