import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDeviceRouting, switchDevice } from "./device";

const listeners = new Map<string, () => void>();
const browser = {
  innerWidth: 1440,
  addEventListener: vi.fn((event: string, callback: () => void) =>
    listeners.set(event, callback),
  ),
  removeEventListener: vi.fn((event: string) => listeners.delete(event)),
};
const currentLocation = {
  pathname: "/store/store-0",
  search: "?category=noodles",
  hash: "#dishes",
  replace: vi.fn(),
  assign: vi.fn(),
};
const storage = { getItem: vi.fn<() => string | null>(), setItem: vi.fn() };
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  listeners.clear();
  browser.innerWidth = 1440;
  currentLocation.pathname = "/store/store-0";
  storage.getItem.mockReturnValue(null);
  vi.stubGlobal("window", browser);
  vi.stubGlobal("location", currentLocation);
  vi.stubGlobal("navigator", { userAgent: "Windows", maxTouchPoints: 0 });
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
});

describe("浏览器设备路由接入", () => {
  it("切换到 393 px 后立即进入对应手机页面，连续 resize 不重复跳转", () => {
    const result = startDeviceRouting();
    stop = result.stop;
    expect(result.redirected).toBe(false);
    const resize = listeners.get("resize")!;
    browser.innerWidth = 393;
    resize();
    resize();
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/store/store-0?category=noodles#dishes",
    );
    expect(listeners.size).toBe(0);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("手机页面恢复桌面宽度时切回对应 PC 页面", () => {
    currentLocation.pathname = "/mobile/store/store-0";
    browser.innerWidth = 393;
    stop = startDeviceRouting().stop;
    browser.innerWidth = 1440;
    listeners.get("resize")!();
    expect(currentLocation.replace).toHaveBeenCalledExactlyOnceWith(
      "/store/store-0?category=noodles#dishes",
    );
  });

  it("浏览器恢复页面和其他标签页改变手动偏好时重新检测", () => {
    stop = startDeviceRouting().stop;
    listeners.get("pageshow")!();
    expect(currentLocation.replace).not.toHaveBeenCalled();
    storage.getItem.mockReturnValue("mobile");
    listeners.get("storage")!();
    expect(currentLocation.replace).toHaveBeenCalledOnce();
  });

  it("手动选择电脑版后，在窄屏和恢复页面时保持该选择", () => {
    browser.innerWidth = 393;
    storage.getItem.mockReturnValue("desktop");
    const result = startDeviceRouting();
    stop = result.stop;
    expect(result.redirected).toBe(false);
    listeners.get("pageshow")!();
    expect(currentLocation.replace).not.toHaveBeenCalled();
  });

  it("无法读取浏览器存储时仍可自动分流", () => {
    storage.getItem.mockImplementationOnce(() => {
      throw new Error("storage blocked");
    });
    browser.innerWidth = 393;
    const result = startDeviceRouting();
    expect(result.redirected).toBe(true);
    expect(currentLocation.replace).toHaveBeenCalledOnce();
  });

  it("手动切换保存偏好，并保留我的页面及完整 URL", () => {
    currentLocation.pathname = "/merchant/me";
    switchDevice(true);
    expect(storage.setItem).toHaveBeenCalledWith("xz-device", "mobile");
    expect(currentLocation.assign).toHaveBeenCalledWith(
      "/mobile/merchant/me?category=noodles#dishes",
    );
  });

  it("停止监听后移除所有浏览器事件", () => {
    const result = startDeviceRouting();
    expect([...listeners.keys()]).toEqual(["resize", "pageshow", "storage"]);
    result.stop();
    expect(listeners.size).toBe(0);
  });
});
