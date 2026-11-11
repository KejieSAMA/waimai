<script setup lang="ts">
import { Button, SearchBar, StoreCard, Tabs } from "@waimai/ui";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import PageSlot from "../../../components/PageSlot.vue";
import { onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { type Category, type Store, type Page, money } from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
const router = useRouter(),
  route = useRoute();
const categories = ref<Category[]>([]),
  stores = ref<Store[]>([]);
const category = ref(""),
  sort = ref("default"),
  keyword = ref(String(route.query.keyword ?? "")),
  page = ref(1),
  total = ref(0);
async function load() {
  await run(async () => {
    const result = await api<Page<Store>>(
      `/public/stores?categoryId=${encodeURIComponent(category.value)}&sort=${sort.value}&keyword=${encodeURIComponent(keyword.value)}&page=${page.value}`,
    );
    stores.value =
      page.value === 1
        ? result.list
        : [
            ...stores.value,
            ...result.list.filter(
              (item) => !stores.value.some((old) => old.id === item.id),
            ),
          ];
    total.value = result.total;
  });
}
onMounted(async () => {
  await run(async () => {
    categories.value = await api<Category[]>("/public/categories");
  });
  await load();
});
watch([category, sort], () => {
  page.value = 1;
  void load();
});
watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = String(value ?? "");
    page.value = 1;
    void load();
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
        @action="
          page = 1;
          load();
        " /></PageSlot
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
    <p v-if="!stores.length" class="app-empty body">暂无符合条件的店铺</p>
    <div v-if="stores.length < total" class="sc-full-actions">
      <Button
        variant="text"
        @click="
          page++;
          load();
        "
        >加载更多</Button
      >
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
