import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDeviceRouting } from "./device";
let events: EventTarget;
let documentEvents: EventTarget;
const device = {
  userAgent: "Windows",
  platform: "Win32",
  maxTouchPoints: 10,
  userAgentData: undefined as { mobile?: boolean } | undefined,
};
const currentLocation = {
  pathname: "/",
  search: "",
  hash: "",
  replace: vi.fn(),
};
const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
let saved: Map<string, string>;
const browser = {
  innerWidth: 1440,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setTimeout: vi.fn((callback: () => void, delay: number) =>
    setTimeout(callback, delay),
  ),
  clearTimeout: vi.fn((timer: ReturnType<typeof setTimeout>) =>
    clearTimeout(timer),
  ),
};
const page = {
  visibilityState: "visible",
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  events = new EventTarget();
  documentEvents = new EventTarget();
  page.visibilityState = "visible";
  page.addEventListener.mockImplementation(
    (...args: Parameters<EventTarget["addEventListener"]>) =>
      documentEvents.addEventListener(...args),
  );
  page.removeEventListener.mockImplementation(
    (...args: Parameters<EventTarget["removeEventListener"]>) =>
      documentEvents.removeEventListener(...args),
  );
  browser.removeEventListener.mockImplementation(
    (...args: Parameters<EventTarget["removeEventListener"]>) =>
      events.removeEventListener(...args),
  );
  browser.addEventListener.mockImplementation(
    (...args: Parameters<EventTarget["addEventListener"]>) =>
      events.addEventListener(...args),
  );
  saved = new Map([
    ["xz-theme", "dark"],
    ["xz-cart", "cart-data"],
    ["xz-auth-change", "auth-data"],
  ]);
  storage.getItem.mockImplementation(() => {
    throw new Error("不允许读取旧偏好");
  });
  storage.removeItem.mockImplementation((key: string) => {
    saved.delete(key);
  });
  Object.assign(device, {
    userAgent: "Windows",
    platform: "Win32",
    maxTouchPoints: 10,
    userAgentData: undefined,
  });
  Object.assign(currentLocation, { pathname: "/", search: "", hash: "" });
  browser.innerWidth = 1440;
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", page);
  vi.stubGlobal("navigator", device);
  vi.stubGlobal("location", currentLocation);
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("普通入口实时设备分流", () => {
  it.each([393, 768, 1440])("Windows 触屏电脑 %s px 不误跳手机版", (width) => {
    browser.innerWidth = width;
    expect(startDeviceRouting().redirected).toBe(false);
    expect(currentLocation.replace).not.toHaveBeenCalled();
  });
  it.each([undefined, true, false])(
    "手机 UA 与 Client Hints %s 的优先级",
    (mobile) => {
      device.userAgent = "iPhone Mobile";
      device.userAgentData = mobile === undefined ? undefined : { mobile };
      expect(startDeviceRouting().redirected).toBe(mobile !== false);
    },
  );
  it("公网 HTTP 缺少 Client Hints 时，标准 Windows UA 仍留在 PC", () => {
    device.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0";
    expect(startDeviceRouting().redirected).toBe(false);
  });
  it("触屏 iPad 的桌面 UA 进入手机版", () => {
    Object.assign(device, {
      userAgent: "Macintosh",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    expect(startDeviceRouting().redirected).toBe(true);
  });
  it.each([
    "mobile",
    "desktop",
    '"mobile"',
    "broken",
    '{"version":2,"mode":"mobile","detectedMode":"desktop"}',
  ])("无条件清理旧偏好 %s，不读取或重新保存且不触碰其他数据", (raw) => {
    saved.set("xz-device", raw);
    expect(startDeviceRouting().redirected).toBe(false);
    expect([...saved.entries()]).toEqual([
      ["xz-theme", "dark"],
      ["xz-cart", "cart-data"],
      ["xz-auth-change", "auth-data"],
    ]);
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith("xz-device");
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("自动分流使用 replace 并保留深链接、查询与锚点", () => {
    device.userAgentData = { mobile: true };
    Object.assign(currentLocation, {
      pathname: "/merchant/orders",
      search: "?status=PENDING&page=2",
      hash: "#order-1",
    });
    expect(startDeviceRouting().redirected).toBe(true);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/merchant/orders?status=PENDING&page=2&__xz_auto_entry=1#order-1",
    );
  });
  it.each(["throw-on-access", "throw-on-remove"])(
    "存储不可用 %s 也能正常分流",
    (failure) => {
      if (failure === "throw-on-access")
        vi.stubGlobal("localStorage", undefined);
      else
        storage.removeItem.mockImplementationOnce(() => {
          throw new Error("storage blocked");
        });
      device.userAgentData = { mobile: true };
      expect(startDeviceRouting().redirected).toBe(true);
    },
  );
  it("监听设备标识变化而非窗口宽度，连续事件合并且保留最新站内路径", () => {
    const routing = startDeviceRouting();
    browser.innerWidth = 393;
    events.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    events.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(100);
    device.userAgentData = { mobile: true };
    currentLocation.pathname = "/orders/order-2";
    currentLocation.search = "?tab=ongoing";
    events.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(149);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/orders/order-2?tab=ongoing&__xz_auto_entry=1",
    );
    expect(browser.removeEventListener).toHaveBeenCalledTimes(3);
    expect(page.removeEventListener).toHaveBeenCalledOnce();
    events.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(1000);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    routing.stop();
  });
  it.each(["pageshow", "focus"])("%s 重新读取设备信息", (event) => {
    const routing = startDeviceRouting();
    device.userAgentData = { mobile: true };
    events.dispatchEvent(new Event(event));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
    routing.stop();
  });
  it("页面恢复可见才检测；取消订阅及定时器后不再跳转", () => {
    const routing = startDeviceRouting();
    device.userAgentData = { mobile: true };
    page.visibilityState = "hidden";
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    page.visibilityState = "visible";
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(1);
    routing.stop();
    routing.stop();
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("旧偏好存储事件不触发检测", () => {
    const routing = startDeviceRouting();
    device.userAgentData = { mobile: true };
    events.dispatchEvent(new Event("storage"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    routing.stop();
  });
});
