<script setup lang="ts">
import { Button, ScrollArea, Switch, CartSyncNotice } from "@waimai/ui";
import DesktopShell from "../components/DesktopShell.vue";
import SiteHeader from "../components/SiteHeader.vue";
import { computed, watch, ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { NavItem, NavGroup } from "@waimai/ui";
import type { Role, Store } from "@waimai/shared";
import {
  useRoleNotices,
  merchantStoreEntry,
  onRoleDataInvalidated,
} from "@waimai/shared";
import { api } from "./api";
import {
  merchantStore,
  merchantStoreLoading,
  merchantStoreBusy,
  merchantStoreError,
  loadMerchantStore,
  resetMerchantStore,
  updateMerchantStore,
} from "./merchantStatus";
import { run } from "./feedback";
import { useAuth } from "./auth";
import { useCart } from "./cart";
const route = useRoute(),
  router = useRouter(),
  auth = useAuth();
const carts = useCart();
watch(
  () => route.fullPath,
  () => {
    void carts.synchronize();
  },
);

const pageBody = ref<InstanceType<typeof ScrollArea>>();
watch(
  () => route.query.storeId,
  () => {
    if (route.path === "/checkout") pageBody.value?.scrollTo({ top: 0 });
  },
  { flush: "post" },
);
const role = computed(
  () =>
    String(
      route.meta.accountArea
        ? (auth.activeRole ?? "USER")
        : (route.meta.role ?? "USER"),
    ).toLowerCase() as "user" | "merchant" | "admin",
);
const account = computed(() => auth.accounts[role.value.toUpperCase() as Role]);
const headerAddress = ref("");
let addressVersion = 0;
async function loadHeaderAddress() {
  const current = ++addressVersion;
  if (auth.activeRole !== "USER" || !auth.account) {
    headerAddress.value = "";
    return;
  }
  try {
    const rows =
      await api<import("@waimai/shared").Address[]>("/user/addresses");
    if (current === addressVersion)
      headerAddress.value = rows.find((row) => row.isDefault)?.detail ?? "";
  } catch {
    if (current === addressVersion) headerAddress.value = "";
  }
}
watch(
  () => auth.revision,
  () => {
    headerAddress.value = "";
    void loadHeaderAddress();
  },
  { immediate: true },
);
watch(
  () => route.fullPath,
  () => void loadHeaderAddress(),
);
onRoleDataInvalidated((target) => {
  if (target === "USER") void loadHeaderAddress();
});
onMounted(() => window.addEventListener("focus", loadHeaderAddress));
onBeforeUnmount(() => {
  addressVersion++;
  window.removeEventListener("focus", loadHeaderAddress);
});
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
    { key: "/merchant/reviews", label: "评价管理", icon: "star" },
    { key: "/merchant/store", label: "店铺设置", icon: "store" },
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
    { key: "/admin/accounts", label: "账号管理", icon: "user" },
    { key: "/admin/me", label: "我的", icon: "user" },
  ],
};
const { badges, notices } = useRoleNotices(
  (path, target) => api(path, {}, target),
  computed(() => role.value.toUpperCase() as Role),
  computed(() => account.value?.id),
  computed(() => role.value !== "merchant" || !!merchantStore.value),
);
const nav = computed(() =>
  menus[role.value].flatMap((item) => {
    if (role.value === "merchant" && item.key === "/merchant/store") {
      const entry = merchantStoreEntry(merchantStore.value);
      return entry ? [{ ...entry, badge: badges.value[entry.key] }] : [];
    }
    return [{ ...item, badge: badges.value[item.key] }];
  }),
);
const groups = computed<NavGroup[]>(() =>
  role.value === "merchant"
    ? [
        { items: nav.value.slice(0, 4) },
        { title: "店铺", items: nav.value.slice(4) },
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
watch(
  [role, () => account.value?.id],
  async ([value, accountId]) => {
    if (value !== "merchant" || !accountId) {
      resetMerchantStore();
      return;
    }
    await loadMerchantStore(accountId);
  },
  { immediate: true },
);
async function setOpen(open: boolean) {
  if (merchantStoreBusy.value || changingStore.value) return;
  changingStore.value = true;
  merchantStoreBusy.value = true;
  await run(async () => {
    updateMerchantStore(
      await api<Store>(
        "/merchant/store/open",
        { method: "PUT", body: { open } },
        "MERCHANT",
      ),
    );
  });
  changingStore.value = false;
  merchantStoreBusy.value = false;
}
const selected = computed(() =>
  String(
    (route.meta.accountArea
      ? role.value === "user"
        ? "/me"
        : `/${role.value}/me`
      : route.meta.siteNav) ??
      nav.value.find(
        (it) =>
          route.path === it.key ||
          (it.key !== "/" && route.path.startsWith(it.key + "/")),
      )?.key ??
      (role.value === "user" ? "" : nav.value[0].key),
  ),
);
function reloadMerchant() {
  const id = auth.accounts.MERCHANT?.id;
  if (role.value === "merchant" && id && !merchantStoreBusy.value)
    return loadMerchantStore(id, true);
}
onMounted(() => window.addEventListener("focus", reloadMerchant));
onBeforeUnmount(() => window.removeEventListener("focus", reloadMerchant));
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
      :location="headerAddress"
      @address="go('/addresses')"
      :cart-count="carts.totalCount"
      :model-value="selected"
      @update:model-value="go"
      @login="go('/login')"
      @cart="go('/checkout')"
      @account="go('/me')"
    />
    <ScrollArea
      ref="pageBody"
      class="xz-site-page__body"
      axis="both"
      label="页面内容"
      :disabled="containedScroll"
    >
      <div class="xz-container">
        <CartSyncNotice
          :loading="!carts.ready && !carts.syncError"
          :error="carts.syncError"
          :notice="carts.notice"
          :busy="carts.loading || carts.syncPending"
          @retry="carts.retry"
          @dismiss="carts.dismissNotice"
        />
        <p
          v-if="route.path === '/checkout' && !carts.ready"
          class="app-empty body-md"
        >
          {{ carts.syncError ? "购物车读取失败，请重试" : "正在读取购物车" }}
        </p>
        <RouterView
          v-else
          :key="
            String(auth.revision) +
            ':' +
            (route.path === '/checkout'
              ? 'checkout:' +
                String(route.query.storeId ?? carts.resolveStoreId() ?? '')
              : route.path.startsWith('/store/')
                ? route.path
                : '')
          "
        />
      </div>
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
    <template v-if="role === 'merchant'" #footer
      ><p v-if="merchantStoreLoading" class="body-sm app-muted">加载店铺信息</p>
      <p v-else-if="merchantStoreError" class="body-sm app-error">
        {{ merchantStoreError
        }}<Button variant="text" @click="reloadMerchant">重试</Button>
      </p>
      <Switch
        v-if="merchantStore"
        :label="
          merchantStore.status === 'OPEN'
            ? '营业中'
            : merchantStore.status === 'CLOSED'
              ? '休息中'
              : '营业状态'
        "
        :model-value="merchantStore.status === 'OPEN'"
        :disabled="
          changingStore ||
          merchantStoreBusy ||
          !['OPEN', 'CLOSED'].includes(merchantStore.status)
        "
        @update:model-value="setOpen" /></template
    ><RouterView :key="auth.revision"
  /></DesktopShell>
</template>
