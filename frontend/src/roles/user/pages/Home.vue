<script setup lang="ts">
import { Select, StoreCard, Tabs } from "@waimai/ui";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { type Category, type Store, type Page, money } from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
const router = useRouter();
const categories = ref<Category[]>([]),
  stores = ref<Store[]>([]);
const category = ref(""),
  sort = ref("default"),
  page = ref(1),
  total = ref(0);
async function load() {
  await run(async () => {
    const result = await api<Page<Store>>(
      `/public/stores?categoryId=${encodeURIComponent(category.value)}&sort=${sort.value}&page=${page.value}`,
    );
    stores.value = result.list;
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
</script>
<template>
  <div class="app-stack app-store-list">
    <Tabs
      v-model="category"
      variant="chip"
      class="ds-chips"
      :items="[
        { key: '', label: '全部' },
        ...categories.map((c) => ({ key: c.id, label: c.name })),
      ]"
    />
    <div class="app-row body-sm">
      <Select
        v-model="sort"
        label="排序"
        :options="[
          { value: 'default', label: '综合排序' },
          { value: 'sales', label: '销量最高' },
          { value: 'minOrder', label: '起送价最低' },
        ]"
      /><span class="app-muted">附近商家</span>
    </div>
    <div class="ds-stores">
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
    <Pagination
      v-model="page"
      class="app-home-pagination"
      :total="total"
      @update:model-value="load"
    />
  </div>
</template>
<style scoped>
.app-store-list {
  padding-bottom: calc(var(--size-button-sm) + var(--space-6));
}
.app-home-pagination {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  justify-content: center;
  padding: var(--space-3);
  background: var(--surface);
}
</style>
