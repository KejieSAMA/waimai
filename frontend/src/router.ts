import { createRouter, createWebHistory } from "vue-router";
import user from "./roles/user/router";
import merchant from "./roles/merchant/router";
import admin from "./roles/admin/router";
import { installAuthNavigation } from "./common/authNavigation";
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
        meta: { protected: true, accessArea: true, title: "访问权限" },
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
  installAuthNavigation(router);
  return router;
}
