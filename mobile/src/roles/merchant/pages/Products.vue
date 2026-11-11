<script setup lang="ts">
import { Button, Dialog, SearchBar, Select, Tabs } from "@waimai/ui";
import ProductRow from "../../../components/ProductRow.vue";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  type Product,
  type Page,
  type Category,
  type Store,
  productStatuses,
  firstImage,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const router = useRouter(),
  list = ref<Product[]>([]),
  categories = ref<Category[]>([]),
  store = ref<Store>(),
  status = ref(""),
  keyword = ref(""),
  category = ref(""),
  stock = ref(""),
  page = ref(1),
  total = ref(0),
  pending = ref<Product | null>(null);
async function load() {
  await run(async () => {
    const result = await api<Page<Product>>(
      `/merchant/products?status=${status.value}&keyword=${encodeURIComponent(keyword.value)}&categoryId=${category.value}&stock=${stock.value}&page=${page.value}`,
      {},
      "MERCHANT",
    );
    list.value = result.list;
    total.value = result.total;
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
</script>
<template>
  <div class="app-stack">
    <div class="app-row">
      <h1 class="title-lg">商品管理</h1>
      <Button
        :disabled="store?.status === 'FROZEN'"
        @click="router.push('/merchant/products/new')"
        >新增商品</Button
      >
    </div>
    <Tabs
      v-model="status"
      :items="[
        { key: '', label: '全部' },
        ...Object.entries(productStatuses).map(([key, s]) => ({
          key,
          label: s.label,
        })),
      ]"
    />
    <div class="app-row">
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
    </div>
    <div class="xz-list">
      <ProductRow
        v-for="p in list"
        :key="p.id"
        :name="p.name"
        :price="p.priceCents / 100"
        :status="p.displayStatus"
        :stock="p.stock"
        :image="firstImage(p.images)"
        :reason="p.rejectReason || undefined"
        :locked="p.forcedOff || store?.status === 'FROZEN'"
        @toggle="toggle(p, $event)"
        @edit="router.push('/merchant/products/' + p.id + '/edit')"
      />
    </div>
    <p v-if="!list.length" class="app-empty body">暂无商品</p>
    <div class="app-row">
      <Button
        :disabled="page <= 1"
        @click="
          page--;
          load();
        "
        >上一页</Button
      ><Button
        :disabled="page * 20 >= total"
        @click="
          page++;
          load();
        "
        >下一页</Button
      >
    </div>
    <Dialog :open="!!pending" title="确认下架" @close="pending = null"
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
