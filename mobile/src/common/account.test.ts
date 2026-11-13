import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import {
  accountLoginPath,
  accountMePath,
  accountPageRole,
  accountShortcuts,
  adminAccountTools,
} from "./accountNavigation";
import { createAccountActions } from "./accountActions";
import { profileLeaveDecision, useProfileEditor } from "./profileEditor";
import { useMerchantProfile } from "./merchantProfile";
import type { Account, Role, Store } from "@waimai/shared";
const account: Account = {
  id: "u",
  name: "昵称",
  phone: "13912345678",
  username: "account",
  role: "USER",
  roles: ["USER", "ADMIN"],
};
const flush = async () => {
  await Promise.resolve();
  await nextTick();
};
describe("手机账号页面路径与身份", () => {
  it.each(["USER", "MERCHANT", "ADMIN"] as const)(
    "%s 公共页面沿用当前身份，并有独立返回与登录路径",
    (role) => {
      expect(accountPageRole(undefined, true, role)).toBe(role);
      expect(accountPageRole("USER", false, role)).toBe("USER");
      expect(accountMePath(role)).toBe(
        role === "USER" ? "/me" : `/${role.toLowerCase()}/me`,
      );
      expect(accountLoginPath(role)).toBe(
        role === "USER" ? "/login" : `/${role.toLowerCase()}/login`,
      );
    },
  );
  it("快捷入口只包含现有业务路由，不混入偏好与电脑版入口", () => {
    expect(accountShortcuts.USER.map((item) => item.path)).toEqual([
      "/orders",
      "/addresses",
    ]);
    expect(accountShortcuts.MERCHANT).toHaveLength(3);
    expect(accountShortcuts.ADMIN).toHaveLength(3);
    expect(adminAccountTools.map((item) => item.path)).toEqual([
      "/admin/products",
      "/admin/orders",
      "/admin/disputes",
      "/admin/categories",
    ]);
  });
});
describe("身份切换与退出", () => {
  const port = () => ({
    activeRole: "USER" as Role | undefined,
    account: { roles: ["USER", "ADMIN"] as Role[] } as
      { roles: Role[] } | undefined,
    switchRole: vi.fn(),
    logout: vi.fn(),
  });
  it("当前角色仅关闭，未授权角色不发送请求", async () => {
    const auth = port(),
      go = vi.fn();
    const actions = createAccountActions(auth, go);
    expect(await actions.switchTo("USER")).toBe(true);
    expect(await actions.switchTo("MERCHANT")).toBe(false);
    expect(auth.switchRole).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });
  it("切换互斥，失败显示原因且允许重试", async () => {
    const auth = port(),
      go = vi.fn();
    let reject!: (e: Error) => void;
    auth.switchRole.mockImplementationOnce(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    );
    const actions = createAccountActions(auth, go);
    const pending = actions.switchTo("ADMIN");
    expect(actions.pending.value).toBe(true);
    expect(await actions.switchTo("ADMIN")).toBe(false);
    expect(auth.switchRole).toHaveBeenCalledTimes(1);
    reject(new Error("没有权限"));
    expect(await pending).toBe(false);
    expect(actions.error.value).toBe("没有权限");
    auth.switchRole.mockImplementationOnce(async () => {
      auth.activeRole = "ADMIN";
    });
    expect(await actions.switchTo("ADMIN")).toBe(true);
    expect(go).toHaveBeenCalledWith("/admin/overview");
  });
  it("退出失败保留会话且互斥，成功进入发起时角色登录页", async () => {
    const auth = port(),
      go = vi.fn();
    auth.activeRole = "MERCHANT";
    let reject!: (e: Error) => void;
    auth.logout.mockImplementationOnce(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    );
    const actions = createAccountActions(auth, go);
    const exiting = actions.logout();
    expect(await actions.logout()).toBe(false);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    reject(new Error("网络失败"));
    expect(await exiting).toBe(false);
    expect(auth.account).toBeDefined();
    expect(go).not.toHaveBeenCalled();
    auth.logout.mockImplementationOnce(async () => {
      auth.account = undefined;
      auth.activeRole = undefined;
    });
    expect(await actions.logout()).toBe(true);
    expect(go).toHaveBeenCalledWith("/merchant/login");
  });
});
describe("资料编辑草稿与请求隔离", () => {
  it("脏草稿正常离开须确认、保存时锁定，身份失效始终放行安全跳转", () => {
    expect(profileLeaveDecision(false, false, true)).toBe("allow");
    expect(profileLeaveDecision(true, false, true)).toBe("confirm");
    expect(profileLeaveDecision(true, true, true)).toBe("block");
    expect(profileLeaveDecision(true, false, false)).toBe("allow");
    expect(profileLeaveDecision(true, true, false)).toBe("allow");
  });
  it("未修改禁用，修改后可触发校验且无效输入不请求，清空手机后成功采用服务端值", async () => {
    const scope = effectScope();
    const save = vi
      .fn()
      .mockResolvedValue({ ...account, name: "新昵称", phone: "" });
    const editor = scope.run(() =>
      useProfileEditor({ read: async () => account, save }),
    )!;
    await flush();
    expect(editor.canSave.value).toBe(false);
    editor.name.value = "";
    expect(editor.canSave.value).toBe(true);
    expect(await editor.save()).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(editor.feedback.first.value).toBe("name");
    editor.name.value = " 新昵称 ";
    editor.phone.value = "bad";
    expect(editor.canSave.value).toBe(true);
    expect(await editor.save()).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(editor.feedback.first.value).toBe("phone");
    editor.phone.value = "";
    expect(editor.canSave.value).toBe(true);
    expect(await editor.save()).toBe(true);
    expect(save).toHaveBeenCalledWith({ name: "新昵称", phone: "" });
    expect(editor.dirty.value).toBe(false);
    scope.stop();
  });
  it("加载失败可重试，保存失败保留输入，保存期间重复请求被阻止", async () => {
    const scope = effectScope(),
      read = vi
        .fn()
        .mockRejectedValueOnce(new Error("加载失败"))
        .mockResolvedValue(account);
    let reject!: (e: Error) => void;
    const save = vi.fn(
      () =>
        new Promise<Account>((_, r) => {
          reject = r;
        }),
    );
    const editor = scope.run(() => useProfileEditor({ read, save }))!;
    await flush();
    expect(editor.loaded.value).toBe(false);
    expect(editor.canSave.value).toBe(false);
    await editor.load();
    editor.name.value = "新昵称";
    const saving = editor.save();
    expect(await editor.save()).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    reject(new Error("保存失败"));
    expect(await saving).toBe(false);
    expect(editor.name.value).toBe("新昵称");
    expect(editor.dirty.value).toBe(true);
    scope.stop();
  });
  it("卸载后加载与保存结果不再更新页面", async () => {
    const scope = effectScope();
    let resolve!: (a: Account) => void;
    const editor = scope.run(() =>
      useProfileEditor({
        read: () =>
          new Promise<Account>((r) => {
            resolve = r;
          }),
        save: vi.fn(),
      }),
    )!;
    scope.stop();
    resolve(account);
    await flush();
    expect(editor.loaded.value).toBe(false);
    const secondScope = effectScope();
    let finish!: (a: Account) => void;
    const second = secondScope.run(() =>
      useProfileEditor({
        read: async () => account,
        save: () =>
          new Promise<Account>((r) => {
            finish = r;
          }),
      }),
    )!;
    await flush();
    second.name.value = "新昵称";
    const pending = second.save();
    secondScope.stop();
    finish({ ...account, name: "新昵称" });
    expect(await pending).toBe(false);
    expect(second.dirty.value).toBe(true);
  });
});
describe("商家我的店铺入口", () => {
  it.each([null, "PENDING", "REJECTED", "OPEN", "CLOSED", "FROZEN"])(
    "状态 %s 只生成一个正确入口",
    async (status) => {
      const scope = effectScope();
      const state = scope.run(() =>
        useMerchantProfile(async () =>
          status ? ({ name: "店铺", status } as Store) : null,
        ),
      )!;
      expect(state.entry.value).toBeNull();
      await flush();
      expect(state.entry.value?.key).toBe(
        !status || ["PENDING", "REJECTED"].includes(status)
          ? "/merchant/apply"
          : "/merchant/store",
      );
      scope.stop();
    },
  );
  it("加载失败不显示错误入口，可重试；卸载忽略迟到资料", async () => {
    const scope = effectScope(),
      request = vi
        .fn()
        .mockRejectedValueOnce(new Error("店铺加载失败"))
        .mockResolvedValue(null);
    const state = scope.run(() => useMerchantProfile(request))!;
    await flush();
    expect(state.entry.value).toBeNull();
    await state.load();
    expect(state.entry.value?.key).toBe("/merchant/apply");
    scope.stop();
    const other = effectScope();
    let resolve!: (s: Store | null) => void;
    const late = other.run(() =>
      useMerchantProfile(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    )!;
    other.stop();
    resolve(null);
    await flush();
    expect(late.store.value).toBeUndefined();
  });
});
