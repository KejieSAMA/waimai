import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import type { Role, Stats } from "./index";
const listeners = new Set<(role: Role) => void>();
export function onRoleDataInvalidated(callback: (role: Role) => void) {
  listeners.add(callback);
  onScopeDispose(() => listeners.delete(callback));
}
export function invalidateRoleData(role: Role) {
  for (const listener of listeners) listener(role);
}
type Request = <T>(path: string, role: Role) => Promise<T>;
export function useRoleNotices(
  request: Request,
  role: Readonly<Ref<Role>>,
  account: Readonly<Ref<string | undefined>>,
  available: Readonly<Ref<boolean>>,
) {
  const stats = ref<Stats>();
  let version = 0,
    active = true;
  async function refresh() {
    const current = ++version,
      target = role.value;
    if (!account.value || !available.value || target === "USER") {
      stats.value = undefined;
      return;
    }
    try {
      const result = await request<Stats>(
        target === "MERCHANT"
          ? "/merchant/stats/today"
          : "/admin/stats/overview",
        target,
      );
      if (active && current === version) stats.value = result;
    } catch {
      if (active && current === version) stats.value = undefined;
    }
  }
  watch(
    [role, account, available],
    () => {
      stats.value = undefined;
      void refresh();
    },
    { immediate: true },
  );
  const changed = (target: Role) => {
    if (target === role.value) void refresh();
  };
  listeners.add(changed);
  onScopeDispose(() => {
    active = false;
    ++version;
    listeners.delete(changed);
  });
  const badges = computed((): Record<string, number> =>
    !stats.value
      ? {}
      : role.value === "MERCHANT"
        ? { "/merchant/orders": stats.value.pending }
        : {
            "/admin/audit": stats.value.pending,
            "/admin/products": stats.value.pendingProducts,
            "/admin/disputes": stats.value.disputesPending,
          },
  );
  const notices = computed(() =>
    !stats.value
      ? 0
      : role.value === "MERCHANT"
        ? stats.value.pending
        : stats.value.pending +
          stats.value.pendingProducts +
          stats.value.disputesPending,
  );
  return { stats, badges, notices, refresh };
}
