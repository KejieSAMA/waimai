<script setup lang="ts">
import { CategoryNav, DishCard, Tag, Thumb, Tabs, Button } from "@waimai/ui";
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
const view = ref("dishes");
const reviews = ref<
    { id: string; rating: number; content: string; reply: string | null }[]
  >([]),
  reviewPage = ref(1),
  reviewTotal = ref(0),
  reviewLoading = ref(false);
async function loadReviews() {
  if (reviewLoading.value) return;
  reviewLoading.value = true;
  await run(async () => {
    const result = await api<{ list: typeof reviews.value; total: number }>(
      `/public/stores/${route.params.id}/reviews?page=${reviewPage.value}`,
    );
    reviews.value =
      reviewPage.value === 1 ? result.list : [...reviews.value, ...result.list];
    reviewTotal.value = result.total;
  });
  reviewLoading.value = false;
}
watch(view, (value) => {
  if (value === "reviews") {
    reviewPage.value = 1;
    void loadReviews();
  }
});
const groups = computed(() =>
  category.value
    ? (store.value?.dishCategories ?? []).filter((c) => c.id === category.value)
    : (store.value?.dishCategories ?? []),
);
</script>
<template>
  <div v-if="store" class="sc-fill">
    <div class="sc-head">
      <Thumb kind="logo" size="lg" :src="store.logo" :name="store.name" />
      <div class="sc-head__main">
        <span class="title-lg">{{ store.name }}</span>
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
        <div class="app-store-promotions">
          <Tag
            v-for="promotion in store.promotions"
            :key="promotion.thresholdCents"
            tone="brand"
            variant="outline"
            >满 {{ money(promotion.thresholdCents) }} 减
            {{ money(promotion.discountCents) }}</Tag
          >
        </div>
        <p class="body-sm app-muted">{{ store.notice }}</p>
      </div>
    </div>
    <Tabs
      v-model="view"
      :items="[
        { key: 'dishes', label: '点菜' },
        { key: 'reviews', label: '评价 ' + store.rating },
        { key: 'store', label: '商家' },
      ]"
    />
    <div v-if="view === 'dishes'" class="sc-split">
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
        <template v-for="group in groups" :key="group.id"
          ><div class="sc-group body-sm">{{ group.name }}</div>
          <DishCard
            v-for="p in products.filter((p) => p.dishCategoryId === group.id)"
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
        </template>
      </div>
    </div>
    <div v-if="view === 'reviews'" class="app-store-section">
      <article v-for="review in reviews" :key="review.id" class="app-card">
        <p class="body-sm app-muted">评分 {{ review.rating }}</p>
        <p class="body">{{ review.content }}</p>
        <p v-if="review.reply" class="body-sm app-muted">
          商家回复：{{ review.reply }}
        </p>
      </article>
      <p v-if="!reviews.length" class="app-empty body-sm">
        {{ reviewLoading ? "加载中" : "暂无评价" }}
      </p>
      <Button
        v-if="reviews.length < reviewTotal"
        :disabled="reviewLoading"
        variant="text"
        @click="
          reviewPage++;
          loadReviews();
        "
        >加载更多</Button
      >
    </div>
    <div v-if="view === 'store'" class="app-store-section app-card">
      <h2 class="title-sm">商家信息</h2>
      <p class="body-sm">门店地址 {{ store.address }}</p>
      <p class="body-sm">营业时间 {{ store.openHours }}</p>
      <p class="body-sm">{{ store.notice || "暂无公告" }}</p>
    </div>
    <p v-if="cart.quoteError" class="body-sm app-muted">
      {{ cart.quoteError }}
    </p>
  </div>
</template>

<style scoped>
.app-store-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}
</style>

<style scoped>
.app-store-promotions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
</style>
