import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import { ApiError, createAuthState, type Session } from "@waimai/shared";
import userRoutes from "../roles/user/router";
import merchantRoutes from "../roles/merchant/router";
import adminRoutes from "../roles/admin/router";
import { installAuthNavigation, readAccessTarget } from "./authNavigation";
vi.mock("./auth", () => ({ useAuth: () => auth }));
let auth: ReturnType<typeof makeAuth>;
const request = vi.fn();
function makeAuth() {
  return reactive(createAuthState(request, vi.fn()));
}
const session = (role: "USER" | "ADMIN" | "MERCHANT" = "USER"): Session => ({
  accessToken: "test",
  activeRole: role,
  user: {
    id: "test",
    username: "test",
    name: "测试",
    phone: "",
    role,
    roles: ["USER", "ADMIN", "MERCHANT"],
  },
});
let stop: (() => void) | undefined;
function plain(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map((record) => ({
    ...record,
    ...(!record.redirect ? { component: {} } : {}),
    ...(record.children ? { children: plain(record.children) } : {}),
  })) as RouteRecordRaw[];
}
function routerFor(base = "/") {
  const router = createRouter({
    history: createMemoryHistory(base),
    routes: [
      ...plain([...userRoutes, ...merchantRoutes, ...adminRoutes]),
      {
        path: "/access",
        component: {},
        meta: { protected: true, accessArea: true },
      },
      { path: "/password", component: {}, meta: { protected: true } },
      { path: "/:pathMatch(.*)*", redirect: "/" },
    ],
  });
  stop = installAuthNavigation(router);
  return router;
}
beforeEach(() => {
  vi.stubGlobal("document", { title: "" });
  request.mockReset();
  request.mockRejectedValue(new ApiError(401, "请重新登录"));
  auth = makeAuth();
});
afterEach(() => {
  stop?.();
  vi.unstubAllGlobals();
});
async function settle() {
  await nextTick();
  await new Promise((r) => setTimeout(r, 0));
}

describe("账号路由实际集成", () => {
  it("游客直接访问后台进入对应登录，保留查询和锚点", async () => {
    const router = routerFor();
    await router.push("/admin/accounts?page=2#list");
    expect(router.currentRoute.value.path).toBe("/admin/login");
    expect(router.currentRoute.value.query.redirect).toBe(
      "/admin/accounts?page=2#list",
    );
    expect(auth.account).toBeUndefined();
    expect(auth.status).toBe("guest");
  });
  it("裸权限页游客进入登录，不回跳权限页", async () => {
    const router = routerFor();
    await router.push("/access");
    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.redirect).toBeUndefined();
  });
  it("认证失败先展示恢复页，重试成功后恢复原页面而非继续登录", async () => {
    request.mockRejectedValueOnce(new Error("网络失败"));
    const router = routerFor();
    await router.push("/merchant/orders?status=PENDING&page=2#order");
    expect(auth.status).toBe("error");
    expect(router.currentRoute.value.path).toBe("/access");
    expect(auth.account).toBeUndefined();
    request.mockResolvedValueOnce(session("MERCHANT"));
    await auth.refresh();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe(
      "/merchant/orders?status=PENDING&page=2#order",
    );
  });
  it("授权身份必须确认，切换后恢复原页面，旁路角色参数无效", async () => {
    request.mockResolvedValue(session());
    const router = routerFor();
    await router.push("/merchant/orders?status=PENDING#order");
    expect(router.currentRoute.value.path).toBe("/access");
    expect(auth.activeRole).toBe("USER");
    const target = readAccessTarget(
      router,
      router.currentRoute.value.query.redirect,
    );
    expect(target?.role).toBe("MERCHANT");
    await router.replace({
      path: "/access",
      query: { redirect: target!.fullPath, role: "ADMIN" },
    });
    expect(
      readAccessTarget(router, router.currentRoute.value.query.redirect)?.role,
    ).toBe("MERCHANT");
    request.mockResolvedValue(session("MERCHANT"));
    await auth.switchRole("MERCHANT");
    await settle();
    expect(router.currentRoute.value.fullPath).toBe(
      "/merchant/orders?status=PENDING#order",
    );
  });
  it("会话作废后立即离开业务页，不显示旧账号", async () => {
    request.mockResolvedValue(session("ADMIN"));
    const router = routerFor();
    await router.push("/admin/accounts");
    request.mockRejectedValueOnce(new ApiError(401, "已失效"));
    await auth.refresh();
    await settle();
    expect(auth.account).toBeUndefined();
    expect(router.currentRoute.value.path).toBe("/admin/login");
  });
  it("身份变化时等待新的会话核验，不提前丢弃原访问目标", async () => {
    request.mockResolvedValue(session("ADMIN"));
    const router = routerFor();
    await router.push("/admin/accounts?page=2");
    let resolve!: (value: Session) => void;
    request.mockImplementationOnce(
      () =>
        new Promise<Session>((r) => {
          resolve = r;
        }),
    );
    auth.externalChange();
    await settle();
    expect(router.currentRoute.value.fullPath).toBe("/admin/accounts?page=2");
    expect(auth.account).toBeUndefined();
    resolve(session());
    await auth.refresh();
    await settle();
    expect(router.currentRoute.value.path).toBe("/access");
    expect(router.currentRoute.value.query.redirect).toBe(
      "/admin/accounts?page=2",
    );
  });
  it("手机路由基址和非法回跳均经过同一路由校验", () => {
    const router = routerFor("/mobile/");
    const target = readAccessTarget(router, "/orders/id?from=list#item");
    expect(target?.fullPath).toBe("/orders/id?from=list#item");
    expect(router.resolve(target!.fullPath).href).toBe(
      "/mobile/orders/id?from=list#item",
    );
    for (const raw of [
      "//evil.test",
      "/missing",
      "/mobile/orders",
      "/access",
      "/admin/login",
      "/password",
    ])
      expect(readAccessTarget(router, raw)).toBeUndefined();
  });
});
