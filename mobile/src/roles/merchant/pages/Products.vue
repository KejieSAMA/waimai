<script setup lang="ts">
import { Button, Dialog, SearchBar, Select, Tabs } from "@waimai/ui";
import PageSlot from "../../../components/PageSlot.vue";
import ProductRow from "../../../components/ProductRow.vue";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  type Product,
  type Page,
  type Category,
  type Store,
  firstImage,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
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
  pending = ref<Product | null>(null);
async function load(append = false) {
  await run(async () => {
    const result = await api<Page<Product>>(
      `/merchant/products?status=${status.value === "REVIEW" ? "" : status.value}${status.value === "REVIEW" ? "&group=review" : ""}&keyword=${encodeURIComponent(keyword.value)}&categoryId=${category.value}&stock=${stock.value}&page=${page.value}`,
      {},
      "MERCHANT",
    );
    list.value = append
      ? [
          ...list.value.filter(
            (old) => !result.list.some((item) => item.id === old.id),
          ),
          ...result.list,
        ]
      : result.list;
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
    page.value = 1;
    await load();
  });
}
</script>
<template>
  <div class="app-products-page">
    <PageSlot name="overlay"
      ><div class="sc-fab">
        <Button
          icon="plus"
          :disabled="store?.status === 'FROZEN'"
          @click="router.push('/merchant/products/new')"
          >新增商品</Button
        >
      </div></PageSlot
    >
    <div class="sc-strip app-product-search">
      <SearchBar
        v-model="keyword"
        placeholder="搜索商品"
        action="查询"
        @action="
          page = 1;
          load();
        "
      />
      <details class="app-product-filters body-sm">
        <summary>筛选</summary>
        <Select
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
      </details>
    </div>
    <Tabs
      v-model="status"
      :items="[
        { key: 'ON', label: '在售', count: counts.ON },
        { key: 'OFF', label: '已下架', count: counts.OFF },
        { key: 'REVIEW', label: '审核中', count: counts.REVIEW },
      ]"
    />
    <div class="xz-list sc-page-list">
      <ProductRow
        v-for="p in list"
        :key="p.id"
        :name="p.name"
        :price="p.priceCents / 100"
        :original="
          p.originalPriceCents == null ? undefined : p.originalPriceCents / 100
        "
        :sales="p.monthlySales + '+'"
        :low-stock="p.lowStock"
        :category="categories.find((c) => c.id === p.dishCategoryId)?.name"
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
    <div v-if="list.length < total" class="sc-full-actions">
      <Button
        variant="text"
        :disabled="busy"
        @click="
          page++;
          load(true);
        "
        >加载更多</Button
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

<style scoped>
.app-product-search {
  padding: var(--space-2) var(--space-3);
}
.app-product-filters {
  padding-top: var(--space-2);
}
.app-products-page > .xz-list {
  padding-bottom: calc(var(--size-button-lg) + var(--space-6));
}
</style>
