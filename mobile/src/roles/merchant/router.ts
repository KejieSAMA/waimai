import type { RouteRecordRaw } from "vue-router";
export default [
  {
    path: "/merchant/reviews",
    component: () => import("./pages/Reviews.vue"),
    meta: { role: "MERCHANT", protected: true, title: "评价管理" },
  },
  {
    path: "/merchant/promotions",
    component: () => import("./pages/Promotions.vue"),
    meta: { role: "MERCHANT", protected: true, title: "满减配置" },
  },
  {
    path: "/merchant/dashboard",
    component: () => import("./pages/Dashboard.vue"),
    meta: { role: "MERCHANT", protected: true, title: "工作台" },
  },
  {
    path: "/merchant/orders",
    component: () => import("./pages/Orders.vue"),
    meta: { role: "MERCHANT", protected: true, title: "订单" },
  },
  {
    path: "/merchant/products",
    component: () => import("./pages/Products.vue"),
    meta: { role: "MERCHANT", protected: true, title: "商品管理" },
  },
  {
    path: "/merchant/products/new",
    component: () => import("./pages/ProductEdit.vue"),
    meta: { role: "MERCHANT", protected: true, title: "编辑商品" },
  },
  {
    path: "/merchant/products/:id/edit",
    component: () => import("./pages/ProductEdit.vue"),
    meta: { role: "MERCHANT", protected: true, title: "编辑商品" },
  },
  {
    path: "/merchant/store",
    component: () => import("./pages/StoreSettings.vue"),
    meta: { role: "MERCHANT", protected: true, title: "店铺设置" },
  },
  {
    path: "/merchant/apply",
    component: () => import("./pages/Application.vue"),
    meta: { role: "MERCHANT", protected: true, title: "入驻申请" },
  },
  {
    path: "/merchant/me",
    component: () => import("./pages/Me.vue"),
    meta: { role: "MERCHANT", protected: true, title: "我的" },
  },
  {
    path: "/merchant/login",
    component: () => import("../../common/Login.vue"),
    meta: { role: "MERCHANT", title: "登录" },
  },
  { path: "/merchant", redirect: "/merchant/dashboard" },
] satisfies RouteRecordRaw[];
