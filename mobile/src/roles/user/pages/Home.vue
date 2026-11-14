<script setup lang="ts">
import { Button, SearchBar, Tag, StoreCard, Tabs } from "@waimai/ui";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import PageSlot from "../../../components/PageSlot.vue";
import { watch, inject, nextTick, onMounted } from "vue";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";
import { usePublicStores, money } from "@waimai/shared";
import { api } from "../../../common/api";
import { useAuth } from "../../../common/auth";
import { pagePositionKey } from "../../../common/pageScroll";
import { browsingMemory, type HomeBrowseState } from "../browsingMemory";

const router = useRouter(),
  route = useRoute();
const memory = browsingMemory.forOwner(useAuth().revision);
const remembered = memory.read<HomeBrowseState>("home");
const saved =
  route.query.keyword != null &&
  String(route.query.keyword) !== remembered?.snapshot.appliedKeyword
    ? undefined
    : remembered;
const position = inject(pagePositionKey);
const {
  categories,
  stores,
  category,
  sort,
  keyword,
  total,
  pending,
  error,
  categoryError,
  load,
  loadCategories,
  search,
  more,
  snapshot,
  filterRevision,
} = usePublicStores(api, true, String(route.query.keyword ?? ""), {
  snapshot: saved?.snapshot,
  preserveOnSearch: true,
});
onMounted(() => {
  if (saved) void nextTick(() => position?.restore(saved.top));
});
watch(filterRevision, () => {
  void nextTick(() => position?.restore(0));
});
onBeforeRouteLeave(() => {
  const value = snapshot();
  if (value)
    memory.write("home", { snapshot: value, top: position?.read() ?? 0 });
});
watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = String(value ?? "");
    search();
  },
);
</script>
<template>
  <PageSlot name="right"
    ><NavBarIcon name="bell" label="订单消息" @click="router.push('/orders')"
  /></PageSlot>
  <div class="app-home">
    <PageSlot name="extra"
      ><SearchBar
        tone="brand"
        v-model="keyword"
        placeholder="搜索店铺"
        action="搜索"
        @action="search" /></PageSlot
    ><Tabs
      v-model="category"
      variant="chip"
      :items="[
        { key: '', label: '全部' },
        ...categories.map((c) => ({ key: c.id, label: c.name })),
      ]"
    />
    <div class="sc-sort body-sm">
      <button
        v-for="item in [
          { key: 'default', label: '综合排序' },
          { key: 'sales', label: '销量最高' },
          { key: 'minOrder', label: '起送价最低' },
        ]"
        :key="item.key"
        type="button"
        :class="{ 'is-active': sort === item.key }"
        @click="sort = item.key"
      >
        {{ item.label }}
      </button>
    </div>
    <div class="xz-list" :aria-busy="pending">
      <article
        v-for="store in stores"
        :key="store.id"
        class="home-store"
        @click="router.push('/store/' + store.id)"
      >
        <StoreCard
          :name="store.name"
          :logo="store.logo"
          :rating="store.rating"
          :sales="store.monthlySales + '+'"
          :min-order="store.minOrderCents / 100"
          :delivery-fee="store.deliveryFeeCents / 100"
          :status="store.status === 'CLOSED' ? 'closed' : 'open'"
          :notice="store.notice"
          :tags="
            store.promotions?.map(
              (p) =>
                '满 ' +
                money(p.thresholdCents) +
                ' 减 ' +
                money(p.discountCents),
            )
          "
        />
        <div v-if="store.promotions?.length" class="home-store__offers">
          <Tag
            v-for="p in store.promotions.slice(0, 2)"
            :key="p.thresholdCents"
            tone="brand"
            variant="outline"
            >满 {{ money(p.thresholdCents) }} 减
            {{ money(p.discountCents) }}</Tag
          >
        </div>
      </article>
    </div>
    <p v-if="pending" class="app-empty body-sm" role="status">加载中</p>
    <p v-if="error" class="app-error body-sm" role="alert">
      {{ error }}<span v-if="stores.length">，仍显示上次加载的结果</span
      ><Button variant="text" :disabled="pending" @click="load()">重试</Button>
    </p>
    <p v-if="categoryError" class="app-error body-sm" role="alert">
      {{ categoryError
      }}<Button variant="text" @click="loadCategories">重试分类</Button>
    </p>
    <p v-if="!pending && !error && !stores.length" class="app-empty body">
      暂无符合条件的店铺
    </p>
    <div v-if="stores.length < total && !error" class="sc-full-actions">
      <Button variant="text" :disabled="pending" @click="more">加载更多</Button>
    </div>
  </div>
</template>

<style scoped>
.home-store {
  background: var(--surface-raised);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.home-store :deep(.xz-store) {
  box-shadow: none;
}
.home-store :deep(.xz-store__row:last-child) {
  color: var(--ink-muted);
}
.home-store__offers {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: 0 var(--space-3) var(--space-3);
}
.sc-sort button {
  min-height: var(--size-tap);
}
.sc-sort button {
  padding: 0;
  background: none;
  border: 0;
  color: var(--ink-muted);
  font: inherit;
  cursor: pointer;
}
.sc-sort button.is-active {
  color: var(--ink);
  font-weight: 600;
}
</style>
