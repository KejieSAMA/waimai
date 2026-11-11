import { describe, expect, it, vi } from "vitest";
import {
  detectDeviceMode,
  deviceUrl,
  parseDevicePreference,
  resolveDeviceRedirect,
  watchDeviceRouting,
  type DevicePreference,
  type DeviceRouteState,
} from "./device";

const desktop: DeviceRouteState = {
  pathname: "/store/store-0",
  search: "?category=noodles",
  hash: "#dishes",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  platform: "Win32",
  preference: null,
};

describe("浏览器设备识别", () => {
  it("Client Hints 为 true 时优先使用手机标识", () => {
    expect(detectDeviceMode({ ...desktop, mobileHint: true })).toBe("mobile");
  });

  it("Client Hints 明确为 false 时不会被手机 UA 或触屏信号覆盖", () => {
    expect(
      detectDeviceMode({
        userAgent: "iPhone Mobile",
        platform: "MacIntel",
        maxTouchPoints: 5,
        mobileHint: false,
      }),
    ).toBe("desktop");
  });

  it.each(["iPhone Mobile", "Android Mobile", "iPad", "Windows Phone Mobile"])(
    "缺少 Client Hints 时通过 UA 识别 %s",
    (userAgent) => {
      expect(detectDeviceMode({ ...desktop, userAgent })).toBe("mobile");
    },
  );

  it("没有 Client Hints 的桌面 UA iPad 使用平台和触控辅助识别", () => {
    const state = {
      userAgent: "Macintosh",
      platform: "MacIntel",
      maxTouchPoints: 5,
    };
    expect(detectDeviceMode(state)).toBe("mobile");
    expect(detectDeviceMode({ ...state, maxTouchPoints: 1 })).toBe("desktop");
    expect(detectDeviceMode({ ...state, platform: "Win32" })).toBe("desktop");
  });

  it("Windows 多点触控电脑仍使用 PC 版，未知设备默认 PC", () => {
    expect(detectDeviceMode({ ...desktop, maxTouchPoints: 10 })).toBe(
      "desktop",
    );
    expect(detectDeviceMode({ userAgent: "" })).toBe("desktop");
  });
});

describe("设备偏好格式与作用范围", () => {
  it.each([
    "mobile",
    "desktop",
    '"mobile"',
    '"desktop"',
    "",
    "broken",
    "null",
    "[]",
    '{"version":1,"mode":"mobile","detectedMode":"desktop"}',
    '{"version":2,"mode":"mobile"}',
    '{"version":2,"mode":"invalid","detectedMode":"desktop"}',
    '{"version":2,"mode":"mobile","detectedMode":"invalid"}',
  ])("忽略旧偏好或无效记录 %s", (raw) => {
    expect(parseDevicePreference(raw)).toBeNull();
  });

  it("无存储时正常自动识别", () => {
    expect(parseDevicePreference(null)).toBeNull();
  });

  it.each(["mobile", "desktop"] as const)("读取版本化的 %s 偏好", (mode) => {
    const preference: DevicePreference = {
      version: 2,
      mode,
      detectedMode: "desktop",
    };
    expect(parseDevicePreference(JSON.stringify(preference))).toEqual(
      preference,
    );
  });

  it("同一设备状态下应用手动选择，但不改变设备识别结果", () => {
    const state: DeviceRouteState = {
      ...desktop,
      preference: { version: 2, mode: "mobile", detectedMode: "desktop" },
    };
    expect(detectDeviceMode(state)).toBe("desktop");
    expect(resolveDeviceRedirect(state)).toBe(
      "/mobile/store/store-0?category=noodles#dishes",
    );
    expect(
      resolveDeviceRedirect({ ...state, pathname: "/mobile/store/store-0" }),
    ).toBeNull();
  });

  it("设备状态改变后不再应用此前的版本选择", () => {
    const state: DeviceRouteState = {
      ...desktop,
      mobileHint: true,
      preference: { version: 2, mode: "desktop", detectedMode: "desktop" },
    };
    expect(resolveDeviceRedirect(state)).toBe(
      "/mobile/store/store-0?category=noodles#dishes",
    );
    expect(
      resolveDeviceRedirect({
        ...state,
        mobileHint: false,
        pathname: "/mobile/store/store-0",
        preference: { version: 2, mode: "mobile", detectedMode: "mobile" },
      }),
    ).toBe("/store/store-0?category=noodles#dishes");
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
  ])("双向切换保留页面 %s", (pathname) => {
    expect(deviceUrl({ ...desktop, pathname }, "mobile")).toBe(
      `/mobile${pathname}${desktop.search}${desktop.hash}`,
    );
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

  it.each([
    ["/", false, null],
    ["/", true, "/mobile/"],
    ["/mobile/", false, "/"],
    ["/mobile/", true, null],
  ] as const)(
    "首页 %s 的手机标识 %s 对应 %s",
    (pathname, mobileHint, expected) => {
      expect(
        resolveDeviceRedirect({
          ...desktop,
          pathname,
          search: "",
          hash: "",
          mobileHint,
        }),
      ).toBe(expected);
    },
  );

  it.each([true, false])(
    "设备标识为 %s 时双端判断一致，跳转后不再重复",
    (mobileHint) => {
      const state = { ...desktop, mobileHint };
      const from = mobileHint
        ? state
        : { ...state, pathname: "/mobile/store/store-0" };
      expect(resolveDeviceRedirect(from)).toBe(
        deviceUrl(state, detectDeviceMode(state)),
      );
      const pathname = mobileHint ? "/mobile/store/store-0" : "/store/store-0";
      expect(resolveDeviceRedirect({ ...state, pathname })).toBeNull();
    },
  );
});

describe("设备状态监听", () => {
  it("初次检测到手机时立即跳转，无须等页面挂载", () => {
    const replace = vi.fn();
    const subscribe = vi.fn();
    const result = watchDeviceRouting({
      read: () => ({ ...desktop, mobileHint: true }),
      replace,
      subscribe,
    });
    expect(result.redirected).toBe(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/store/store-0?category=noodles#dishes",
    );
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("状态变化使用当前页面地址，并在跳转时清理监听", () => {
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
    state = { ...state, pathname: "/orders/order-2", mobileHint: true };
    check();
    check();
    result.stop();
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      "/mobile/orders/order-2?category=noodles#dishes",
    );
    expect(stop).toHaveBeenCalledOnce();
  });

  it("卸载或热更新后不再响应设备状态，重复清理安全", () => {
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
    result.stop();
    state.mobileHint = true;
    check();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });
});
