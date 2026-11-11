<script setup lang="ts">
import { Icon } from "@waimai/ui";
import MobilePage from "../components/MobilePage.vue";
import NavBar from "../components/NavBar.vue";
import CartBar from "../components/CartBar.vue";
import { useCart } from "./cart";
import TabBar from "../components/TabBar.vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { pageChrome } from "./pageChrome";
import type { NavItem } from "@waimai/ui";

const route = useRoute(),
  router = useRouter();
const isStore = computed(() => route.path.startsWith("/store/"));
const isProductEdit = computed(() =>
  /^\/merchant\/products\/(new|[^/]+\/edit)$/.test(route.path),
);
const isAuditDetail = computed(() =>
  /^\/admin\/audit\/[^/]+$/.test(route.path),
);
const actionPage = computed(
  () =>
    isProductEdit.value ||
    isAuditDetail.value ||
    ["/checkout", "/merchant/store", "/merchant/apply", "/addresses"].includes(
      route.path,
    ),
);
const rootTab = computed(() =>
  [
    "/",
    "/orders",
    "/me",
    "/merchant/dashboard",
    "/merchant/orders",
    "/merchant/products",
    "/merchant/me",
    "/admin/overview",
    "/admin/merchants",
    "/admin/audit",
    "/admin/me",
  ].includes(route.path),
);
const hasBottom = computed(
  () => rootTab.value || actionPage.value || isStore.value,
);
const back = computed(() => !rootTab.value && !route.path.endsWith("/login"));
const edge = computed(
  () =>
    (rootTab.value && !route.path.endsWith("/me")) ||
    isStore.value ||
    isProductEdit.value ||
    isAuditDetail.value,
);
const backTo = () => {
  if (isProductEdit.value) return router.push("/merchant/products");
  if (isAuditDetail.value)
    return router.push(
      route.query.from === "merchants" ? "/admin/merchants" : "/admin/audit",
    );
  if (isStore.value) return router.push("/");
  return router.back();
};
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
    :bottom-tone="isStore ? 'clear' : 'raised'"
    :class="{ 'app-mobile-store': isStore }"
  >
    <template #navBar
      ><NavBar
        :title="
          pageChrome.title ||
          (isStore || route.path === '/'
            ? ''
            : String(route.meta.title || '盟信'))
        "
        :subtitle="pageChrome.subtitle"
        :align="route.path === '/merchant/dashboard' ? 'left' : undefined"
        :bordered="!rootTab && !isStore"
        :tone="
          role === 'admin' ? 'admin' : route.path === '/' ? 'brand' : 'light'
        "
        :back="back"
        @back="backTo"
      >
        <template v-if="route.path === '/'" #left
          ><button
            type="button"
            class="xz-nav__place title-sm"
            @click="go('/addresses')"
          >
            <Icon name="location" :size="18" />收货地址<Icon
              name="chevron-down"
              :size="16"
            /></button
        ></template>
        <template #right><div id="mobile-page-right" /></template>
        <template
          v-if="route.path === '/' || route.path === '/admin/overview'"
          #default
          ><div id="mobile-page-extra"
        /></template> </NavBar
    ></template>
    <div
      class="app-content"
      :class="{ 'app-content--edge': edge, 'app-content--store': isStore }"
    >
      <RouterView />
    </div>
    <template v-if="hasBottom" #bottom>
      <CartBar
        v-if="isStore"
        :count="cart.count"
        :total="cart.quote ? cart.quote.payCents / 100 : undefined"
        :delivery-fee="
          cart.quote ? cart.quote.deliveryFeeCents / 100 : undefined
        "
        :disabled="!cart.storeOpen"
        @checkout="go('/checkout')"
      />
      <div v-else-if="actionPage" id="mobile-page-actions" />
      <TabBar
        v-else
        :role="role"
        :items="tabs"
        :model-value="selected"
        @update:model-value="go"
      />
    </template>
    <template #overlay><div id="mobile-page-overlay" /></template>
  </MobilePage>
</template>
