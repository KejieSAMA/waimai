import type { RouteRecordRaw } from "vue-router";
export default [
  {
    path: "/",
    component: () => import("./pages/Home.vue"),
    meta: { role: "USER", protected: false, title: "商家列表" },
  },
  {
    path: "/store/:id",
    component: () => import("./pages/Store.vue"),
    meta: {
      role: "USER",
      protected: false,
      title: "店铺点餐",
      containedScroll: true,
    },
  },
  {
    path: "/checkout",
    component: () => import("./pages/Checkout.vue"),
    meta: {
      role: "USER",
      protected: true,
      title: "确认订单",
      containedScroll: true,
    },
  },
  {
    path: "/",
    name: "user-account",
    component: () => import("./components/AccountLayout.vue"),
    meta: { role: "USER", protected: true, siteNav: "/orders" },
    children: [
      {
        path: "orders",
        component: () => import("./pages/Orders.vue"),
        meta: { title: "我的订单", accountNav: "/orders" },
      },
      {
        path: "orders/:id",
        component: () => import("./pages/OrderDetail.vue"),
        meta: { title: "订单详情", accountNav: "/orders" },
      },
      {
        path: "addresses",
        component: () => import("./pages/Addresses.vue"),
        meta: { title: "收货地址", accountNav: "/addresses" },
      },
      {
        path: "me",
        component: () => import("./pages/Me.vue"),
        meta: { title: "账号设置", accountNav: "/me", siteNav: "/me" },
      },
    ],
  },
  {
    path: "/login",
    component: () => import("../../common/Login.vue"),
    meta: { role: "USER", title: "登录" },
  },
] satisfies RouteRecordRaw[];
