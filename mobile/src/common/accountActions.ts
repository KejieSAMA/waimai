import { ref } from "vue";
import { roleHome, type Role } from "@waimai/shared";
import { accountLoginPath } from "./accountNavigation";

interface IdentityPort {
  activeRole?: Role;
  account?: { roles?: Role[] };
  switchRole(role: Role): Promise<void>;
  logout(): Promise<void>;
}
export function createAccountActions(
  auth: IdentityPort,
  navigate: (path: string) => Promise<unknown>,
) {
  const pending = ref(false),
    error = ref("");
  async function switchTo(role: Role) {
    if (pending.value) return false;
    error.value = "";
    if (role === auth.activeRole) return true;
    if (!auth.account?.roles?.includes(role)) {
      error.value = "没有该身份权限";
      return false;
    }
    pending.value = true;
    try {
      await auth.switchRole(role);
      if (auth.activeRole !== role) throw new Error("身份已变化，请重新操作");
      await navigate(roleHome(role));
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "切换失败";
      return false;
    } finally {
      pending.value = false;
    }
  }
  async function logout() {
    if (pending.value) return false;
    const role = auth.activeRole;
    pending.value = true;
    error.value = "";
    try {
      await auth.logout();
      if (!auth.account) await navigate(accountLoginPath(role));
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "退出失败";
      return false;
    } finally {
      pending.value = false;
    }
  }
  return { pending, error, switchTo, logout };
}
