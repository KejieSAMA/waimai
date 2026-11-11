<script setup lang="ts">
import { Button } from "@waimai/ui";
import MobilePage from "../components/MobilePage.vue";
import NavBar from "../components/NavBar.vue";
import CartBar from "../components/CartBar.vue";
import { useCart } from "./cart";
import TabBar from "../components/TabBar.vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "@waimai/tokens";
import type { NavItem } from "@waimai/ui";

const route = useRoute(),
  router = useRouter();
const { toggle } = useTheme();
const cart = useCart();
const role = computed(
  () =>
    String(route.meta.role ?? "USER").toLowerCase() as
      "user" | "merchant" | "admin",
);

const menus: Record<string, NavItem[]> = {
  user: [
    { key: "/", label: "首页", icon: "home" },
    { key: "/orders", label: "订单", icon: "order" },
    { key: "/me", label: "我的", icon: "user" },
  ],
  merchant: [
    { key: "/merchant/dashboard", label: "工作台", icon: "grid" },
    { key: "/merchant/orders", label: "订单", icon: "order" },
    { key: "/merchant/products", label: "商品管理", icon: "box" },
    { key: "/merchant/store", label: "店铺设置", icon: "store" },
    { key: "/merchant/apply", label: "入驻申请", icon: "shield" },
    { key: "/merchant/me", label: "我的", icon: "user" },
  ],
  admin: [
    { key: "/admin/overview", label: "数据总览", icon: "chart" },
    { key: "/admin/merchants", label: "商家管理", icon: "store" },
    { key: "/admin/audit", label: "入驻审核", icon: "shield" },
    { key: "/admin/products", label: "商品巡检", icon: "box" },
    { key: "/admin/orders", label: "订单监管", icon: "order" },
    { key: "/admin/disputes", label: "退款纠纷", icon: "alert" },
    { key: "/admin/categories", label: "类目管理", icon: "grid" },
    { key: "/admin/me", label: "我的", icon: "user" },
  ],
};
const nav = computed(() => menus[role.value]);

const selected = computed(
  () =>
    nav.value.find(
      (it) =>
        route.path === it.key ||
        (it.key !== "/" && route.path.startsWith(it.key + "/")),
    )?.key ?? nav.value[0].key,
);
const go = (path: string) => router.push(path);
const tabs = computed(() =>
  role.value === "merchant"
    ? nav.value.filter(
        (it) => !["/merchant/store", "/merchant/apply"].includes(it.key),
      )
    : role.value === "admin"
      ? nav.value.filter((it) =>
          [
            "/admin/overview",
            "/admin/merchants",
            "/admin/audit",
            "/admin/me",
          ].includes(it.key),
        )
      : nav.value,
);
</script>
<template>
  <MobilePage
    ><template #navBar
      ><NavBar
        :title="String(route.meta.title || '小灶')"
        :tone="
          role === 'admin' ? 'admin' : route.path === '/' ? 'brand' : 'light'
        "
        :back="
          route.path.includes('/store/') ||
          route.path.includes('/edit') ||
          route.path === '/checkout'
        "
        @back="router.back()"
        ><template #right
          ><Button size="sm" variant="text" @click="toggle"
            >主题</Button
          ></template
        ></NavBar
      ></template
    >
    <div class="app-content"><RouterView /></div>
    <template #bottom>
      <CartBar
        v-if="role === 'user' && route.path.startsWith('/store/')"
        :count="cart.count"
        :total="cart.quote ? cart.quote.payCents / 100 : undefined"
        :disabled="!cart.storeOpen"
        @checkout="go('/checkout')" />
      <TabBar
        v-else
        :role="role"
        :items="tabs"
        :model-value="selected"
        @update:model-value="go" /></template
  ></MobilePage>
</template>
