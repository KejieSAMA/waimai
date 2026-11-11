<script setup lang="ts">
import {
  Button,
  CategoryNav,
  Tabs,
  DishCard,
  Tag,
  Thumb,
  ScrollArea,
} from "@waimai/ui";
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
const dishes = ref<InstanceType<typeof ScrollArea>>();
watch(category, () => dishes.value?.scrollTo({ top: 0 }), { flush: "post" });
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
  <div v-if="store" class="app-stack app-store-page">
    <div class="ds-storehead">
      <Button
        class="app-store-back"
        variant="text"
        icon="back"
        aria-label="返回商家列表"
        title="返回商家列表"
        @click="router.push('/')"
      />
      <Thumb kind="logo" size="lg" :src="store.logo" :name="store.name" />
      <div class="ds-storehead__main">
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
      <div class="ds-storehead__kv">
        <div>
          <span class="xz-num">{{ money(store.minOrderCents) }}</span
          ><span class="caption app-muted">起送</span>
        </div>
        <div>
          <span class="xz-num">{{ money(store.deliveryFeeCents) }}</span
          ><span class="caption app-muted">配送费</span>
        </div>
        <div>
          <span class="body-md">{{ store.openHours }}</span
          ><span class="caption app-muted">营业时间</span>
        </div>
      </div>
    </div>
    <Tabs
      v-model="view"
      class="ds-tabs"
      :items="[
        { key: 'dishes', label: '点菜' },
        { key: 'reviews', label: '评价 ' + store.rating },
        { key: 'store', label: '商家' },
      ]"
    />
    <div v-if="view === 'dishes'" class="ds-storelayout">
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
      <ScrollArea
        ref="dishes"
        class="ds-dishes"
        label="商品列表"
        content-class="ds-dishes__content"
        contain
      >
        <section v-for="group in groups" :key="group.id" class="app-dish-group">
          <h2 class="ds-group body-md">{{ group.name }}</h2>
          <div class="app-dish-grid">
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
          </div>
        </section>
      </ScrollArea>
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
    <ScrollArea
      label="店铺评价"
      content-class="app-store-section__content"
      v-if="view === 'reviews'"
      class="app-store-section"
    >
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
    </ScrollArea>
    <ScrollArea
      label="商家信息"
      content-class="app-store-section__content"
      v-if="view === 'store'"
      class="app-store-section app-card"
    >
      <h2 class="title-sm">商家信息</h2>
      <p class="body-sm">门店地址 {{ store.address }}</p>
      <p class="body-sm">营业时间 {{ store.openHours }}</p>
      <p class="body-sm">{{ store.notice || "暂无公告" }}</p>
    </ScrollArea>
    <p v-if="cart.quoteError" class="body-sm app-muted">
      {{ cart.quoteError }}
    </p>
  </div>
</template>
<style scoped>
.app-store-page {
  flex: 1;
  min-height: 0;
}
.ds-storehead {
  margin-bottom: 0;
  flex: none;
}
.app-store-back {
  flex: 0 0 var(--size-button-md);
  align-self: flex-start;
  width: var(--size-button-md);
  height: var(--size-button-md);
  padding: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-hover);
}
.app-store-back:active {
  background: var(--surface-sunken);
}
.ds-storelayout {
  flex: 1 1 0%;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
}
.ds-storelayout > .xz-catnav {
  width: 100%;
  min-height: 0;
}
.ds-dishes {
  min-height: 0;
  margin-bottom: 0;
}
:deep(.ds-dishes__content) {
  display: block;
  gap: var(--space-3);
  align-content: start;
}
.app-store-page > p {
  flex: none;
  margin: 0;
}
</style>

<style scoped>
.app-dish-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.app-dish-group + .app-dish-group {
  margin-top: var(--space-5);
}
.app-store-page > .xz-tabs {
  flex: none;
  margin-bottom: 0;
}
</style>
<style scoped>
.app-store-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}
</style>

<style scoped>
:deep(.app-store-section__content) {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
<style scoped>
.app-store-promotions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
</style>
