import { computed, ref } from "vue";
import type { Account, Role } from "./index";
import { ApiError } from "./index";
export type SessionStatus =
  "unknown" | "checking" | "authenticated" | "guest" | "error";
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
  const status = ref<SessionStatus>("unknown");
  const verificationError = ref("");
  let generation = 0;
  let profileSequence = 0;
  let refreshing: { version: number; promise: Promise<boolean> } | undefined;
  let identityPending = 0;
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
  function clear(nextStatus: SessionStatus = "guest") {
    generation++;
    if (account.value || activeRole.value || accessToken.value)
      revision.value++;
    account.value = undefined;
    activeRole.value = undefined;
    accessToken.value = "";
    status.value = nextStatus;
    verificationError.value = "";
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
    status.value = "authenticated";
    verificationError.value = "";
    if (old !== next) {
      generation++;
      revision.value++;
    }
  }
  async function refresh(role?: Role): Promise<boolean> {
    if (identityPending)
      return !!account.value && (!role || activeRole.value === role);
    if (!refreshing || refreshing.version !== generation) {
      const version = generation;
      if (status.value !== "authenticated") status.value = "checking";
      verificationError.value = "";
      const entry = { version, promise: Promise.resolve(false) };
      entry.promise = (async () => {
        try {
          const session = await request<Session>("/auth/refresh", {});
          if (version !== generation) return false;
          if (
            !session.user.roles?.includes(session.activeRole) ||
            session.user.role !== session.activeRole
          )
            throw new Error("登录身份无效");
          save(session.activeRole, session);
          return true;
        } catch (error) {
          if (version === generation) {
            if (error instanceof ApiError && [401, 403].includes(error.code))
              clear();
            else {
              clear("error");
              verificationError.value = "无法核验登录状态，请检查网络后重试";
            }
          }
          return false;
        }
      })().finally(() => {
        if (refreshing === entry) refreshing = undefined;
      });
      refreshing = entry;
    }
    const ok = await refreshing.promise;
    return ok && (!role || activeRole.value === role);
  }
  async function login(body: unknown, register = false) {
    const version = ++generation;
    identityPending++;
    try {
      // A previous refresh can clear its invalid Cookie. Let it finish before issuing a new one.
      await refreshing?.promise;
      if (generation !== version) throw new Error("身份已变化，请重试");
      const session = await request<Session>(
        register ? "/auth/register" : "/auth/login",
        body,
      );
      if (generation !== version) throw new Error("身份已变化，请重试");
      save(session.activeRole, session);
      broadcast();
    } finally {
      finishIdentity();
    }
  }
  function finishIdentity() {
    identityPending--;
    if (!identityPending && status.value === "checking") void refresh();
  }
  async function switchRole(role: Role) {
    const version = ++generation;
    identityPending++;
    try {
      await refreshing?.promise;
      if (generation !== version) throw new Error("身份已变化，请重试");
      const session = await request<Session>("/auth/switch-role", { role });
      if (generation !== version) throw new Error("身份已变化，请重试");
      save(role, session);
      broadcast();
    } catch (error) {
      if (
        version === generation &&
        error instanceof ApiError &&
        error.code === 401
      )
        clear();
      throw error;
    } finally {
      finishIdentity();
    }
  }
  async function logout(_role?: Role) {
    const version = generation;
    identityPending++;
    try {
      await request("/auth/logout", {});
      if (version !== generation) throw new Error("身份已变化，请重新操作");
      clear();
      broadcast();
    } finally {
      finishIdentity();
    }
  }
  async function changePassword(oldPassword: string, password: string) {
    const version = generation;
    identityPending++;
    try {
      await request("/auth/password", { oldPassword, password });
      if (version !== generation) throw new Error("身份已变化，请重新操作");
      clear();
      broadcast();
    } finally {
      finishIdentity();
    }
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
    clear("checking");
    void refresh();
  }
  return {
    account,
    activeRole,
    accessToken,
    accounts,
    tokens,
    revision,
    status,
    verificationError,
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
    return { path: "/password", query: { redirect: to.fullPath } };
  if (
    to.protected &&
    to.role &&
    (activeRole !== to.role || !account?.roles?.includes(to.role))
  )
    return { path: "/access", query: { redirect: to.fullPath } };
  return true;
}
