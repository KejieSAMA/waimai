<script setup lang="ts">
import { Button } from "@waimai/ui";
import DesktopShell from "../components/DesktopShell.vue";
import SiteHeader from "../components/SiteHeader.vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "@waimai/tokens";
import type { NavItem, NavGroup } from "@waimai/ui";
import type { Role } from "@waimai/shared";
import { useAuth } from "./auth";
import { switchDevice } from "./device";
const route = useRoute(),
  router = useRouter(),
  auth = useAuth();
const { toggle } = useTheme();
const role = computed(
  () =>
    String(route.meta.role ?? "USER").toLowerCase() as
      "user" | "merchant" | "admin",
);
const account = computed(() => auth.accounts[role.value.toUpperCase() as Role]);
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
const groups = computed<NavGroup[]>(() => [{ items: nav.value }]);
const selected = computed(
  () =>
    nav.value.find(
      (it) =>
        route.path === it.key ||
        (it.key !== "/" && route.path.startsWith(it.key + "/")),
    )?.key ?? nav.value[0].key,
);
const go = (path: string) => router.push(path);
if (
  /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) &&
  !localStorage.getItem("xz-device")
) {
  const path =
    location.pathname === "/merchant/dashboard"
      ? "/merchant"
      : location.pathname === "/admin/overview"
        ? "/admin"
        : location.pathname;
  location.replace("/mobile" + path + location.search);
}
</script>
<template>
  <div
    v-if="
      role === 'user' || route.path.endsWith('/login') || route.path === '/__ui'
    "
    class="xz-site-page xz-desk"
  >
    <SiteHeader
      :user="account"
      :model-value="selected"
      @update:model-value="go"
      @login="go('/login')"
      @cart="go('/checkout')"
    />
    <div class="xz-site-page__body">
      <div class="xz-container"><RouterView /></div>
    </div>
  </div>
  <DesktopShell
    v-else
    :role="role"
    :groups="groups"
    :model-value="selected"
    :user="account"
    @update:model-value="go"
    ><template #topRight
      ><Button size="sm" variant="text" @click="toggle">切换主题</Button
      ><Button size="sm" variant="text" @click="switchDevice(true)"
        >手机版</Button
      ><RouterLink to="/">用户首页</RouterLink></template
    ><RouterView
  /></DesktopShell>
</template>
