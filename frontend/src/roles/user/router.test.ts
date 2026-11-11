import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import routes from "./router";

const router = createRouter({ history: createMemoryHistory(), routes });

describe("PC 个人中心公共布局", () => {
  it.each([
    ["/orders", "/orders", "/orders"],
    ["/orders/order-1?source=list#review", "/orders", "/orders"],
    ["/addresses", "/addresses", "/orders"],
    ["/me", "/me", "/me"],
  ])("%s 保留同一账号导航及正确选中项", (path, accountNav, siteNav) => {
    const route = router.resolve(path);
    expect(route.matched).toHaveLength(2);
    expect(route.matched[0].name).toBe("user-account");
    expect(route.meta).toMatchObject({
      role: "USER",
      protected: true,
      accountNav,
      siteNav,
    });
  });

  it("订单、地址、设置与详情切换共用同一个父路由实例", () => {
    const parent = router.resolve("/orders").matched[0];
    for (const path of ["/addresses", "/me", "/orders/order-2", "/orders"])
      expect(router.resolve(path).matched[0]).toBe(parent);
  });

  it.each(["/", "/store/store-1", "/checkout", "/login"])(
    "%s 不误用个人中心侧栏或继承其登录规则",
    (path) => {
      const route = router.resolve(path);
      expect(route.matched).toHaveLength(1);
      expect(route.meta.accountNav).toBeUndefined();
      expect(route.matched[0].name).not.toBe("user-account");
      expect(route.meta.protected === true).toBe(path === "/checkout");
    },
  );
});
