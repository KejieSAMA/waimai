<script setup lang="ts">
import { Button, ScrollArea, Switch } from "@waimai/ui";
import DesktopShell from "../components/DesktopShell.vue";
import SiteHeader from "../components/SiteHeader.vue";
import { computed, watch, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "@waimai/tokens";
import type { NavItem, NavGroup } from "@waimai/ui";
import type { Role, Store, Stats } from "@waimai/shared";
import { api } from "./api";
import { merchantStore } from "./merchantStatus";
import { run } from "./feedback";
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
const containedScroll = computed(() => route.meta.containedScroll === true);
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
const groups = computed<NavGroup[]>(() =>
  role.value === "merchant"
    ? [
        { items: nav.value.slice(0, 3) },
        { title: "店铺", items: nav.value.slice(3) },
      ]
    : role.value === "admin"
      ? [
          { items: nav.value.slice(0, 1) },
          { title: "商家", items: nav.value.slice(1, 4) },
          { title: "交易", items: nav.value.slice(4, 6) },
          { title: "平台", items: nav.value.slice(6) },
        ]
      : [{ items: nav.value }],
);
const changingStore = ref(false);
const notices = ref(0);
watch([() => route.path, merchantStore], async () => {
  if (
    !["merchant", "admin"].includes(role.value) ||
    route.path.endsWith("/login") ||
    (role.value === "merchant" && !merchantStore.value)
  )
    return;
  await run(async () => {
    const stats = await api<Stats>(
      role.value === "merchant"
        ? "/merchant/stats/today"
        : "/admin/stats/overview",
      {},
      role.value === "merchant" ? "MERCHANT" : "ADMIN",
    );
    notices.value = stats.pending;
  });
});
watch(
  [role, () => account.value?.id],
  async ([value, accountId], _old, cleanup) => {
    let active = true;
    cleanup(() => {
      active = false;
    });
    if (value !== "merchant" || !accountId) {
      merchantStore.value = undefined;
      return;
    }
    if (value === "merchant")
      await run(async () => {
        const store = await api<Store | null>(
          "/merchant/application",
          {},
          "MERCHANT",
        );
        if (active) merchantStore.value = store;
      });
  },
  { immediate: true },
);
async function setOpen(open: boolean) {
  changingStore.value = true;
  await run(async () => {
    merchantStore.value = await api<Store>(
      "/merchant/store/open",
      { method: "PUT", body: { open } },
      "MERCHANT",
    );
  });
  changingStore.value = false;
}
const selected = computed(
  () =>
    nav.value.find(
      (it) =>
        route.path === it.key ||
        (it.key !== "/" && route.path.startsWith(it.key + "/")),
    )?.key ?? nav.value[0].key,
);
const go = (path: string) => router.push(path);
</script>
<template>
  <div
    v-if="
      role === 'user' || route.path.endsWith('/login') || route.path === '/__ui'
    "
    class="xz-site-page xz-desk"
    :class="{ 'app-contained-store': containedScroll }"
  >
    <SiteHeader
      :user="account"
      :model-value="selected"
      @update:model-value="go"
      @login="go('/login')"
      @cart="go('/checkout')"
    />
    <ScrollArea
      class="xz-site-page__body"
      axis="both"
      label="页面内容"
      :disabled="containedScroll"
    >
      <div class="xz-container"><RouterView /></div>
    </ScrollArea>
  </div>
  <DesktopShell
    v-else
    :role="role"
    :groups="groups"
    :model-value="selected"
    :user="
      account
        ? { name: account.name, role: role === 'merchant' ? '店长' : '运营' }
        : undefined
    "
    :notices="notices"
    @notices="go(role === 'merchant' ? '/merchant/orders' : '/admin/audit')"
    @update:model-value="go"
  >
    <template v-if="role === 'merchant' && merchantStore" #footer
      ><Switch
        :label="
          merchantStore.status === 'OPEN'
            ? '营业中'
            : merchantStore.status === 'CLOSED'
              ? '休息中'
              : '营业状态'
        "
        :model-value="merchantStore.status === 'OPEN'"
        :disabled="
          changingStore || !['OPEN', 'CLOSED'].includes(merchantStore.status)
        "
        @update:model-value="setOpen" /></template
    ><template #topRight
      ><Button size="sm" variant="text" @click="toggle">切换主题</Button
      ><Button size="sm" variant="text" @click="switchDevice(true)"
        >手机版</Button
      ><RouterLink to="/">用户首页</RouterLink></template
    ><RouterView
  /></DesktopShell>
</template>
