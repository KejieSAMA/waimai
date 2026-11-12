import type { RouteRecordRaw } from "vue-router";
export default [
  {
    path: "/admin/accounts",
    component: () => import("./pages/Accounts.vue"),
    meta: { role: "ADMIN", protected: true, title: "账号管理" },
  },
  {
    path: "/admin/overview",
    component: () => import("./pages/Dashboard.vue"),
    meta: { role: "ADMIN", protected: true, title: "数据总览" },
  },
  {
    path: "/admin/merchants",
    component: () => import("./pages/Merchants.vue"),
    meta: { role: "ADMIN", protected: true, title: "商家管理" },
  },
  {
    path: "/admin/audit",
    component: () => import("./pages/Audit.vue"),
    meta: { role: "ADMIN", protected: true, title: "入驻审核" },
  },
  {
    path: "/admin/audit/:id",
    component: () => import("./pages/Audit.vue"),
    meta: { role: "ADMIN", protected: true, title: "入驻审核" },
  },
  {
    path: "/admin/products",
    component: () => import("./pages/Products.vue"),
    meta: { role: "ADMIN", protected: true, title: "商品管理" },
  },
  {
    path: "/admin/orders",
    component: () => import("./pages/Orders.vue"),
    meta: { role: "ADMIN", protected: true, title: "订单" },
  },
  {
    path: "/admin/disputes",
    component: () => import("./pages/Disputes.vue"),
    meta: { role: "ADMIN", protected: true, title: "退款纠纷" },
  },
  {
    path: "/admin/categories",
    component: () => import("./pages/Categories.vue"),
    meta: { role: "ADMIN", protected: true, title: "类目管理" },
  },
  {
    path: "/admin/me",
    component: () => import("./pages/Me.vue"),
    meta: { role: "ADMIN", protected: true, title: "我的" },
  },
  {
    path: "/admin/login",
    component: () => import("../../common/Login.vue"),
    meta: { role: "ADMIN", title: "登录" },
  },
  { path: "/admin", redirect: "/admin/overview" },
] satisfies RouteRecordRaw[];
