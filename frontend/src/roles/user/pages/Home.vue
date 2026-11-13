<script setup lang="ts">
import { Button, Select, StoreCard, Tabs } from "@waimai/ui";
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
      /><span class="app-muted">商家列表</span>
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
