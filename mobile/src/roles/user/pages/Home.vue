<script setup lang="ts">
import { Button, SearchBar, StoreCard, Tabs } from "@waimai/ui";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import PageSlot from "../../../components/PageSlot.vue";
import { watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { usePublicStores, money } from "@waimai/shared";
import { api } from "../../../common/api";

const router = useRouter(),
  route = useRoute();
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
} = usePublicStores(api, true, String(route.query.keyword ?? ""));
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
    <div class="xz-list">
      <StoreCard
        v-for="store in stores"
        :key="store.id"
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
              '满 ' + money(p.thresholdCents) + ' 减 ' + money(p.discountCents),
          )
        "
        @click="router.push('/store/' + store.id)"
      />
    </div>
    <p v-if="pending" class="app-empty body-sm" role="status">加载中</p>
    <p v-if="error" class="app-error body-sm" role="alert">
      {{ error
      }}<Button variant="text" :disabled="pending" @click="load()">重试</Button>
    </p>
    <p v-if="categoryError" class="app-error body-sm" role="alert">
      {{ categoryError
      }}<Button variant="text" @click="loadCategories">重试分类</Button>
    </p>
    <p v-if="!pending && !error && !stores.length" class="app-empty body">
      暂无符合条件的店铺
    </p>
    <div v-if="stores.length < total" class="sc-full-actions">
      <Button variant="text" :disabled="pending" @click="more">加载更多</Button>
    </div>
  </div>
</template>

<style scoped>
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
