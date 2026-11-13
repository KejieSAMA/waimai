import { watch } from "vue";
import type { Router, RouteLocationNormalized } from "vue-router";
import {
  accessNavigationDecision,
  safeReturnTarget,
  type Role,
} from "@waimai/shared";
import { useAuth } from "./auth";

export function readAccessTarget(router: Router, value: unknown) {
  return safeReturnTarget(value, (path) => {
    const route = router.resolve(path);
    return {
      path: route.path,
      fullPath: route.fullPath,
      role: route.meta.role as Role | undefined,
      protected: route.meta.protected === true,
      title: String(route.meta.title ?? "目标页面"),
      valid:
        route.matched.length > 0 &&
        !route.matched.some((record) => !!record.redirect),
    };
  });
}
export function installAuthNavigation(router: Router) {
  const auth = useAuth();
  function decision(to: RouteLocationNormalized) {
    return accessNavigationDecision(
      {
        path: to.path,
        fullPath: to.fullPath,
        protected: to.meta.protected === true,
        role: to.meta.role as Role | undefined,
      },
      auth.account,
      auth.activeRole,
      auth.status,
      readAccessTarget(router, to.query.redirect),
    );
  }
  router.beforeEach(async (to) => {
    document.title = String(to.meta.title ?? "盟信") + " · 盟信";
    if (["unknown", "checking"].includes(auth.status)) await auth.refresh();
    return decision(to);
  });
  const stop = watch(
    [() => auth.revision, () => auth.status],
    () => {
      const to = router.currentRoute.value;
      if (!to.matched.length || ["unknown", "checking"].includes(auth.status))
        return;
      const next = decision(to);
      if (next !== true) void router.replace(next);
    },
    { flush: "post" },
  );
  if (import.meta.hot) import.meta.hot.dispose(stop);
  return stop;
}
