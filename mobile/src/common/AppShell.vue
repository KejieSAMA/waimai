<script setup lang="ts">
import {
  Icon,
  CartSyncNotice,
  Dialog,
  CartItems,
  CheckoutFees,
  Button,
  Tabs,
} from "@waimai/ui";
import MobilePage from "../components/MobilePage.vue";
import NavBar from "../components/NavBar.vue";
import CartBar from "../components/CartBar.vue";
import { useCart } from "./cart";
import TabBar from "../components/TabBar.vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { pageChrome } from "./pageChrome";
import { useRoleNotices, money, type Role } from "@waimai/shared";
import { api } from "./api";
import { useAuth } from "./auth";
import { accountMePath, accountPageRole } from "./accountNavigation";
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
    pageChrome.actions ||
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
  if (route.meta.accountArea)
    return router.push(accountMePath(auth.activeRole));
  if (isProductEdit.value) return router.push("/merchant/products");
  if (isAuditDetail.value)
    return router.push(
      route.query.from === "merchants" ? "/admin/merchants" : "/admin/audit",
    );
  if (isStore.value) return router.push("/");
  if (route.path === "/checkout")
    return router.push(
      cart.checkoutStoreId ? "/store/" + cart.checkoutStoreId : "/",
    );
  return router.back();
};
const cart = useCart();
watch(
  () => route.fullPath,
  () => {
    void cart.synchronize();
  },
);
const pageBody = ref<InstanceType<typeof MobilePage>>();
watch(
  () => route.query.storeId,
  () => {
    if (route.path === "/checkout") pageBody.value?.scrollToTop();
  },
  { flush: "post" },
);
const storeCartOpen = ref(false),
  clearCartOpen = ref(false);
const storeMetadata = computed(
  () => cart.storeInfo[String(route.params.id ?? "")],
);
watch(
  () => route.params.id,
  () => {
    storeCartOpen.value = false;
    clearCartOpen.value = false;
  },
);
const storeProductFor = (line: import("@waimai/shared").CartLine) =>
  storeMetadata.value?.products?.find((p) => p.id === line.product.id) ??
  line.product;
const storeCart = computed(() => cart.forStore(String(route.params.id ?? "")));
const role = computed(
  () =>
    accountPageRole(
      route.meta.role,
      route.meta.accountArea,
      auth.activeRole,
    ).toLowerCase() as "user" | "merchant" | "admin",
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
    { key: "/admin/accounts", label: "账号管理", icon: "user" },
    { key: "/admin/me", label: "我的", icon: "user" },
  ],
};
const auth = useAuth();

const { badges } = useRoleNotices(
  (path, target) => api(path, {}, target),
  computed(() => role.value.toUpperCase() as Role),
  computed(() => auth.accounts[role.value.toUpperCase() as Role]?.id),
  computed(() => true),
);
const nav = computed(() =>
  menus[role.value].map((item) => ({ ...item, badge: badges.value[item.key] })),
);

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
  <RouterView v-if="route.meta.accessArea" />
  <MobilePage
    v-else
    ref="pageBody"
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
      <CartSyncNotice
        :loading="!cart.ready && !cart.syncError"
        :error="cart.syncError"
        :notice="cart.notice"
        :busy="cart.loading || cart.syncPending"
        @retry="cart.retry"
        @dismiss="cart.dismissNotice"
      />
      <p
        v-if="route.path === '/checkout' && !cart.ready"
        class="app-empty body-sm"
      >
        {{ cart.syncError ? "购物车读取失败，请重试" : "正在读取购物车" }}
      </p>
      <RouterView
        v-else
        :key="
          String(auth.revision) +
          ':' +
          (route.path === '/checkout'
            ? 'checkout:' +
              String(route.query.storeId ?? cart.resolveStoreId() ?? '')
            : route.path.startsWith('/store/')
              ? route.path
              : '')
        "
      />
    </div>
    <template v-if="hasBottom" #bottom>
      <CartBar
        v-if="isStore"
        :count="storeCart.count"
        :total="storeCart.quote ? storeCart.quote.payCents / 100 : undefined"
        :delivery-fee="
          storeCart.quote ? storeCart.quote.deliveryFeeCents / 100 : undefined
        "
        :disabled="!storeCart.storeOpen"
        @checkout="
          go('/checkout?storeId=' + encodeURIComponent(String(route.params.id)))
        "
        @open="storeCartOpen = true"
        :updating="storeCart.quotePending"
        :error="storeCart.quoteError"
        :logged-in="!!auth.tokens.USER"
        :shortfall="storeCart.quote?.shortfallCents"
        :min-order="storeMetadata?.minOrderCents"
        :checkout-allowed="storeCart.quote?.checkoutAllowed"
        :pickup="storeCart.type === 'PICKUP'"
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
    <template #overlay
      ><div id="mobile-page-overlay" />
      <Dialog
        :open="storeCartOpen"
        variant="sheet"
        :title="storeMetadata?.name || '本店购物车'"
        @close="storeCartOpen = false"
      >
        <Tabs
          v-model="storeCart.type"
          :items="[
            { key: 'DELIVERY', label: '外卖配送' },
            { key: 'PICKUP', label: '到店自提' },
          ]"
        />
        <p v-if="storeCart.quote?.shortfallCents" class="body-sm app-muted">
          差
          {{ money(storeCart.quote.shortfallCents) }} 起送，可继续选购或选择自提
        </p>
        <CartItems
          :lines="storeCart.lines"
          :quote="storeCart.quote"
          :product-for="storeProductFor"
          @quantity="storeCart.set($event.product, $event.qty)"
        />
        <CheckoutFees
          :quote="storeCart.quote"
          :updating="storeCart.quotePending"
        />
        <p v-if="storeCart.quoteError" class="app-error body-sm">
          {{ storeCart.quoteError
          }}<Button variant="text" @click="storeCart.refresh">重试</Button>
        </p>
        <template #actions
          ><Button
            variant="outline"
            :disabled="!storeCart.count"
            @click="clearCartOpen = true"
            >清空本店</Button
          ><Button
            :disabled="
              !storeCart.count ||
              !storeCart.storeOpen ||
              (!!auth.tokens.USER &&
                (storeCart.quotePending ||
                  !!storeCart.quoteError ||
                  storeCart.quote?.checkoutAllowed === false))
            "
            @click="
              storeCartOpen = false;
              go(
                '/checkout?storeId=' +
                  encodeURIComponent(String(route.params.id)),
              );
            "
            >去结算</Button
          ></template
        >
      </Dialog>
      <Dialog
        :open="clearCartOpen"
        title="清空本店"
        @close="clearCartOpen = false"
        ><p class="body-sm">清空本店已选商品，其他店铺不受影响</p>
        <template #actions
          ><Button variant="outline" @click="clearCartOpen = false"
            >保留商品</Button
          ><Button
            @click="
              storeCart.clear();
              clearCartOpen = false;
            "
            >清空本店</Button
          ></template
        ></Dialog
      >
    </template>
  </MobilePage>
</template>
