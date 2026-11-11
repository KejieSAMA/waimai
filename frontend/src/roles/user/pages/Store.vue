<script setup lang="ts">
import { Button, CategoryNav, DishCard, Tag, Thumb } from "@waimai/ui";
import CartPanel from "../../../components/CartPanel.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  type Store,
  type Product,
  firstImage,
  storeStatuses,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import { useAuth } from "../../../common/auth";
import { run } from "../../../common/feedback";
const route = useRoute(),
  router = useRouter(),
  cart = useCart(),
  auth = useAuth();
const store = ref<Store>(),
  category = ref("");
const products = computed(
  () =>
    store.value?.products?.filter(
      (p) => !category.value || p.dishCategoryId === category.value,
    ) ?? [],
);
const selected = (p: Product) =>
  cart.lines.find((it) => it.product.id === p.id)?.qty ?? 0;
function set(p: Product, qty: number) {
  cart.set(p, qty);
}
async function checkout() {
  if (!auth.tokens.USER) {
    await router.push({ path: "/login", query: { redirect: route.fullPath } });
    return;
  }
  await router.push("/checkout");
}
onMounted(() =>
  run(async () => {
    store.value = await api<Store>("/public/stores/" + route.params.id);
    if (auth.tokens.USER && cart.count) await cart.refresh();
  }),
);
watch(
  () => cart.payload,
  () => {
    if (auth.tokens.USER) void cart.refresh();
  },
  { deep: true },
);
</script>
<template>
  <div v-if="store" class="app-stack">
    <div class="ds-storehead">
      <Button
        variant="text"
        icon="back"
        aria-label="返回商家列表"
        title="返回商家列表"
        @click="router.push('/')"
      />
      <Thumb kind="logo" size="lg" :src="store.logo" :name="store.name" />
      <div class="app-stack">
        <h1 class="title-lg">{{ store.name }}</h1>
        <div class="app-row body-sm">
          <Tag :tone="storeStatuses[store.status].tone">{{
            storeStatuses[store.status].label
          }}</Tag
          ><span>{{ store.rating }} 分 · 月售 {{ store.monthlySales }}+</span
          ><span
            >起送 {{ money(store.minOrderCents) }} · 配送
            {{ money(store.deliveryFeeCents) }}</span
          >
        </div>
        <p class="body-sm app-muted">{{ store.notice }}</p>
      </div>
    </div>
    <div class="ds-storelayout">
      <CategoryNav
        v-model="category"
        :items="[
          { key: '', label: '全部菜品' },
          ...(store.dishCategories ?? []).map((c) => ({
            key: c.id,
            label: c.name,
          })),
        ]"
      />
      <div class="ds-dishes">
        <DishCard
          v-for="p in products"
          :key="p.id"
          :name="p.name"
          :price="p.priceCents / 100"
          :original="
            p.originalPriceCents == null
              ? undefined
              : p.originalPriceCents / 100
          "
          :image="firstImage(p.images)"
          :desc="p.description"
          :sales="p.monthlySales + '+'"
          :sold-out="p.displayStatus === 'SOLDOUT'"
          :disabled="store.status !== 'OPEN'"
          :model-value="selected(p)"
          :max="Math.min(p.stock, p.limitPerOrder ?? p.stock)"
          @update:model-value="set(p, $event)"
        />
      </div>
      <CartPanel
        :items="
          cart.lines.map((it) => ({
            id: it.product.id,
            name: it.product.name,
            price: it.product.priceCents / 100,
            qty: it.qty,
            max: Math.min(
              it.product.stock,
              it.product.limitPerOrder ?? it.product.stock,
            ),
          }))
        "
        :quote="cart.quote"
        :updating="cart.quotePending && !!auth.tokens.USER"
        :disabled="
          store.status !== 'OPEN' || (!!auth.tokens.USER && !!cart.quoteError)
        "
        @quantity="
          (id, qty) => {
            const p = store?.products?.find((p) => p.id === id);
            if (p) set(p, qty);
          }
        "
        @clear="cart.clear"
        @checkout="checkout"
      />
    </div>
    <p v-if="cart.quoteError" class="body-sm app-muted">
      {{ cart.quoteError }}
    </p>
  </div>
</template>
