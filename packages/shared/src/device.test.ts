import { describe, expect, it, vi } from "vitest";
import {
  detectDeviceMode,
  resolveDeviceRedirect,
  type DeviceRouteState,
  consumeDeviceEntry,
  deviceNavigationUrl,
  watchDeviceRouting,
} from "./device";
const desktop: DeviceRouteState = {
  pathname: "/store/store-0",
  search: "?category=noodles",
  hash: "#dishes",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  platform: "Win32",
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

describe("自动来源仅跨本次跳转", () => {
  it("双向自动分流保留路径、参数和锚点，直接手机版优先", () => {
    expect(
      resolveDeviceRedirect({
        ...desktop,
        pathname: "/mobile/store/store-0",
        automaticEntry: true,
      }),
    ).toBe("/store/store-0?category=noodles#dishes");
    expect(
      resolveDeviceRedirect({
        ...desktop,
        pathname: "/mobile/store/store-0",
        automaticEntry: false,
      }),
    ).toBeNull();
    expect(
      resolveDeviceRedirect({
        ...desktop,
        mobileHint: true,
        automaticEntry: true,
      }),
    ).toBe("/mobile/store/store-0?category=noodles#dishes");
  });
  it.each([
    "",
    "?a=%2Forders%3Fx%3D1",
    "?a=%20&&x=2",
    "?__xz_auto_entry=other",
  ])("传输标记消费后恢复原始查询 %s", (search) => {
    const url = deviceNavigationUrl("/mobile/orders" + search + "#items");
    const taggedSearch = url.slice(url.indexOf("?"), url.indexOf("#"));
    expect(consumeDeviceEntry(taggedSearch)).toEqual({
      automaticEntry: true,
      search,
    });
    expect(consumeDeviceEntry(search)).toEqual({
      automaticEntry: false,
      search,
    });
  });
  it("明确手机版不订阅；自动手机版检测设备改变后只跳转一次并清理监听", () => {
    let state = {
      ...desktop,
      pathname: "/mobile/orders",
      mobileHint: true,
      automaticEntry: false,
    };
    const subscribe = vi.fn(),
      replace = vi.fn();
    expect(
      watchDeviceRouting({ read: () => state, replace, subscribe }).redirected,
    ).toBe(false);
    expect(subscribe).not.toHaveBeenCalled();
    state = { ...state, automaticEntry: true };
    let check = () => {};
    const unsubscribe = vi.fn();
    const routing = watchDeviceRouting({
      read: () => state,
      replace,
      subscribe(callback) {
        check = callback;
        return unsubscribe;
      },
    });
    state = { ...state, mobileHint: false };
    check();
    check();
    routing.stop();
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      "/orders?category=noodles&__xz_auto_entry=1#dishes",
    );
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("按入口分流", () => {
  it.each([
    "/",
    "/merchant",
    "/admin",
    "/store/store-0",
    "/orders/order-1",
    "/merchant/products/product-1/edit",
    "/admin/audit/store-1",
    "/me",
    "/merchant/me",
    "/admin/me",
  ])("无前缀 %s 按设备决定是否跳转且保留完整地址", (pathname) => {
    const state = { ...desktop, pathname };
    expect(resolveDeviceRedirect(state)).toBeNull();
    const target = resolveDeviceRedirect({ ...state, mobileHint: true });
    expect(target).toBe(`/mobile${pathname}${desktop.search}${desktop.hash}`);
    expect(
      resolveDeviceRedirect({
        ...state,
        mobileHint: true,
        pathname: "/mobile" + pathname,
      }),
    ).toBeNull();
  });
  it.each([
    "/mobile",
    "/mobile/",
    "/mobile/store/store-0",
    "/mobile/merchant",
    "/mobile/admin/audit/store-1",
    "/mobile/settings",
    "/mobile/account/profile",
  ])("明确的手机版入口 %s 在电脑和手机均保持", (pathname) => {
    for (const mobileHint of [true, false, undefined])
      expect(
        resolveDeviceRedirect({ ...desktop, pathname, mobileHint }),
      ).toBeNull();
  });
  it("无前缀手机首页进入 /mobile/，电脑首页保留", () => {
    expect(
      resolveDeviceRedirect({
        ...desktop,
        pathname: "/",
        search: "",
        hash: "",
      }),
    ).toBeNull();
    expect(
      resolveDeviceRedirect({
        ...desktop,
        pathname: "/",
        search: "",
        hash: "",
        mobileHint: true,
      }),
    ).toBe("/mobile/");
  });
  it("登录回跳参数原样保留，不解码或重复编码", () => {
    expect(
      resolveDeviceRedirect({
        ...desktop,
        pathname: "/admin/login",
        search: "?redirect=%2Fadmin%2Forders%3Fstatus%3DPENDING",
        hash: "#form",
        mobileHint: true,
      }),
    ).toBe(
      "/mobile/admin/login?redirect=%2Fadmin%2Forders%3Fstatus%3DPENDING#form",
    );
  });
  it.each(["/mobile-store", "/mobiles", "/mobile.html"])(
    "路径 %s 不属于手机版前缀",
    (pathname) => {
      expect(
        resolveDeviceRedirect({ ...desktop, pathname, mobileHint: true }),
      ).toBe(`/mobile${pathname}${desktop.search}${desktop.hash}`);
    },
  );
  it("手机版路径优先于设备信息，不会触发反向跳转", () => {
    const state = {
      ...desktop,
      pathname: "/mobile/",
      get mobileHint(): boolean {
        throw new Error("不应读取设备标识");
      },
    };
    expect(resolveDeviceRedirect(state)).toBeNull();
  });
});
