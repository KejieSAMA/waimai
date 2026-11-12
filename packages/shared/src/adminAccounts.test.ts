import { describe, it, expect, vi } from "vitest";
import { effectScope } from "vue";
import { useAdminAccounts, type ManagedAccount } from "./adminAccounts";
const account = (id: string): ManagedAccount => ({
  id,
  username: id,
  name: id,
  phone: "",
  roles: ["USER"],
  status: "ACTIVE",
  mustChangePassword: false,
  createdAt: "2026-11-12",
  lastLoginAt: null,
});
function setup(request: Parameters<typeof useAdminAccounts>[0]) {
  const scope = effectScope();
  const m = scope.run(() => useAdminAccounts(request))!;
  return { m, scope };
}
describe("账号管理请求与失败隔离", () => {
  it("切换详情后不应用前一个账号的迟到响应", async () => {
    let first!: (v: ManagedAccount) => void;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ManagedAccount>((r) => {
            first = r;
          }),
      )
      .mockResolvedValueOnce(account("second"));
    const { m, scope } = setup(request);
    const pending = m.open("edit", account("first"));
    await m.open("edit", account("second"));
    first(account("first"));
    await pending;
    expect(m.state.form.username).toBe("second");
    scope.stop();
  });
  it("详情失败时不能用默认角色覆盖账号，重试成功后才允许保存", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("读取失败"))
      .mockResolvedValueOnce(account("target"));
    const { m, scope } = setup(request);
    m.state.list = [account("target")];
    await m.open("edit", account("target"));
    await m.save("roles");
    expect(request).toHaveBeenCalledTimes(1);
    expect(m.state.detailReady).toBe(false);
    await m.retryDetail();
    expect(m.state.detailReady).toBe(true);
    scope.stop();
  });
  it("保存失败保留资料但清除临时密码，并防止并发重复提交", async () => {
    let reject!: (e: Error) => void;
    const request = vi.fn(
      () =>
        new Promise<never>((_, r) => {
          reject = r;
        }),
    );
    const { m, scope } = setup(request);
    await m.open("create");
    m.state.form = {
      username: "new",
      name: "草稿",
      phone: "",
      password: "Temporary-password",
      roles: ["USER"],
    };
    const pending = m.save();
    await m.save();
    expect(request).toHaveBeenCalledTimes(1);
    reject(new Error("服务失败"));
    await pending;
    expect(m.state.form.name).toBe("草稿");
    expect(m.state.form.password).toBe("");
    expect(m.state.open).toBe(true);
    scope.stop();
  });
  it("新查询不会被旧列表响应覆盖，停用导致缩页时退到最后有效页", async () => {
    let first!: (v: unknown) => void;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            first = r;
          }),
      )
      .mockResolvedValueOnce({ list: [account("new")], total: 1 });
    const { m, scope } = setup(request);
    const pending = m.load();
    m.state.keyword = "new";
    await m.query();
    first({ list: [account("old")], total: 50 });
    await pending;
    expect(m.state.list[0].id).toBe("new");
    request.mockResolvedValue({ list: [account("new")], total: 1 });
    m.state.page = 3;
    await m.load();
    expect(m.state.page).toBe(1);
    scope.stop();
  });
});
