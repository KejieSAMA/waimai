import { describe, expect, it, vi } from "vitest";
import {
  detectDeviceMode,
  deviceUrl,
  resolveDeviceRedirect,
  watchDeviceRouting,
  type DeviceRouteState,
} from "./device";

const desktop: DeviceRouteState = {
  pathname: "/store/store-0",
  search: "?category=noodles",
  hash: "#dishes",
  viewportWidth: 1440,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  preference: null,
};

describe("设备识别", () => {
  it.each([
    [393, "mobile"],
    [767.5, "mobile"],
    [768, "desktop"],
    [1280, "desktop"],
  ] as const)("桌面 UA 在 %s px 使用 %s", (viewportWidth, expected) => {
    expect(detectDeviceMode({ ...desktop, viewportWidth })).toBe(expected);
  });

  it.each(["iPhone Mobile", "Android Mobile", "iPad"])(
    "宽屏或横屏仍能识别 %s 设备",
    (userAgent) => {
      expect(detectDeviceMode({ ...desktop, userAgent })).toBe("mobile");
    },
  );

  it("通过多点触控识别使用桌面 UA 的 iPad", () => {
    const state = { ...desktop, userAgent: "Macintosh", maxTouchPoints: 5 };
    expect(detectDeviceMode(state)).toBe("mobile");
    expect(detectDeviceMode({ ...state, maxTouchPoints: 0 })).toBe("desktop");
  });

  it("手动偏好优先，无效存储值继续自动判断", () => {
    expect(detectDeviceMode({ ...desktop, preference: "mobile" })).toBe(
      "mobile",
    );
    expect(
      detectDeviceMode({
        ...desktop,
        viewportWidth: 393,
        preference: "desktop",
      }),
    ).toBe("desktop");
    expect(detectDeviceMode({ ...desktop, preference: "invalid" })).toBe(
      "desktop",
    );
  });
});

describe("设备路径切换", () => {
  it.each([
    "/store/store-0",
    "/orders/order-1",
    "/merchant/products/product-1/edit",
    "/merchant/dashboard",
    "/admin/audit/store-1",
    "/admin/overview",
    "/me",
    "/merchant/me",
    "/admin/me",
    "/addresses",
  ])("双向切换保留页面 %s，不退回首页", (pathname) => {
    const mobile = deviceUrl({ ...desktop, pathname }, "mobile");
    expect(mobile).toBe(`/mobile${pathname}${desktop.search}${desktop.hash}`);
    expect(
      deviceUrl({ ...desktop, pathname: `/mobile${pathname}` }, "desktop"),
    ).toBe(`${pathname}${desktop.search}${desktop.hash}`);
  });

  it("保留登录回跳参数的编码和页面锚点", () => {
    expect(
      deviceUrl(
        {
          pathname: "/login",
          search: "?redirect=%2Forders%2Forder-1%3Fx%3D1",
          hash: "#form",
        },
        "mobile",
      ),
    ).toBe("/mobile/login?redirect=%2Forders%2Forder-1%3Fx%3D1#form");
  });

  it("正确处理根路径以及完整 mobile 路径边界", () => {
    expect(deviceUrl({ pathname: "/", search: "", hash: "" }, "mobile")).toBe(
      "/mobile/",
    );
    for (const pathname of ["/mobile", "/mobile/"])
      expect(deviceUrl({ pathname, search: "", hash: "" }, "desktop")).toBe(
        "/",
      );
    expect(
      deviceUrl({ ...desktop, pathname: "/mobile-store" }, "desktop"),
    ).toBe("/mobile-store?category=noodles#dishes");
  });

  it.each([393, 1440])(
    "%s px 双端使用相同判断，跳转后不再反复跳转",
    (viewportWidth) => {
      const state = { ...desktop, viewportWidth };
      const from =
        viewportWidth < 768
          ? state
          : { ...state, pathname: "/mobile/store/store-0" };
      expect(resolveDeviceRedirect(from)).toBe(
        deviceUrl(state, detectDeviceMode(state)),
      );
      const pathname =
        viewportWidth < 768 ? "/mobile/store/store-0" : "/store/store-0";
      expect(resolveDeviceRedirect({ ...state, pathname })).toBeNull();
    },
  );
});

describe("设备状态监听", () => {
  it("初次检测到手机时立即跳转，无须等页面挂载", () => {
    const replace = vi.fn();
    const subscribe = vi.fn();
    const result = watchDeviceRouting({
      read: () => ({ ...desktop, viewportWidth: 393 }),
      replace,
      subscribe,
    });
    expect(result.redirected).toBe(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/store/store-0?category=noodles#dishes",
    );
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("状态变化后使用当前页面地址，并在跳转时清理监听", () => {
    let state = { ...desktop };
    let check = () => {};
    const stop = vi.fn();
    const replace = vi.fn();
    const result = watchDeviceRouting({
      read: () => state,
      replace,
      subscribe(callback) {
        check = callback;
        return stop;
      },
    });
    expect(result.redirected).toBe(false);
    check();
    expect(replace).not.toHaveBeenCalled();
    state = { ...state, pathname: "/orders/order-2", viewportWidth: 393 };
    check();
    check();
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/orders/order-2?category=noodles#dishes",
    );
    expect(stop).toHaveBeenCalledOnce();
  });

  it("卸载或热更新后不再响应设备状态", () => {
    let check = () => {};
    const replace = vi.fn();
    const unsubscribe = vi.fn();
    const state = { ...desktop };
    const result = watchDeviceRouting({
      read: () => state,
      replace,
      subscribe(callback) {
        check = callback;
        return unsubscribe;
      },
    });
    result.stop();
    state.viewportWidth = 393;
    check();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });
});
