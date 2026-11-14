<script setup lang="ts">
import {
  CategoryNav,
  useGroupScroll,
  DishCard,
  Tag,
  Thumb,
  Tabs,
  Button,
  Dialog,
  SearchBar,
} from "@waimai/ui";
import { computed, nextTick, ref, watch } from "vue";
import {
  useRoute,
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRouter,
} from "vue-router";
import {
  type Store,
  type Product,
  firstImage,
  storeStatuses,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { useStoreTraffic } from "../../../common/traffic";
import { useCart } from "../../../common/cart";
import { useAuth } from "../../../common/auth";
import PageSlot from "../../../components/PageSlot.vue";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import { browsingMemory, type StoreBrowseState } from "../browsingMemory";
import { useStoreReviews } from "../storeReviews";
const route = useRoute(),
  router = useRouter(),
  carts = useCart(),
  auth = useAuth();
const memory = browsingMemory.forOwner(auth.revision);
const saved = memory.read<StoreBrowseState>("store:" + route.params.id);
const categoryPane = ref<HTMLElement>(),
  section = ref<HTMLElement>();
let dishesTop = saved?.dishesTop ?? 0,
  categoriesTop = saved?.categoriesTop ?? 0;
function rememberBrowse() {
  memory.write<StoreBrowseState>("store:" + route.params.id, {
    view: view.value,
    keyword: keyword.value,
    category: category.value,
    dishesTop: dishList.value?.scrollTop ?? dishesTop,
    categoriesTop:
      categoryPane.value?.querySelector(".xz-catnav")?.scrollTop ??
      categoriesTop,
    sectionTop: section.value?.scrollTop ?? 0,
    reviews: reviewList.snapshot(),
  });
}
onBeforeRouteLeave(rememberBrowse);
onBeforeRouteUpdate(rememberBrowse);
const cart = carts.forStore(String(route.params.id));
const store = ref<Store>(),
  category = ref("");
useStoreTraffic(computed(() => store.value?.id ?? ""));
const keyword = ref(""),
  searchOpen = ref(false),
  dishList = ref<HTMLElement>();
const { jump } = useGroupScroll(() => dishList.value, category);
watch(
  keyword,
  () => {
    category.value = "";
    dishesTop = 0;
    dishList.value?.scrollTo({ top: 0 });
  },
  {
    flush: "post",
  },
);
const products = computed(
  () =>
    store.value?.products?.filter(
      (p) =>
        !keyword.value.trim() ||
        (p.name + " " + p.description)
          .toLocaleLowerCase()
          .includes(keyword.value.trim().toLocaleLowerCase()),
    ) ?? [],
);
const selected = (p: Product) =>
  cart.lines.find((it) => it.product.id === p.id)?.qty ?? 0;
function set(p: Product, qty: number) {
  cart.set(p, qty);
}

watch(
  () => cart.payload,
  () => {
    if (auth.tokens.USER) void cart.refresh();
  },
  { deep: true },
);
const view = ref("dishes");
const reviewList = useStoreReviews(
  api,
  String(route.params.id),
  saved?.reviews,
);
const {
  reviews,
  total: reviewTotal,
  pending: reviewLoading,
  error: reviewError,
  load: loadReviews,
  more: moreReviews,
} = reviewList;

watch(view, async (value, old) => {
  if (old === "dishes") {
    dishesTop = dishList.value?.scrollTop ?? dishesTop;
    categoriesTop =
      categoryPane.value?.querySelector(".xz-catnav")?.scrollTop ??
      categoriesTop;
  }
  if (value === "reviews") {
    if (!reviews.value.length) void loadReviews(1);
  }
  if (value === "dishes") {
    await nextTick();
    dishList.value?.scrollTo({ top: dishesTop });
    categoryPane.value
      ?.querySelector(".xz-catnav")
      ?.scrollTo({ top: categoriesTop });
  }
});
const groups = computed(() =>
  (store.value?.dishCategories ?? []).filter((group) =>
    products.value.some((p) => p.dishCategoryId === group.id),
  ),
);
const categoryCount = (id: string) =>
  cart.lines
    .filter((line) => !id || line.product.dishCategoryId === id)
    .reduce((sum, line) => sum + line.qty, 0);
const storeReload = ref(0);
const storeLoading = ref(false),
  storeError = ref("");
watch(
  [() => route.params.id, storeReload],
  async ([id], _old, cleanup) => {
    let active = true;
    cleanup(() => {
      active = false;
    });
    store.value = undefined;
    cart.storeOpen = false;
    category.value = "";
    keyword.value = "";
    view.value = "dishes";
    storeLoading.value = true;
    storeError.value = "";
    try {
      const result = await api<Store>("/public/stores/" + id);
      if (!active) return;
      store.value = result;
      carts.rememberStore(result);
      cart.storeOpen = result.status === "OPEN";
      if (saved) {
        keyword.value = saved.keyword;
        view.value = saved.view;
        await nextTick();
        category.value = saved.category;
        dishesTop = saved.dishesTop;
        categoriesTop = saved.categoriesTop;
        dishList.value?.scrollTo({ top: saved.dishesTop });
        categoryPane.value
          ?.querySelector(".xz-catnav")
          ?.scrollTo({ top: saved.categoriesTop });
        section.value?.scrollTo({ top: saved.sectionTop });
      }
      if (auth.tokens.USER && cart.count) await cart.refresh();
    } catch (cause) {
      if (active)
        storeError.value =
          cause instanceof Error ? cause.message : "店铺加载失败";
    } finally {
      if (active) storeLoading.value = false;
    }
  },
  { immediate: true },
);
</script>
<template>
  <PageSlot name="right"
    ><NavBarIcon name="search" label="搜索菜品" @click="searchOpen = true"
  /></PageSlot>
  <Dialog
    :open="searchOpen"
    title="搜索菜品"
    variant="sheet"
    @close="searchOpen = false"
    ><SearchBar
      v-model="keyword"
      placeholder="搜索菜品名称、描述"
      action="搜索"
      @action="searchOpen = false"
    /><template #actions
      ><Button
        size="lg"
        variant="outline"
        @click="
          keyword = '';
          searchOpen = false;
        "
        >重置</Button
      ><Button size="lg" @click="searchOpen = false">查看结果</Button></template
    ></Dialog
  >
  <p v-if="storeLoading && !store" class="app-empty body-sm" role="status">
    加载中
  </p>
  <p v-if="storeError" class="app-error body-sm" role="alert">
    {{ storeError
    }}<Button variant="text" size="sm" @click="storeReload++">重试</Button>
    <Button variant="text" size="sm" @click="router.push('/')">返回首页</Button>
  </p>
  <div v-if="store" class="sc-fill">
    <p
      v-if="store.status !== 'OPEN'"
      class="store-unavailable body-sm"
      role="status"
    >
      店铺休息中，暂时无法下单，已选商品仍保留
    </p>
    <div class="sc-head">
      <Thumb kind="logo" :src="store.logo" :name="store.name" />
      <div class="sc-head__main">
        <span class="title-sm store-name">{{ store.name }}</span>
        <div class="app-row body-sm">
          <Tag :tone="storeStatuses[store.status].tone">{{
            storeStatuses[store.status].label
          }}</Tag
          ><span
            >{{
              store.rating == null
                ? "暂无评分"
                : store.rating.toFixed(1) + " 分"
            }}
            · 月售 {{ store.monthlySales }}+</span
          >
        </div>
        <div class="app-store-promotions">
          <Tag
            v-for="promotion in store.promotions?.slice(0, 2)"
            :key="promotion.thresholdCents"
            tone="brand"
            variant="outline"
            >满 {{ money(promotion.thresholdCents) }} 减
            {{ money(promotion.discountCents) }}</Tag
          >
        </div>
      </div>
    </div>
    <Tabs
      v-model="view"
      :items="[
        { key: 'dishes', label: '点菜' },
        { key: 'reviews', label: '评价 ' + (store.reviewCount ?? 0) },
        { key: 'store', label: '商家' },
      ]"
    />
    <div v-if="view === 'dishes'" class="sc-split">
      <div ref="categoryPane" class="store-categories">
        <CategoryNav
          :model-value="category"
          @update:model-value="jump"
          :items="[
            { key: '', label: '全部菜品', count: categoryCount('') },
            ...(store.dishCategories ?? []).map((c) => ({
              key: c.id,
              label: c.name,
              count: categoryCount(c.id),
            })),
          ]"
        />
      </div>
      <div ref="dishList" class="sc-split__list">
        <template
          v-for="group in groups.filter((g) =>
            products.some((p) => p.dishCategoryId === g.id),
          )"
          :key="group.id"
          ><div :data-dish-group="group.id" class="sc-group body-sm">
            {{ group.name }}
          </div>
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
        <p v-if="!products.length" class="app-empty body-sm">
          暂无符合条件的菜品
        </p>
      </div>
    </div>
    <div v-if="view === 'reviews'" ref="section" class="app-store-section">
      <article v-for="review in reviews" :key="review.id" class="app-card">
        <p class="body-sm app-muted">评分 {{ review.rating }}</p>
        <p class="body">{{ review.content }}</p>
        <p v-if="review.reply" class="body-sm app-muted">
          商家回复：{{ review.reply }}
        </p>
      </article>
      <div v-if="reviewError" class="app-error body-sm" role="alert">
        {{ reviewError
        }}<Button
          variant="text"
          size="sm"
          :disabled="reviewLoading"
          @click="loadReviews()"
          >重试</Button
        >
      </div>
      <p v-if="!reviews.length && !reviewError" class="app-empty body-sm">
        {{ reviewLoading ? "加载中" : "暂无评价" }}
      </p>
      <Button
        v-if="reviews.length < reviewTotal"
        :disabled="reviewLoading"
        variant="text"
        @click="moreReviews"
        >加载更多</Button
      >
    </div>
    <div
      v-if="view === 'store'"
      ref="section"
      class="app-store-section app-card"
    >
      <h2 class="title-sm">商家信息</h2>
      <p class="body-sm">门店地址 {{ store.address }}</p>
      <p class="body-sm">营业时间 {{ store.openHours }}</p>
      <p class="body-sm">
        起送 {{ money(store.minOrderCents) }} ·
        {{
          store.deliveryFeeCents
            ? "配送 " + money(store.deliveryFeeCents)
            : "免配送费"
        }}
      </p>
      <div class="app-store-promotions">
        <Tag
          v-for="p in store.promotions"
          :key="p.thresholdCents"
          tone="brand"
          variant="outline"
          >满 {{ money(p.thresholdCents) }} 减 {{ money(p.discountCents) }}</Tag
        >
      </div>
      <p class="body-sm">{{ store.notice || "暂无公告" }}</p>
    </div>
  </div>
</template>

<style scoped>
.store-unavailable {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-sunken);
  color: var(--ink-muted);
}
.store-name {
  overflow-wrap: anywhere;
}
.store-categories {
  flex: none;
  display: flex;
  min-height: 0;
}
.sc-split__list {
  overscroll-behavior: contain;
  padding-bottom: var(--space-4);
}
.sc-split__list :deep(.xz-dish__name) {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
.sc-split__list :deep(.xz-dish__desc) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
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
