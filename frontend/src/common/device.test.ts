import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDeviceRouting, switchDevice } from "./device";

let windowEvents = new EventTarget();
let documentEvents = new EventTarget();
const browser = {
  innerWidth: 1440,
  addEventListener: vi.fn(
    (...args: Parameters<EventTarget["addEventListener"]>) =>
      windowEvents.addEventListener(...args),
  ),
  removeEventListener: vi.fn(
    (...args: Parameters<EventTarget["removeEventListener"]>) =>
      windowEvents.removeEventListener(...args),
  ),
  setTimeout: (callback: () => void, delay: number) =>
    setTimeout(callback, delay),
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
};
const page = {
  visibilityState: "visible",
  addEventListener: vi.fn(
    (...args: Parameters<EventTarget["addEventListener"]>) =>
      documentEvents.addEventListener(...args),
  ),
  removeEventListener: vi.fn(
    (...args: Parameters<EventTarget["removeEventListener"]>) =>
      documentEvents.removeEventListener(...args),
  ),
};
const device = {
  userAgent: "Windows",
  platform: "Win32",
  maxTouchPoints: 0,
  userAgentData: undefined as { mobile?: boolean } | undefined,
};
const currentLocation = {
  pathname: "/store/store-0",
  search: "?category=noodles",
  hash: "#dishes",
  replace: vi.fn(),
  assign: vi.fn(),
};
const saved = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => saved.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    saved.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    saved.delete(key);
  }),
};
let stop: (() => void) | undefined;

function start() {
  const result = startDeviceRouting();
  stop = result.stop;
  return result;
}
function emit(event: string) {
  windowEvents.dispatchEvent(new Event(event));
}
function storageEvent(key: string | null) {
  windowEvents.dispatchEvent(Object.assign(new Event("storage"), { key }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  windowEvents = new EventTarget();
  documentEvents = new EventTarget();
  saved.clear();
  browser.innerWidth = 1440;
  page.visibilityState = "visible";
  device.userAgent = "Windows";
  device.platform = "Win32";
  device.maxTouchPoints = 0;
  device.userAgentData = undefined;
  currentLocation.pathname = "/store/store-0";
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", page);
  vi.stubGlobal("location", currentLocation);
  vi.stubGlobal("navigator", device);
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("浏览器设备路由接入", () => {
  it.each([393, 768, 1440])("电脑在 %s px 启动及缩放时保留 PC 版", (width) => {
    browser.innerWidth = width;
    expect(start().redirected).toBe(false);
    browser.innerWidth = 393;
    emit("resize");
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("读取 Client Hints 的 false，覆盖残留手机 UA", () => {
    device.userAgent = "iPhone Mobile";
    device.userAgentData = { mobile: false };
    expect(start().redirected).toBe(false);
  });

  it("读取 Client Hints 的 true，在挂载前分流且自动跳转不保存偏好", () => {
    device.userAgentData = { mobile: true };
    expect(start().redirected).toBe(true);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/store/store-0?category=noodles#dishes",
    );
    expect(browser.addEventListener).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("没有 Client Hints 的 MacIntel 触屏 iPad 仍能识别", () => {
    device.userAgent = "Macintosh";
    device.platform = "MacIntel";
    device.maxTouchPoints = 5;
    expect(start().redirected).toBe(true);
  });

  it.each(["mobile", "desktop", '"mobile"', "broken"])(
    "自动移除旧偏好 %s，不再将电脑固定为手机版",
    (raw) => {
      saved.set("xz-device", raw);
      expect(start().redirected).toBe(false);
      expect(saved.has("xz-device")).toBe(false);
      expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith("xz-device");
    },
  );

  it("桌面浏览器已位于手机版且存在旧偏好时自动回到 PC", () => {
    currentLocation.pathname = "/mobile/store/store-0";
    saved.set("xz-device", "mobile");
    expect(start().redirected).toBe(true);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/store/store-0?category=noodles#dishes",
    );
    expect(saved.has("xz-device")).toBe(false);
  });

  it("同一设备状态下保持新版手动偏好", () => {
    const raw = JSON.stringify({
      version: 2,
      mode: "mobile",
      detectedMode: "desktop",
    });
    saved.set("xz-device", raw);
    currentLocation.pathname = "/mobile/store/store-0";
    expect(start().redirected).toBe(false);
    emit("pageshow");
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    expect(saved.get("xz-device")).toBe(raw);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("设备标识改变后删除手动覆盖，恢复自动检测而非按当前应用推断设备", () => {
    saved.set(
      "xz-device",
      JSON.stringify({ version: 2, mode: "desktop", detectedMode: "mobile" }),
    );
    device.userAgentData = { mobile: true };
    expect(start().redirected).toBe(false);
    device.userAgentData.mobile = false;
    emit("resize");
    vi.advanceTimersByTime(150);
    expect(saved.has("xz-device")).toBe(false);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    device.userAgentData.mobile = true;
    emit("resize");
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/store/store-0?category=noodles#dishes",
    );
  });

  it("关闭手机模拟并恢复桌面标识后回到 PC，宽度不参与判断", () => {
    currentLocation.pathname = "/mobile/store/store-0";
    device.userAgentData = { mobile: true };
    expect(start().redirected).toBe(false);
    device.userAgentData.mobile = false;
    browser.innerWidth = 393;
    emit("resize");
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/store/store-0?category=noodles#dishes",
    );
  });

  it("连续事件合并到最后一次的 150ms，检测时读取最新设备标识与路径", () => {
    start();
    emit("resize");
    vi.advanceTimersByTime(100);
    emit("resize");
    vi.advanceTimersByTime(149);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    device.userAgentData = { mobile: true };
    currentLocation.pathname = "/orders/order-2";
    vi.advanceTimersByTime(1);
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/orders/order-2?category=noodles#dishes",
    );
    emit("resize");
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["pageshow", "focus"])("%s 时重新检测设备标识", (event) => {
    start();
    device.userAgentData = { mobile: true };
    emit(event);
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
  });

  it("仅页面恢复可见时重新检测，隐藏事件不触发跳转", () => {
    start();
    device.userAgentData = { mobile: true };
    page.visibilityState = "hidden";
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
    page.visibilityState = "visible";
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
  });

  it("其他标签页只修改设备偏好时重新检测，不响应购物车存储变化", () => {
    start();
    saved.set(
      "xz-device",
      JSON.stringify({ version: 2, mode: "mobile", detectedMode: "desktop" }),
    );
    storageEvent("xz-cart");
    expect(vi.getTimerCount()).toBe(0);
    storageEvent("xz-device");
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
  });

  it("无法读取浏览器存储时仍正常自动分流", () => {
    storage.getItem.mockImplementationOnce(() => {
      throw new Error("storage blocked");
    });
    device.userAgentData = { mobile: true };
    expect(start().redirected).toBe(true);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
  });

  it("旧偏好清理失败时也不会继续应用该值", () => {
    saved.set("xz-device", "mobile");
    storage.removeItem.mockImplementationOnce(() => {
      throw new Error("storage blocked");
    });
    expect(start().redirected).toBe(false);
    expect(currentLocation.replace).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "手动切换 %s 时保存版本和真实设备状态并保留完整地址",
    (mobile) => {
      device.userAgentData = { mobile: true };
      currentLocation.pathname = "/mobile/merchant/me";
      switchDevice(mobile);
      expect(JSON.parse(saved.get("xz-device")!)).toEqual({
        version: 2,
        mode: mobile ? "mobile" : "desktop",
        detectedMode: "mobile",
      });
      expect(currentLocation.assign).toHaveBeenCalledExactlyOnceWith(
        `${mobile ? "/mobile" : ""}/merchant/me?category=noodles#dishes`,
      );
    },
  );

  it("卸载或热更新时清理所有事件与待执行定时器，重复清理安全", () => {
    const result = start();
    emit("resize");
    expect(vi.getTimerCount()).toBe(1);
    result.stop();
    result.stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(browser.removeEventListener).toHaveBeenCalledTimes(4);
    expect(page.removeEventListener).toHaveBeenCalledOnce();
    device.userAgentData = { mobile: true };
    emit("resize");
    emit("pageshow");
    emit("focus");
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    storageEvent(null);
    vi.advanceTimersByTime(150);
    expect(currentLocation.replace).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
