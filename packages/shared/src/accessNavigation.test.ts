import { describe, expect, it, vi } from "vitest";
import { effectScope, reactive, ref } from "vue";
import {
  accessNavigationDecision,
  safeReturnTarget,
  targetAllowed,
  useAccessRecovery,
  type AccessTarget,
} from "./accessNavigation";
import { ApiError, type Account } from "./index";
import { createAuthState, type AuthRequest, type Session } from "./authSession";
const account: Account = {
  id: "one",
  username: "test",
  name: "测试",
  phone: "",
  role: "USER",
  roles: ["USER", "MERCHANT"],
};
const target: AccessTarget = {
  path: "/merchant/orders",
  fullPath: "/merchant/orders?status=PENDING&page=2#order",
  role: "MERCHANT",
  protected: true,
  title: "订单",
  valid: true,
};
const access = { path: "/access", fullPath: "/access", protected: true };
const session = (id = "one", role = "USER"): Session => ({
  accessToken: "test",
  activeRole: role as Session["activeRole"],
  user: { ...account, id, role: role as Account["role"] },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

describe("权限恢复与安全回跳", () => {
  it("权限页只改变回跳参数时，迟到切换不跳回旧目标", async () => {
    const result = deferred<void>(),
      navigate = vi.fn();
    const auth = reactive({
      account: { ...account },
      activeRole: "USER" as Account["role"],
      revision: 1,
      switchRole: vi.fn(async () => {
        await result.promise;
        auth.activeRole = "MERCHANT";
      }),
      logout: vi.fn(),
    });
    const current = ref(target),
      scope = effectScope();
    const recovery = scope.run(() =>
      useAccessRecovery(auth, current, navigate),
    )!;
    const pending = recovery.switchIdentity();
    current.value = { ...target, fullPath: "/merchant/orders?page=3" };
    result.resolve();
    await pending;
    expect(navigate).not.toHaveBeenCalled();
    expect(recovery.error.value).toBe("");
    scope.stop();
  });
  it.each([
    undefined,
    [],
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2fexample.test",
    "/%255cexample.test",
    "/%00a",
    "/mobile/admin/orders",
    "/api/v1/auth",
    "/%ZZ",
  ])("拒绝非法回跳 %s", (input) => {
    const resolve = vi.fn(() => target);
    expect(safeReturnTarget(input, resolve)).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });
  it.each([
    "/access",
    "/password",
    "/login",
    "/admin/login",
    "/merchant/login/",
  ])("拒绝认证循环 %s", (path) => {
    expect(safeReturnTarget(path, () => ({ ...target, path }))).toBeUndefined();
  });
  it("按实际匹配路由读取角色、保留完整深链接、拒绝未知路由", () => {
    expect(safeReturnTarget(target.fullPath, () => target)).toEqual(target);
    expect(
      safeReturnTarget("/missing", () => ({ ...target, valid: false })),
    ).toBeUndefined();
  });
  it("游客访问权限页进入目标登录，裸权限页不作为回跳", () => {
    expect(
      accessNavigationDecision(access, undefined, undefined, "guest", target),
    ).toEqual({
      path: "/merchant/login",
      query: { redirect: target.fullPath },
    });
    expect(
      accessNavigationDecision(access, undefined, undefined, "guest"),
    ).toEqual({ path: "/login" });
  });
  it("当前身份未匹配需要确认，未授权保持权限页；授权恢复后原样继续", () => {
    expect(
      accessNavigationDecision(target, account, "USER", "authenticated"),
    ).toEqual({ path: "/access", query: { redirect: target.fullPath } });
    expect(
      accessNavigationDecision(
        access,
        account,
        "USER",
        "authenticated",
        target,
      ),
    ).toBe(true);
    expect(
      accessNavigationDecision(
        access,
        { ...account, roles: ["USER"] },
        "USER",
        "authenticated",
        target,
      ),
    ).toBe(true);
    expect(
      accessNavigationDecision(
        access,
        account,
        "MERCHANT",
        "authenticated",
        target,
      ),
    ).toBe(target.fullPath);
    expect(
      accessNavigationDecision(access, account, "USER", "authenticated"),
    ).toBe("/");
    expect(
      targetAllowed({ ...target, protected: false }, account, "USER"),
    ).toBe(true);
  });
  it("核验失败进入恢复页而非伪装游客，首次改密仍优先", () => {
    expect(
      accessNavigationDecision(target, undefined, undefined, "error"),
    ).toEqual({ path: "/access", query: { redirect: target.fullPath } });
    expect(
      accessNavigationDecision(access, undefined, undefined, "error", target),
    ).toBe(true);
    expect(
      accessNavigationDecision(
        access,
        { ...account, mustChangePassword: true },
        "USER",
        "authenticated",
        target,
      ),
    ).toEqual({ path: "/password", query: { redirect: target.fullPath } });
  });
  it("切换互斥，失败保留会话，成功只去原页面", async () => {
    const result = deferred<void>(),
      navigate = vi.fn();
    const auth = reactive({
      account: { ...account },
      activeRole: "USER" as Account["role"],
      revision: 1,
      switchRole: vi.fn(async () => {
        await result.promise;
        auth.activeRole = "MERCHANT";
      }),
      logout: vi.fn(),
    });
    const scope = effectScope();
    const recovery = scope.run(() =>
      useAccessRecovery(auth, ref(target), navigate),
    )!;
    const pending = recovery.switchIdentity();
    await recovery.switchIdentity();
    expect(auth.switchRole).toHaveBeenCalledTimes(1);
    result.resolve();
    expect(await pending).toBe(true);
    expect(navigate).toHaveBeenCalledWith(target.fullPath);
    auth.activeRole = "USER";
    auth.switchRole.mockRejectedValueOnce(new Error("切换失败"));
    expect(await recovery.switchIdentity()).toBe(false);
    expect(recovery.error.value).toBe("切换失败");
    expect(auth.account.id).toBe("one");
    scope.stop();
  });
  it("更换账号失败保留会话，成功使用目标登录并保留地址", async () => {
    const navigate = vi.fn();
    const auth = reactive({
      account: { ...account } as Account | undefined,
      activeRole: "USER" as Account["role"],
      revision: 1,
      switchRole: vi.fn(),
      logout: vi.fn().mockRejectedValueOnce(new Error("离线")),
    });
    const scope = effectScope(),
      recovery = scope.run(() =>
        useAccessRecovery(auth, ref(target), navigate),
      )!;
    expect(await recovery.changeAccount()).toBe(false);
    expect(auth.account?.id).toBe("one");
    expect(navigate).not.toHaveBeenCalled();
    auth.logout.mockImplementationOnce(async () => {
      auth.account = undefined;
    });
    expect(await recovery.changeAccount()).toBe(true);
    expect(navigate).toHaveBeenCalledWith({
      path: "/merchant/login",
      query: { redirect: target.fullPath },
    });
    scope.stop();
  });
  it("离开或换账号后，迟到切换响应不导航", async () => {
    const result = deferred<void>(),
      navigate = vi.fn();
    const auth = reactive({
      account: { ...account },
      activeRole: "USER" as Account["role"],
      revision: 1,
      switchRole: vi.fn(() => result.promise),
      logout: vi.fn(),
    });
    const scope = effectScope(),
      recovery = scope.run(() =>
        useAccessRecovery(auth, ref(target), navigate),
      )!;
    const pending = recovery.switchIdentity();
    scope.stop();
    auth.account = { ...account, id: "two" };
    result.resolve();
    await pending;
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("会话核验状态与并发", () => {
  it("迟到改密成功响应不清除另一账号，改密失败保留当前账号", async () => {
    const changed = deferred<void>();
    const request = vi.fn(() => changed.promise);
    const auth = createAuthState(request as AuthRequest, vi.fn());
    auth.save("USER", session());
    const pending = auth.changePassword("old", "new-password");
    auth.save("USER", session("two"));
    changed.resolve();
    await expect(pending).rejects.toThrow("身份已变化");
    expect(auth.account.value?.id).toBe("two");
    request.mockRejectedValueOnce(new Error("保存失败"));
    await expect(auth.changePassword("old", "new-password")).rejects.toThrow(
      "保存失败",
    );
    expect(auth.status.value).toBe("authenticated");
    expect(auth.account.value?.id).toBe("two");
  });
  it("登录等待旧核验结束，避免迟到的失效 Cookie 清理覆盖新登录", async () => {
    const old = deferred<Session>();
    const request = vi.fn((path) =>
      path === "/auth/refresh" ? old.promise : Promise.resolve(session("two")),
    );
    const auth = createAuthState(request as AuthRequest, vi.fn());
    const checking = auth.refresh(),
      login = auth.login({ username: "two" });
    expect(request).toHaveBeenCalledTimes(1);
    old.reject(new ApiError(401, "旧会话已失效"));
    await checking;
    await login;
    expect(request).toHaveBeenCalledTimes(2);
    expect(auth.account.value?.id).toBe("two");
    expect(auth.status.value).toBe("authenticated");
  });
  it("切换期间收到外部身份变化，操作结束后重新核验", async () => {
    const switched = deferred<Session>();
    const request = vi.fn((path) =>
      path === "/auth/switch-role"
        ? switched.promise
        : Promise.resolve(session("two")),
    );
    const auth = createAuthState(request as AuthRequest, vi.fn());
    auth.save("USER", session());
    const pending = auth.switchRole("MERCHANT");
    await Promise.resolve();
    auth.externalChange();
    expect(auth.account.value).toBeUndefined();
    switched.resolve(session("one", "MERCHANT"));
    await expect(pending).rejects.toThrow("身份已变化");
    await auth.refresh();
    expect(auth.status.value).toBe("authenticated");
    expect(auth.account.value?.id).toBe("two");
  });
  it("首次核验不展示账号，401 为游客；网络和服务失败可重试", async () => {
    const result = deferred<Session>();
    const request = vi.fn(() => result.promise) as AuthRequest;
    const auth = createAuthState(request, vi.fn());
    expect(auth.status.value).toBe("unknown");
    const pending = auth.refresh();
    expect(auth.status.value).toBe("checking");
    expect(auth.account.value).toBeUndefined();
    result.reject(new ApiError(401, "请重新登录"));
    await pending;
    expect(auth.status.value).toBe("guest");
    const retry = vi
      .fn()
      .mockRejectedValueOnce(new Error("断网"))
      .mockRejectedValueOnce(new ApiError(503, "不可用"))
      .mockResolvedValue(session());
    const next = createAuthState(retry, vi.fn());
    await next.refresh();
    expect(next.status.value).toBe("error");
    expect(next.account.value).toBeUndefined();
    await next.refresh();
    expect(next.status.value).toBe("error");
    await next.refresh();
    expect(next.status.value).toBe("authenticated");
  });
  it("背景核验不闪动，失败后清除身份和令牌", async () => {
    const result = deferred<Session>(),
      auth = createAuthState(
        vi.fn(() => result.promise) as AuthRequest,
        vi.fn(),
      );
    auth.save("USER", session());
    const pending = auth.refresh();
    expect(auth.status.value).toBe("authenticated");
    result.reject(new Error("离线"));
    await pending;
    expect(auth.status.value).toBe("error");
    expect(auth.account.value).toBeUndefined();
    expect(auth.accessToken.value).toBe("");
  });
  it("外部身份变化必须发新核验，不复用旧账号的请求", async () => {
    const old = deferred<Session>(),
      current = deferred<Session>();
    const request = vi
      .fn()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => current.promise);
    const auth = createAuthState(request, vi.fn());
    auth.save("USER", session());
    const pending = auth.refresh();
    auth.externalChange();
    expect(request).toHaveBeenCalledTimes(2);
    expect(auth.account.value).toBeUndefined();
    current.resolve(session("two"));
    await auth.refresh();
    old.resolve(session());
    await pending;
    expect(auth.account.value?.id).toBe("two");
    expect(auth.status.value).toBe("authenticated");
  });
  it("退出完成后迟到刷新不能恢复账号", async () => {
    const result = deferred<Session>();
    const auth = createAuthState(
      vi.fn((path) =>
        path === "/auth/refresh" ? result.promise : Promise.resolve(),
      ) as AuthRequest,
      vi.fn(),
    );
    auth.save("USER", session());
    const pending = auth.refresh();
    await auth.logout();
    result.resolve(session());
    await pending;
    expect(auth.status.value).toBe("guest");
    expect(auth.account.value).toBeUndefined();
  });
});
