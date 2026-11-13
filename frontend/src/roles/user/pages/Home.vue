<script setup lang="ts">
import { Button, Select, StoreCard, Tabs } from "../../../components/pc";
import Pagination from "../../../components/Pagination.vue";

import { useRouter } from "vue-router";
import { usePublicStores, money } from "@waimai/shared";
import { api } from "../../../common/api";

const router = useRouter();
const {
  categories,
  stores,
  category,
  sort,
  page,
  total,
  pending,
  error,
  categoryError,
  load,
  loadCategories,
} = usePublicStores(api);
</script>
<template>
  <div class="app-stack app-store-list">
    <div class="pc-home-head">
      <h1 class="pc-home-title">附近商家</h1>
      <span class="app-muted">共 {{ total }} 家</span>
    </div>
    <Tabs
      v-model="category"
      variant="chip"
      wrap
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
      />
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
    <a-spin v-if="pending" class="app-empty" tip="加载中" />
    <a-alert v-if="error" type="error" show-icon :message="error">
      <template #action
        ><Button variant="text" size="sm" :disabled="pending" @click="load()"
          >重试</Button
        ></template
      >
    </a-alert>
    <a-alert
      v-if="categoryError"
      type="error"
      show-icon
      :message="categoryError"
    >
      <template #action
        ><Button variant="text" size="sm" @click="loadCategories"
          >重试分类</Button
        ></template
      >
    </a-alert>
    <a-empty
      v-if="!pending && !error && !stores.length"
      class="app-empty"
      description="暂无符合条件的店铺"
    />
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
.pc-home-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}
.pc-home-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
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
