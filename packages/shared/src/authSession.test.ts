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
  it("资料读取与写入交错时只应用最新请求，失败保留当前资料", async () => {
    let resolve!: (s: Session) => void;
    const request = vi.fn((_path: string, _body: unknown, method?: string) =>
      method === "GET"
        ? new Promise<Session>((r) => {
            resolve = r;
          })
        : Promise.resolve({
            ...session(),
            user: { ...session().user, name: "新昵称" },
          }),
    );
    const state = createAuthState(request as AuthRequest, vi.fn());
    state.save("USER", session());
    const reading = state.readProfile();
    await state.updateProfile({ name: "新昵称", phone: "" });
    resolve(session());
    await expect(reading).rejects.toThrow("身份已变化");
    expect(state.account.value?.name).toBe("新昵称");
    request.mockRejectedValueOnce(new Error("网络失败"));
    await expect(
      state.updateProfile({ name: "失败", phone: "" }),
    ).rejects.toThrow("网络失败");
    expect(state.account.value?.name).toBe("新昵称");
  });
  it.each(["account", "role"] as const)(
    "本人资料响应 %s 不匹配时不应用",
    async (mismatch) => {
      const request = vi
        .fn()
        .mockResolvedValue(
          session(
            mismatch === "account" ? "another" : "user",
            mismatch === "role" ? "ADMIN" : "USER",
          ),
        );
      const state = createAuthState(request as AuthRequest, vi.fn());
      state.save("USER", session());
      await expect(state.readProfile()).rejects.toThrow("身份已变化");
      expect(state.account.value?.id).toBe("user");
      expect(state.activeRole.value).toBe("USER");
    },
  );
  it("资料保存更新当前账号，保留当前令牌与业务视图版本", async () => {
    const current = session();
    const request = vi.fn().mockResolvedValue({
      ...current,
      user: { ...current.user, name: "新昵称", phone: "" },
    });
    const state = createAuthState(request as AuthRequest, vi.fn());
    state.save("USER", current);
    const revision = state.revision.value;
    await state.updateProfile({ name: "新昵称", phone: "" });
    expect(request).toHaveBeenCalledWith(
      "/auth/me",
      { name: "新昵称", phone: "" },
      "PUT",
    );
    expect(state.account.value?.name).toBe("新昵称");
    expect(state.revision.value).toBe(revision);
    expect(state.accessToken.value).toBe(current.accessToken);
  });
  it.each(["switch", "logout", "login"] as const)(
    "迟到资料响应不能覆盖 %s 后身份",
    async (kind) => {
      let resolve!: (s: Session) => void;
      const request = vi.fn(
        () =>
          new Promise<Session>((r) => {
            resolve = r;
          }),
      );
      const state = createAuthState(request as AuthRequest, vi.fn());
      state.save("USER", session());
      const pending = state.updateProfile({ name: "旧请求", phone: "" });
      if (kind === "logout") state.clear();
      else
        state.save(
          kind === "switch" ? "ADMIN" : "USER",
          session(
            kind === "switch" ? "user" : "new-account",
            kind === "switch" ? "ADMIN" : "USER",
          ),
        );
      resolve({ ...session(), user: { ...session().user, name: "旧请求" } });
      await expect(pending).rejects.toThrow("身份已变化");
      expect(state.account.value?.name).not.toBe("旧请求");
    },
  );
  it("资料写入成功后，旧刷新结果不能覆盖新昵称", async () => {
    let resolve!: (s: Session) => void;
    const request = vi.fn((path: string) =>
      path === "/auth/refresh"
        ? new Promise<Session>((r) => {
            resolve = r;
          })
        : Promise.resolve({
            ...session(),
            user: { ...session().user, name: "新昵称" },
          }),
    );
    const state = createAuthState(request as AuthRequest, vi.fn());
    state.save("USER", session());
    const refreshing = state.refresh();
    await state.updateProfile({ name: "新昵称", phone: "" });
    resolve(session());
    await refreshing;
    expect(state.account.value?.name).toBe("新昵称");
  });
  it("迟到退出响应不会清除新账号，失败退出保留会话", async () => {
    let resolve!: () => void;
    const request = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const state = createAuthState(request as AuthRequest, vi.fn());
    state.save("USER", session());
    const exiting = state.logout();
    state.save("USER", session("new-account"));
    resolve();
    await expect(exiting).rejects.toThrow("身份已变化");
    expect(state.account.value?.id).toBe("new-account");
    const failing = createAuthState(
      vi.fn().mockRejectedValue(new Error("离线")) as AuthRequest,
      vi.fn(),
    );
    failing.save("USER", session());
    await expect(failing.logout()).rejects.toThrow("离线");
    expect(failing.account.value?.id).toBe("user");
  });
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
