import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { invalidateRoleData, useRoleNotices } from "./roleNotices";
import type { Role } from "./index";
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes) scope.stop();
  scopes.length = 0;
});
function setup() {
  const request = vi
    .fn()
    .mockResolvedValue({ pending: 3, pendingProducts: 4, disputesPending: 2 });
  const role = ref<Role>("ADMIN"),
    account = ref<string | undefined>("admin");
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() =>
    useRoleNotices(request, role, account, ref(true)),
  )!;
  return { state, request, role, account, scope };
}
describe("真实待办角标", () => {
  it("审核和纠纷使用独立计数，成功变更触发重读", async () => {
    const { state, request } = setup();
    await Promise.resolve();
    expect(state.badges.value["/admin/audit"]).toBe(3);
    expect(state.badges.value["/admin/disputes"]).toBe(2);
    expect(state.notices.value).toBe(9);
    invalidateRoleData("ADMIN");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("退出登录及卸载清除旧账户数据和监听", async () => {
    const { state, account, request, scope } = setup();
    await Promise.resolve();
    account.value = undefined;
    await nextTick();
    expect(state.notices.value).toBe(0);
    scope.stop();
    const calls = request.mock.calls.length;
    invalidateRoleData("ADMIN");
    expect(request).toHaveBeenCalledTimes(calls);
  });
  it("账户切换后忽略较晚返回的旧统计", async () => {
    const { state, request, account } = setup();
    await Promise.resolve();
    let finish!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const old = state.refresh();
    account.value = "second";
    await nextTick();
    await Promise.resolve();
    finish({ pending: 99, pendingProducts: 99, disputesPending: 99 });
    await old;
    expect(state.notices.value).toBe(9);
  });
});
