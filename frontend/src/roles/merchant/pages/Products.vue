<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import {
  Button,
  Dialog,
  Input,
  SearchBar,
  Select,
  Switch,
  Tabs,
  Tag,
} from "../../../components/pc";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  useMerchantProducts,
  productStatuses,
  firstImage,
  money,
  type Product,
} from "@waimai/shared";
import FilterBar from "../../../components/FilterBar.vue";
import DataTable from "../../../components/DataTable.vue";
import DataTableMedia from "../../../components/DataTableMedia.vue";
import Pagination from "../../../components/Pagination.vue";
import { api } from "../../../common/api";
const router = useRouter();
const {
  list,
  categories,
  store,
  status,
  page,
  total,
  counts,
  selected,
  loading,
  mutating,
  error,
  filters,
  applied,
  load,
  retry,
  apply,
  batch,
} = useMerchantProducts(
  (path, options) => api(path, options, "MERCHANT"),
  new URLSearchParams(location.search).get("stock") ?? "",
);
const locked = computed(
  () => loading.value || mutating.value || store.value?.status === "FROZEN",
);
const pending = ref<Product>(),
  stockIds = ref<string[]>([]),
  batchStock = ref("0");
function change(product: Product, listed: boolean) {
  if (!listed) pending.value = product;
  else void batch("on", [product.id]);
}
function editStock(ids: string[], value = 0) {
  stockIds.value = [...ids];
  batchStock.value = String(value);
}
async function saveStock() {
  if (await batch("stock", stockIds.value, Number(batchStock.value)))
    stockIds.value = [];
}
const columns = [
  { key: "name", title: "商品" },
  { key: "priceCents", title: "售价", align: "right" as const, num: true },
  { key: "monthlySales", title: "月售", align: "right" as const, num: true },
  { key: "stock", title: "库存", align: "right" as const, num: true },
  { key: "displayStatus", title: "状态" },
  { key: "listed", title: "上架" },
  { key: "actions", title: "操作", width: 140 },
];
</script>
<template>
  <BackofficePage :body-scroll="false">
    <template #header>
      <Tabs
        v-model="status"
        :items="[
          { key: 'ON', label: '在售', count: counts.ON },
          { key: 'OFF', label: '已下架', count: counts.OFF },
          { key: 'REVIEW', label: '审核中', count: counts.REVIEW },
        ]"
      />
      <FilterBar :show-reset="false" @search="apply()">
        <SearchBar
          v-model="filters.keyword"
          placeholder="搜索商品名称"
          @action="apply()"
        />
        <Select
          v-model="filters.category"
          label="分类"
          :options="[
            { value: '', label: '全部分类' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]"
        />
        <Select
          v-model="filters.stock"
          label="库存"
          :options="[
            { value: '', label: '全部库存' },
            { value: 'low', label: '库存预警' },
            { value: 'soldout', label: '已售罄' },
          ]"
        />
        <template #actions
          ><Button
            icon="plus"
            :disabled="locked"
            @click="router.push('/merchant/products/new')"
            >新增商品</Button
          ></template
        >
      </FilterBar>
      <div v-if="error" class="app-error body-sm" role="alert">
        {{ error
        }}<Button variant="text" size="sm" :disabled="loading" @click="retry()"
          >重试</Button
        >
      </div>
    </template>
    <DataTable
      fill
      :reset-key="JSON.stringify([page, status, applied])"
      :columns="columns"
      :rows="list"
      selectable
      :selected="selected"
      :aria-busy="loading"
      @select="selected = $event"
    >
      <template #batchActions
        ><Button
          size="sm"
          variant="outline"
          :disabled="locked"
          @click="batch('off')"
          >批量下架</Button
        ><Button
          size="sm"
          variant="outline"
          :disabled="locked"
          @click="batch('on')"
          >批量上架</Button
        ><Button
          size="sm"
          variant="outline"
          :disabled="locked"
          @click="editStock(selected)"
          >批量改库存</Button
        ></template
      >
      <template #name="{ row }"
        ><DataTableMedia
          :name="row.name"
          :src="firstImage(row.images)"
          :sub="
            row.rejectReason ||
            categories.find((c) => c.id === row.dishCategoryId)?.name
          "
      /></template>
      <template #priceCents="{ row }">{{ money(row.priceCents) }}</template>
      <template #monthlySales="{ row }"
        >{{ row.monthlySales.toLocaleString("en-US") }}+</template
      >
      <template #stock="{ row }"
        ><b :class="{ 'tone-warning': row.stock <= row.lowStock }">{{
          row.stock
        }}</b></template
      >
      <template #displayStatus="{ row }"
        ><Tag :tone="productStatuses[row.displayStatus].tone">{{
          productStatuses[row.displayStatus].label
        }}</Tag></template
      >
      <template #listed="{ row }"
        ><Switch
          :model-value="row.status === 'ON'"
          :disabled="
            locked ||
            row.forcedOff ||
            ['REVIEW', 'REJECTED'].includes(row.status)
          "
          :aria-label="'上架 ' + row.name"
          @update:model-value="change(row, $event)"
      /></template>
      <template #actions="{ row }"
        ><div class="app-table-actions">
          <Button
            size="sm"
            variant="text"
            @click="router.push('/merchant/products/' + row.id + '/edit')"
            >编辑</Button
          ><Button
            size="sm"
            variant="text"
            :disabled="locked"
            @click="editStock([row.id], row.stock)"
            >改库存</Button
          >
        </div></template
      >
      <template #empty>{{
        loading ? "加载中" : error ? "商品加载失败" : "暂无商品"
      }}</template>
    </DataTable>
    <Dialog
      :open="!!pending"
      title="确认下架"
      @close="!mutating && (pending = undefined)"
      ><p>下架后用户将无法购买该商品</p>
      <template #actions
        ><Button
          variant="outline"
          :disabled="mutating"
          @click="pending = undefined"
          >取消</Button
        ><Button
          :disabled="mutating"
          @click="
            pending &&
            batch('off', [pending.id]).then((ok) => {
              if (ok) pending = undefined;
            })
          "
          >确认下架</Button
        ></template
      ></Dialog
    >
    <Dialog
      :open="!!stockIds.length"
      title="修改库存"
      @close="!mutating && (stockIds = [])"
      ><form id="product-stock" class="app-form" @submit.prevent="saveStock">
        <p class="body-sm">将更新 {{ stockIds.length }} 个商品的库存</p>
        <Input
          v-model="batchStock"
          label="库存"
          type="number"
          min="0"
          max="1000000"
          step="1"
          required
          :disabled="mutating"
        />
        <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      </form>
      <template #actions
        ><Button variant="outline" :disabled="mutating" @click="stockIds = []"
          >取消</Button
        ><Button type="submit" form="product-stock" :disabled="mutating"
          >修改库存</Button
        ></template
      ></Dialog
    >
    <template #footer
      ><Pagination v-model="page" :total="total" @update:model-value="load()"
    /></template>
  </BackofficePage>
</template>
