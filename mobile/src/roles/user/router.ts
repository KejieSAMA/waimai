import type { RouteRecordRaw } from "vue-router";
export default [
  {
    path: "/addresses",
    component: () => import("./pages/Addresses.vue"),
    meta: { role: "USER", protected: true, title: "收货地址" },
  },
  {
    path: "/",
    component: () => import("./pages/Home.vue"),
    meta: { role: "USER", protected: false, title: "附近商家" },
  },
  {
    path: "/store/:id",
    component: () => import("./pages/Store.vue"),
    meta: { role: "USER", protected: false, title: "店铺点餐" },
  },
  {
    path: "/checkout",
    component: () => import("./pages/Checkout.vue"),
    meta: { role: "USER", protected: true, title: "确认订单" },
  },
  {
    path: "/orders",
    component: () => import("./pages/Orders.vue"),
    meta: { role: "USER", protected: true, title: "订单" },
  },
  {
    path: "/orders/:id",
    component: () => import("./pages/OrderDetail.vue"),
    meta: { role: "USER", protected: true, title: "订单详情" },
  },
  {
    path: "/me",
    component: () => import("./pages/Me.vue"),
    meta: { role: "USER", protected: true, title: "我的" },
  },
  {
    path: "/login",
    component: () => import("../../common/Login.vue"),
    meta: { role: "USER", title: "登录" },
  },
] satisfies RouteRecordRaw[];
