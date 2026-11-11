<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import type { NavGroup } from "@waimai/ui";
import SideNav from "../../../components/SideNav.vue";

const route = useRoute(),
  router = useRouter();
const groups: NavGroup[] = [
  {
    items: [
      { key: "/orders", label: "我的订单", icon: "order" },
      { key: "/addresses", label: "收货地址", icon: "location" },
      { key: "reviews", label: "我的评价", icon: "star", disabled: true },
      { key: "coupons", label: "优惠券", icon: "wallet", disabled: true },
      { key: "/me", label: "账号设置", icon: "settings" },
    ],
  },
];
</script>
<template>
  <div class="ds-account">
    <SideNav
      class="app-account-nav"
      :brand="false"
      :groups="groups"
      :model-value="String(route.meta.accountNav)"
      aria-label="个人中心"
      @update:model-value="router.push($event)"
    />
    <div class="app-account-content"><RouterView /></div>
  </div>
</template>
<style scoped>
.app-account-nav {
  position: sticky;
  top: 0;
  max-height: calc(100dvh - var(--size-topbar) - var(--space-8));
}
.app-account-content {
  min-width: 0;
}
</style>
