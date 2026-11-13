import { createRouter, createWebHistory } from "vue-router";
import user from "./roles/user/router";
import merchant from "./roles/merchant/router";
import admin from "./roles/admin/router";
import { useAuth } from "./common/auth";
import { watch } from "vue";
import { accountRouteDecision, type Role } from "@waimai/shared";
export function makeRouter() {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: "/password",
        component: () => import("./common/Password.vue"),
        meta: { protected: true, title: "修改密码" },
      },
      {
        path: "/access",
        component: () => import("./common/Access.vue"),
        meta: { protected: true, title: "身份权限" },
      },
      {
        path: "/account/profile",
        component: () => import("./common/Profile.vue"),
        meta: {
          protected: true,
          accountArea: true,
          accountNav: "/me",
          containedScroll: true,
          title: "个人资料",
        },
      },
      ...user,
      ...merchant,
      ...admin,
      ...(import.meta.env.DEV
        ? [
            {
              path: "/__ui",
              component: () => import("./common/Gallery.vue"),
              meta: { title: "组件画廊" },
            },
          ]
        : []),
      { path: "/:pathMatch(.*)*", redirect: "/" },
    ],
  });
  router.beforeEach(async (to) => {
    const role = to.meta.role as Role | undefined;
    document.title = String(to.meta.title ?? "盟信") + " · 盟信";
    const auth = useAuth();
    if (!auth.account && !to.path.endsWith("/login")) await auth.refresh();
    return accountRouteDecision(
      {
        path: to.path,
        fullPath: to.fullPath,
        protected: to.meta.protected === true,
        role,
      },
      auth.account,
      auth.activeRole,
    );
  });
  const auth = useAuth();
  const stop = watch(
    () => auth.revision,
    () => {
      const to = router.currentRoute.value;
      if (!to.matched.length) return;
      const decision = accountRouteDecision(
        {
          path: to.path,
          fullPath: to.fullPath,
          protected: to.meta.protected === true,
          role: to.meta.role as Role | undefined,
        },
        auth.account,
        auth.activeRole,
      );
      if (decision !== true) void router.replace(decision);
    },
    { flush: "post" },
  );
  if (import.meta.hot) import.meta.hot.dispose(stop);
  return router;
}
