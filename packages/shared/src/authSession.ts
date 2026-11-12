import { computed, ref } from "vue";
import type { Account, Role } from "./index";
export interface Session {
  accessToken: string;
  activeRole: Role;
  user: Account;
}
export type AuthRequest = <T>(
  path: string,
  body?: unknown,
  method?: string,
) => Promise<T>;
export function createAuthState(request: AuthRequest, broadcast: () => void) {
  const account = ref<Account>();
  const activeRole = ref<Role>();
  const accessToken = ref("");
  const revision = ref(0);
  let generation = 0;
  let profileSequence = 0;
  let refreshing: Promise<boolean> | undefined;
  const accounts = computed<Partial<Record<Role, Account>>>(() =>
    account.value && activeRole.value
      ? { [activeRole.value]: account.value }
      : {},
  );
  const tokens = computed<Partial<Record<Role, string>>>(() =>
    accessToken.value && activeRole.value
      ? { [activeRole.value]: accessToken.value }
      : {},
  );
  function clear() {
    generation++;
    if (account.value || activeRole.value || accessToken.value)
      revision.value++;
    account.value = undefined;
    activeRole.value = undefined;
    accessToken.value = "";
  }
  function save(_role: Role, session: Session) {
    if (
      !session.user.roles?.includes(session.activeRole) ||
      session.user.role !== session.activeRole
    ) {
      clear();
      throw new Error("登录身份无效");
    }
    const old = JSON.stringify([
      account.value?.id,
      activeRole.value,
      account.value?.roles,
      account.value?.mustChangePassword,
    ]);
    const next = JSON.stringify([
      session.user.id,
      session.activeRole,
      session.user.roles,
      session.user.mustChangePassword,
    ]);
    account.value = session.user;
    activeRole.value = session.activeRole;
    accessToken.value = session.accessToken;
    if (old !== next) {
      generation++;
      revision.value++;
    }
  }
  async function refresh(role?: Role): Promise<boolean> {
    if (!refreshing) {
      const version = generation;
      refreshing = (async () => {
        try {
          const session = await request<Session>("/auth/refresh", {});
          if (version !== generation) return false;
          save(session.activeRole, session);
          return true;
        } catch {
          if (version === generation) clear();
          return false;
        }
      })().finally(() => {
        refreshing = undefined;
      });
    }
    const ok = await refreshing;
    return ok && (!role || activeRole.value === role);
  }
  async function login(body: unknown, register = false) {
    const version = ++generation;
    const session = await request<Session>(
      register ? "/auth/register" : "/auth/login",
      body,
    );
    if (generation !== version) throw new Error("身份已变化，请重试");
    save(session.activeRole, session);
    broadcast();
  }
  async function switchRole(role: Role) {
    const version = ++generation;
    const session = await request<Session>("/auth/switch-role", { role });
    if (generation !== version) throw new Error("身份已变化，请重试");
    save(role, session);
    broadcast();
  }
  async function logout(_role?: Role) {
    const version = generation;
    await request("/auth/logout", {});
    if (version !== generation) throw new Error("身份已变化，请重新操作");
    clear();
    broadcast();
  }
  async function changePassword(oldPassword: string, password: string) {
    await request("/auth/password", { oldPassword, password });
    clear();
    broadcast();
  }
  async function profileRequest(body?: { name: string; phone: string }) {
    const sequence = ++profileSequence;
    const version = generation;
    const id = account.value?.id,
      role = activeRole.value;
    if (!id || !role) throw new Error("请先登录");
    const result = await request<{ user: Account; activeRole: Role }>(
      "/auth/me",
      body,
      body ? "PUT" : "GET",
    );
    if (
      version !== generation ||
      sequence !== profileSequence ||
      result.user.id !== id ||
      result.activeRole !== role
    )
      throw new Error("身份已变化，请重新操作");
    save(role, { ...result, accessToken: accessToken.value });
    // Metadata updates must not let an older refresh overwrite the saved profile.
    generation++;
    return result.user;
  }
  const readProfile = () => profileRequest();
  const updateProfile = (body: { name: string; phone: string }) =>
    profileRequest(body);
  function externalChange() {
    clear();
    void refresh();
  }
  return {
    account,
    activeRole,
    accessToken,
    accounts,
    tokens,
    revision,
    save,
    clear,
    refresh,
    login,
    switchRole,
    logout,
    changePassword,
    readProfile,
    updateProfile,
    externalChange,
  };
}
export const roleHome = (role?: Role) =>
  role === "ADMIN"
    ? "/admin/overview"
    : role === "MERCHANT"
      ? "/merchant/dashboard"
      : "/";

export function accountRouteDecision(
  to: { path: string; fullPath: string; protected?: boolean; role?: Role },
  account: Account | undefined,
  activeRole: Role | undefined,
): true | string | { path: string; query: { redirect: string } } {
  if (to.protected && !account)
    return {
      path:
        to.role && to.role !== "USER"
          ? `/${to.role.toLowerCase()}/login`
          : "/login",
      query: { redirect: to.fullPath },
    };
  if (
    account?.mustChangePassword &&
    to.path !== "/password" &&
    !to.path.endsWith("/login")
  )
    return "/password";
  if (
    to.protected &&
    to.role &&
    (activeRole !== to.role || !account?.roles?.includes(to.role))
  )
    return "/access";
  return true;
}
