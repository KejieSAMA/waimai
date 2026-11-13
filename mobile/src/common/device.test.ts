import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDeviceRouting } from "./device";
const device = {
  userAgent: "Windows",
  platform: "Win32",
  maxTouchPoints: 10,
  userAgentData: undefined as { mobile: boolean } | undefined,
};
const currentLocation = {
  pathname: "/mobile/",
  search: "?x=1",
  hash: "#content",
  replace: vi.fn(),
};
const storage = { removeItem: vi.fn(), getItem: vi.fn(), setItem: vi.fn() };
let events: EventTarget;
const browser = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setTimeout: (callback: () => void, delay: number) =>
    setTimeout(callback, delay),
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
};
const page = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
const currentHistory = { state: { position: 2 }, replaceState: vi.fn() };
let routing: ReturnType<typeof startDeviceRouting> | undefined;
function start() {
  routing = startDeviceRouting();
  return routing;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  events = new EventTarget();
  browser.addEventListener.mockImplementation(
    (...args: Parameters<EventTarget["addEventListener"]>) =>
      events.addEventListener(...args),
  );
  browser.removeEventListener.mockImplementation(
    (...args: Parameters<EventTarget["removeEventListener"]>) =>
      events.removeEventListener(...args),
  );
  currentHistory.replaceState.mockImplementation(
    (_state: unknown, _unused: string, url: string) => {
      currentLocation.search = new URL(url, "http://localhost:13599").search;
    },
  );
  Object.assign(device, {
    userAgent: "Windows",
    platform: "Win32",
    maxTouchPoints: 10,
    userAgentData: undefined,
  });
  Object.assign(currentLocation, {
    pathname: "/mobile/",
    search: "?x=1",
    hash: "#content",
  });
  vi.stubGlobal("navigator", device);
  vi.stubGlobal("location", currentLocation);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", page);
  vi.stubGlobal("history", currentHistory);
});
afterEach(() => {
  routing?.stop();
  routing = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("手机版入口来源", () => {
  it.each([
    "/mobile",
    "/mobile/",
    "/mobile/merchant/orders",
    "/mobile/admin/accounts",
    "/mobile/account/profile",
  ])("电脑明确进入 %s 及刷新不跳回 PC", (pathname) => {
    currentLocation.pathname = pathname;
    expect(start().redirected).toBe(false);
    routing!.stop();
    expect(start().redirected).toBe(false);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith("xz-device");
    expect(browser.addEventListener).not.toHaveBeenCalled();
    expect(currentHistory.replaceState).not.toHaveBeenCalled();
  });
  it("明确手机版地址在设备变化后也不切换", () => {
    device.userAgentData = { mobile: true };
    start();
    device.userAgentData.mobile = false;
    events.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    expect(browser.addEventListener).not.toHaveBeenCalled();
  });
  it("自动进入时立即消费 URL 标记，保留路由历史状态及其他参数，并在站内导航后继续实时切换", () => {
    device.userAgentData = { mobile: true };
    currentLocation.search = "?redirect=%2Forders%3Fx%3D1&__xz_auto_entry=1";
    expect(start().redirected).toBe(false);
    expect(currentHistory.replaceState).toHaveBeenCalledExactlyOnceWith(
      currentHistory.state,
      "",
      "/mobile/?redirect=%2Forders%3Fx%3D1#content",
    );
    expect(currentHistory.state).toEqual({ position: 2 });
    expect(currentLocation.search).not.toContain("__xz_auto_entry");
    currentLocation.pathname = "/mobile/merchant/orders";
    currentLocation.search = "?status=PENDING";
    device.userAgentData.mobile = false;
    events.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/merchant/orders?status=PENDING&__xz_auto_entry=1#content",
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("刷新已清理标记的 /mobile 地址后固定手机版，不保留自动来源", () => {
    device.userAgentData = { mobile: true };
    currentLocation.search = "?x=1&__xz_auto_entry=1";
    start();
    routing!.stop();
    device.userAgentData.mobile = false;
    expect(start().redirected).toBe(false);
    events.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
  });
  it("自动进入瞬间设备已变回电脑时，挂载前返回 PC 且不重复 mobile 前缀", () => {
    currentLocation.search = "?__xz_auto_entry=1";
    expect(start().redirected).toBe(true);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/?__xz_auto_entry=1#content",
    );
  });
  it("旧偏好清理异常不影响明确的手机版地址", () => {
    storage.removeItem.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(start().redirected).toBe(false);
    expect(currentLocation.replace).not.toHaveBeenCalled();
  });
});
