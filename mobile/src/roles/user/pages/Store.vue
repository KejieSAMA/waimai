<script setup lang="ts">
import { CategoryNav, DishCard, Tag, Thumb } from "@waimai/ui";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
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

onMounted(() =>
  run(async () => {
    store.value = await api<Store>("/public/stores/" + route.params.id);
    cart.storeOpen = store.value.status === "OPEN";
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
    <div class="sc-head">
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
    <div class="sc-split">
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
      <div class="sc-split__list">
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
    </div>
    <p v-if="cart.quoteError" class="body-sm app-muted">
      {{ cart.quoteError }}
    </p>
  </div>
</template>
