import { computed, onScopeDispose, ref, type Ref } from "vue";
import type { Account, Role } from "./index";
import {
  accountRouteDecision,
  roleHome,
  type SessionStatus,
} from "./authSession";

export const identityLabels: Record<Role, string> = {
  USER: "用户",
  MERCHANT: "商家",
  ADMIN: "管理员",
};
export const accountLoginPath = (role?: Role) =>
  role && role !== "USER" ? `/${role.toLowerCase()}/login` : "/login";
export const accountMePath = (role?: Role) =>
  role && role !== "USER" ? `/${role.toLowerCase()}/me` : "/me";
export interface AccessTarget {
  path: string;
  fullPath: string;
  role?: Role;
  protected?: boolean;
  title?: string;
  valid: boolean;
}
export interface AccountRedirect {
  path: string;
  query?: { redirect: string };
}
export type AccountDestination = string | AccountRedirect;

/** The application resolves against its own router/base; role and title never come from query fields. */
export function safeReturnTarget(
  input: unknown,
  resolve: (path: string) => AccessTarget,
): AccessTarget | undefined {
  if (
    typeof input !== "string" ||
    input.length > 4096 ||
    !input.startsWith("/")
  )
    return;
  let path = input.split(/[?#]/, 1)[0];
  try {
    for (let i = 0; i < 2; i++) path = decodeURIComponent(path);
  } catch {
    return;
  }
  if (
    /^\/\//.test(path) ||
    [...path].some(
      (char) =>
        char === "\\" || char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
    ) ||
    /^\/(mobile|api|uploads)(\/|$)/.test(path)
  )
    return;
  try {
    const target = resolve(input);
    if (
      !target.valid ||
      /^\/(access|password)(\/|$)/.test(target.path) ||
      /\/login\/?$/.test(target.path)
    )
      return;
    return target;
  } catch {
    return;
  }
}
export function targetAllowed(
  target: AccessTarget,
  account?: Account,
  role?: Role,
) {
  return (
    !target.protected ||
    (!!account &&
      (!target.role ||
        (role === target.role && !!account.roles?.includes(target.role))))
  );
}
export function loginDestination(target?: AccessTarget): AccountRedirect {
  return {
    path: accountLoginPath(target?.role),
    ...(target ? { query: { redirect: target.fullPath } } : {}),
  };
}
export function accessNavigationDecision(
  to: { path: string; fullPath: string; protected?: boolean; role?: Role },
  account: Account | undefined,
  role: Role | undefined,
  status: SessionStatus,
  target?: AccessTarget,
): true | AccountDestination {
  if (status === "checking" || status === "unknown") return true;
  if (status === "error")
    return to.protected && to.path !== "/access"
      ? { path: "/access", query: { redirect: to.fullPath } }
      : true;
  if (to.path === "/access") {
    if (!account) return loginDestination(target);
    if (account.mustChangePassword)
      return target
        ? { path: "/password", query: { redirect: target.fullPath } }
        : "/password";
    if (!target) return roleHome(role);
    return targetAllowed(target, account, role) ? target.fullPath : true;
  }
  return accountRouteDecision(to, account, role);
}

interface AccessIdentity {
  account?: Account;
  activeRole?: Role;
  revision: number;
  switchRole(role: Role): Promise<void>;
  logout(): Promise<void>;
}
export function useAccessRecovery(
  auth: AccessIdentity,
  target: Ref<AccessTarget | undefined>,
  navigate: (to: AccountDestination) => Promise<unknown>,
) {
  const pending = ref(false),
    error = ref("");
  let alive = true;
  onScopeDispose(() => {
    alive = false;
  });
  const canSwitch = computed(
    () =>
      !!target.value?.role &&
      !!auth.account?.roles?.includes(target.value.role) &&
      auth.activeRole !== target.value.role,
  );
  const sameTarget = (next?: AccessTarget) =>
    target.value?.fullPath === next?.fullPath &&
    target.value?.role === next?.role;
  async function switchIdentity() {
    const next = target.value,
      id = auth.account?.id;
    if (pending.value || !next?.role || !canSwitch.value || !id) return false;
    pending.value = true;
    error.value = "";
    try {
      await auth.switchRole(next.role);
      if (!alive || auth.account?.id !== id || !sameTarget(next)) return false;
      if (!targetAllowed(next, auth.account, auth.activeRole))
        throw new Error("身份已变化，请重新操作");
      await navigate(next.fullPath);
      return true;
    } catch (e) {
      if (alive && auth.account?.id === id && sameTarget(next))
        error.value = e instanceof Error ? e.message : "切换失败，请重试";
      return false;
    } finally {
      if (alive) pending.value = false;
    }
  }
  async function changeAccount() {
    if (pending.value) return false;
    const next = target.value,
      id = auth.account?.id;
    pending.value = true;
    error.value = "";
    try {
      await auth.logout();
      if (!alive || auth.account || !sameTarget(next)) return false;
      await navigate(loginDestination(next));
      return true;
    } catch (e) {
      if (alive && auth.account?.id === id && sameTarget(next))
        error.value = e instanceof Error ? e.message : "退出失败，请重试";
      return false;
    } finally {
      if (alive) pending.value = false;
    }
  }
  return { pending, error, canSwitch, switchIdentity, changeAccount };
}
