<script setup lang="ts">
import {
  Button,
  Dialog,
  Input,
  SearchBar,
  Select,
  Switch,
  Tabs,
  Tag,
} from "@waimai/ui";
import FilterBar from "../../../components/FilterBar.vue";
import DataTable from "../../../components/DataTable.vue";
import DataTableMedia from "../../../components/DataTableMedia.vue";
import PageHeader from "../../../components/PageHeader.vue";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  type Product,
  type Page,
  type Category,
  type Store,
  productStatuses,
  firstImage,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const categoryDialog = ref(false),
  newCategory = ref("");
async function addCategory() {
  await run(async () => {
    const result = await api<Category>(
      "/merchant/dish-categories",
      { method: "POST", body: { name: newCategory.value } },
      "MERCHANT",
    );
    categories.value.push(result);
    newCategory.value = "";
    categoryDialog.value = false;
  });
}
const counts = ref<Record<string, number>>({});
const router = useRouter(),
  list = ref<Product[]>([]),
  categories = ref<Category[]>([]),
  store = ref<Store>(),
  status = ref("ON"),
  keyword = ref(""),
  category = ref(""),
  stock = ref(new URLSearchParams(location.search).get("stock") || ""),
  page = ref(1),
  total = ref(0),
  selected = ref<string[]>([]),
  pending = ref<Product | null>(null),
  batchStock = ref("20");
async function load() {
  await run(async () => {
    const result = await api<Page<Product>>(
      `/merchant/products?status=${status.value === "REVIEW" ? "" : status.value}${status.value === "REVIEW" ? "&group=review" : ""}&keyword=${encodeURIComponent(keyword.value)}&categoryId=${category.value}&stock=${stock.value}&page=${page.value}`,
      {},
      "MERCHANT",
    );
    list.value = result.list;
    total.value = result.total;
    const groups = await Promise.all(
      ["status=ON", "status=OFF", "group=review"].map((filter) =>
        api<Page<Product>>(
          "/merchant/products?pageSize=1&" + filter,
          {},
          "MERCHANT",
        ),
      ),
    );
    counts.value = {
      ON: groups[0].total,
      OFF: groups[1].total,
      REVIEW: groups[2].total,
    };
    selected.value = [];
  });
}
onMounted(async () => {
  await run(async () => {
    categories.value = await api<Category[]>(
      "/merchant/dish-categories",
      {},
      "MERCHANT",
    );
    store.value = await api<Store>("/merchant/store", {}, "MERCHANT");
  });
  await load();
});
watch(status, () => {
  page.value = 1;
  void load();
});
async function toggle(p: Product, listed: boolean) {
  if (!listed) {
    pending.value = p;
    return;
  }
  await listing(p, true);
}
async function listing(p: Product, listed: boolean) {
  await run(async () => {
    await api(
      "/merchant/products/" + p.id + "/listing",
      { method: "PUT", body: { listed } },
      "MERCHANT",
    );
    pending.value = null;
    await load();
  });
}
async function batch(action: string) {
  await run(async () => {
    await api(
      "/merchant/products/batch",
      {
        method: "POST",
        body: { ids: selected.value, action, stock: Number(batchStock.value) },
      },
      "MERCHANT",
    );
    await load();
  });
}
const columns = [
  { key: "name", title: "商品" },
  { key: "priceCents", title: "价格", align: "right" as const, num: true },
  { key: "monthlySales", title: "月售", num: true, align: "right" as const },
  { key: "listed", title: "上架" },
  { key: "stock", title: "库存", align: "right" as const, num: true },
  { key: "displayStatus", title: "状态" },
  { key: "actions", title: "操作" },
];
</script>
<template>
  <div class="app-stack">
    <PageHeader title="商品管理"
      ><template #actions
        ><Button variant="outline" @click="categoryDialog = true"
          >分类管理</Button
        ><Button
          icon="plus"
          :disabled="store?.status === 'FROZEN'"
          @click="router.push('/merchant/products/new')"
          >新增商品</Button
        ></template
      ></PageHeader
    ><Tabs
      v-model="status"
      :items="[
        { key: 'ON', label: '在售', count: counts.ON },
        { key: 'OFF', label: '已下架', count: counts.OFF },
        { key: 'REVIEW', label: '审核中', count: counts.REVIEW },
      ]"
    />
    <FilterBar
      @search="
        page = 1;
        load();
      "
      @reset="
        keyword = category = stock = '';
        page = 1;
        load();
      "
    >
      <SearchBar
        v-model="keyword"
        placeholder="搜索商品"
        action="查询"
        @action="
          page = 1;
          load();
        "
      /><Select
        v-model="category"
        label="分类"
        :options="[
          { value: '', label: '全部分类' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]"
        @update:model-value="
          page = 1;
          load();
        "
      /><Select
        v-model="stock"
        label="库存"
        :options="[
          { value: '', label: '全部库存' },
          { value: 'low', label: '库存预警' },
          { value: 'soldout', label: '已售罄' },
        ]"
        @update:model-value="
          page = 1;
          load();
        "
      />
    </FilterBar>
    <DataTable
      :columns="columns"
      :rows="list"
      selectable
      :selected="selected"
      @select="selected = $event"
      ><template #name="{ row }"
        ><DataTableMedia
          :name="row.name"
          :src="firstImage(row.images)"
          :sub="row.rejectReason || undefined" /></template
      ><template #stock="{ row }"
        ><span :class="{ 'tone-warning': row.stock <= row.lowStock }">{{
          row.stock
        }}</span></template
      ><template #priceCents="{ row }">{{ money(row.priceCents) }}</template
      ><template #displayStatus="{ row }"
        ><Tag :tone="productStatuses[row.displayStatus].tone">{{
          productStatuses[row.displayStatus].label
        }}</Tag></template
      ><template #listed="{ row }">
        <Switch
          :model-value="row.status === 'ON'"
          :disabled="
            row.forcedOff ||
            row.status === 'REVIEW' ||
            store?.status === 'FROZEN'
          "
          aria-label="上架"
          @update:model-value="toggle(row, $event)" /></template
      ><template #actions="{ row }"
        ><div class="app-table-actions">
          <Button
            size="sm"
            variant="text"
            @click="router.push('/merchant/products/' + row.id + '/edit')"
            >编辑</Button
          >
        </div></template
      >
      <template #toolbar
        ><div v-if="selected.length" class="app-row">
          <Button
            variant="outline"
            :disabled="busy || store?.status === 'FROZEN'"
            @click="batch('off')"
            >批量下架</Button
          ><Button
            variant="outline"
            :disabled="busy || store?.status === 'FROZEN'"
            @click="batch('on')"
            >批量上架</Button
          ><Input v-model="batchStock" type="number" label="库存" /><Button
            :disabled="busy || store?.status === 'FROZEN'"
            @click="batch('stock')"
            >修改库存</Button
          >
        </div></template
      >
    </DataTable>
    <Dialog
      :open="categoryDialog"
      title="分类管理"
      @close="categoryDialog = false"
      ><p class="body-sm app-muted">
        {{ categories.map((c) => c.name).join(" · ") }}
      </p>
      <Input v-model="newCategory" label="新增分类" /><template #actions
        ><Button :disabled="busy || !newCategory.trim()" @click="addCategory"
          >新增分类</Button
        ></template
      ></Dialog
    >
    <p v-if="!list.length" class="app-empty body">暂无商品</p>
    <Pagination
      v-model="page"
      :total="total"
      @update:model-value="load"
    /><Dialog :open="!!pending" title="确认下架" @close="pending = null"
      ><p>下架后用户将无法购买该商品</p>
      <template #actions
        ><Button variant="outline" @click="pending = null">取消</Button
        ><Button :disabled="busy" @click="pending && listing(pending, false)"
          >确认下架</Button
        ></template
      ></Dialog
    >
  </div>
</template>
