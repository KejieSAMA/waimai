import { describe, it, expect, vi } from "vitest";
import {
  createAuthState,
  accountRouteDecision,
  type AuthRequest,
  type Session,
} from "./authSession";
const session = (id = "user", role: "USER" | "ADMIN" = "USER"): Session => ({
  accessToken: id + role,
  activeRole: role,
  user: { id, phone: "", name: id, role, roles: ["USER", "ADMIN"] },
});
describe("共享账号会话隔离", () => {
  it("保存当前身份时不会保留原身份的令牌", () => {
    const state = createAuthState(vi.fn() as AuthRequest, vi.fn());
    state.save("USER", session());
    state.save("ADMIN", session("other", "ADMIN"));
    expect(state.tokens.value.USER).toBeUndefined();
    expect(state.accounts.value.USER).toBeUndefined();
    expect(state.accounts.value.ADMIN?.id).toBe("other");
  });
  it("拒绝未包含当前身份的授权响应", () => {
    const state = createAuthState(vi.fn() as AuthRequest, vi.fn());
    expect(() =>
      state.save("ADMIN", {
        ...session("bad", "ADMIN"),
        user: { ...session().user, role: "ADMIN", roles: ["USER"] },
      }),
    ).toThrow();
  });
  it("迟到刷新响应不能恢复已退出账号", async () => {
    let resolve!: (s: Session) => void;
    const request = vi.fn(
      () =>
        new Promise<Session>((r) => {
          resolve = r;
        }),
    ) as AuthRequest;
    const state = createAuthState(request, vi.fn());
    const pending = state.refresh();
    state.clear();
    resolve(session());
    await pending;
    expect(state.account.value).toBeUndefined();
  });
  it("按目标角色恢复时只恢复服务端当前身份，不隐式切换", async () => {
    const request = vi.fn().mockResolvedValue(session()) as AuthRequest;
    const state = createAuthState(request, vi.fn());
    expect(await state.refresh("ADMIN")).toBe(false);
    expect(state.activeRole.value).toBe("USER");
  });
  it("刷新同一身份不销毁业务视图；切换身份才增加版本", async () => {
    const request = vi.fn().mockResolvedValue(session()) as AuthRequest;
    const state = createAuthState(request, vi.fn());
    await state.refresh();
    const version = state.revision.value;
    await state.refresh();
    expect(state.revision.value).toBe(version);
    state.save("ADMIN", session("user", "ADMIN"));
    expect(state.revision.value).toBeGreaterThan(version);
  });
  it("账号变更信号先清理缓存，再恢复新会话", async () => {
    const request = vi.fn().mockResolvedValue(session("new")) as AuthRequest;
    const state = createAuthState(request, vi.fn());
    state.save("USER", session("old"));
    state.externalChange();
    expect(state.account.value).toBeUndefined();
    await state.refresh();
    expect(state.account.value?.id).toBe("new");
  });
});

describe("账号角色路由约束", () => {
  it.each(["ADMIN", "MERCHANT"] as const)(
    "用户身份不能通过 %s 后台路由",
    (role) => {
      expect(
        accountRouteDecision(
          {
            path: "/" + role.toLowerCase(),
            fullPath: "/" + role.toLowerCase(),
            protected: true,
            role,
          },
          session().user,
          "USER",
        ),
      ).toBe("/access");
    },
  );
  it("已授权但非当前身份也必须显式切换", () => {
    expect(
      accountRouteDecision(
        {
          path: "/admin/accounts",
          fullPath: "/admin/accounts",
          protected: true,
          role: "ADMIN",
        },
        session().user,
        "USER",
      ),
    ).toBe("/access");
  });
  it("当前管理员可访问管理页", () => {
    expect(
      accountRouteDecision(
        {
          path: "/admin/accounts",
          fullPath: "/admin/accounts",
          protected: true,
          role: "ADMIN",
        },
        session("admin", "ADMIN").user,
        "ADMIN",
      ),
    ).toBe(true);
  });
  it("未登录保留后台深链接", () => {
    expect(
      accountRouteDecision(
        {
          path: "/admin/accounts",
          fullPath: "/admin/accounts?page=2",
          protected: true,
          role: "ADMIN",
        },
        undefined,
        undefined,
      ),
    ).toEqual({
      path: "/admin/login",
      query: { redirect: "/admin/accounts?page=2" },
    });
  });
  it("必须改密时阻止业务访问，但允许改密页面", () => {
    const account = { ...session().user, mustChangePassword: true };
    expect(
      accountRouteDecision(
        { path: "/orders", fullPath: "/orders", protected: true, role: "USER" },
        account,
        "USER",
      ),
    ).toBe("/password");
    expect(
      accountRouteDecision(
        { path: "/password", fullPath: "/password", protected: true },
        account,
        "USER",
      ),
    ).toBe(true);
  });
  it("退出失败不会伪装注销成功", async () => {
    const state = createAuthState(
      vi.fn().mockRejectedValue(new Error("离线")) as AuthRequest,
      vi.fn(),
    );
    state.save("USER", session());
    await expect(state.logout()).rejects.toThrow("离线");
    expect(state.account.value?.id).toBe("user");
  });
  it("游客恢复失败不重复增加身份版本，避免公开页面刷新循环", async () => {
    const state = createAuthState(
      vi.fn().mockRejectedValue(new Error("未登录")) as AuthRequest,
      vi.fn(),
    );
    await state.refresh();
    await state.refresh();
    expect(state.revision.value).toBe(0);
    state.save("USER", session());
    await state.refresh();
    expect(state.account.value).toBeUndefined();
    const revision = state.revision.value;
    await state.refresh();
    expect(state.revision.value).toBe(revision);
  });
});
