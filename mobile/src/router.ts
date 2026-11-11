import { createRouter, createWebHistory } from "vue-router";
import user from "./roles/user/router";
import merchant from "./roles/merchant/router";
import admin from "./roles/admin/router";
import { useAuth } from "./common/auth";
import type { Role } from "@waimai/shared";
export function makeRouter() {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
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
    if (role && !auth.tokens[role] && !to.path.endsWith("/login"))
      await auth.refresh(role);
    if (!to.meta.protected || !role || auth.tokens[role]) return true;
    return {
      path: role === "USER" ? "/login" : `/${role.toLowerCase()}/login`,
      query: { redirect: to.fullPath },
    };
  });
  return router;
}
