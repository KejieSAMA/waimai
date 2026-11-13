<script setup lang="ts">
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  SearchBar,
  Select,
  Tabs,
} from "@waimai/ui";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useMerchantProducts, firstImage, type Product } from "@waimai/shared";
import PageSlot from "../../../components/PageSlot.vue";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import ProductRow from "../../../components/ProductRow.vue";
import { usePageChrome } from "../../../common/pageChrome";
import { api } from "../../../common/api";
const router = useRouter(),
  chrome = usePageChrome();
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
  loaded,
  mutating,
  error,
  filters,
  load,
  retry,
  apply,
  batch,
} = useMerchantProducts(
  (path, options) => api(path, options, "MERCHANT"),
  new URLSearchParams(location.search).get("stock") ?? "",
);
const batchMode = ref(false),
  filtersOpen = ref(false),
  pending = ref<Product>(),
  stockOpen = ref(false),
  stock = ref("0");
const locked = computed(
  () => loading.value || mutating.value || store.value?.status === "FROZEN",
);
watch(
  batchMode,
  (value) => {
    chrome.actions = value;
    if (!value) selected.value = [];
  },
  { immediate: true },
);
function select(id: string) {
  if (selected.value.includes(id))
    selected.value = selected.value.filter((key) => key !== id);
  else if (selected.value.length < 100) selected.value.push(id);
  else error.value = "最多选择 100 个商品";
}
async function filter(reset = false) {
  if (await apply(reset)) filtersOpen.value = false;
}
function toggle(product: Product, listed: boolean) {
  if (!listed) pending.value = product;
  else void batch("on", [product.id]);
}
async function saveStock() {
  if (await batch("stock", selected.value, Number(stock.value)))
    stockOpen.value = false;
}
async function more() {
  if (loading.value || mutating.value) return;
  const requested = ++page.value;
  if (!(await load(true)) && page.value === requested)
    page.value = Math.max(1, requested - 1);
}
</script>
<template>
  <div class="app-products-page">
    <PageSlot name="right"
      ><div class="app-row">
        <Button
          variant="text"
          size="sm"
          :disabled="locked"
          @click="batchMode = !batchMode"
          >{{ batchMode ? "完成" : "批量" }}</Button
        ><NavBarIcon
          name="filter"
          label="筛选商品"
          @click="filtersOpen = true"
        /></div
    ></PageSlot>
    <PageSlot v-if="!batchMode" name="overlay"
      ><div class="sc-fab">
        <Button
          icon="plus"
          :disabled="locked"
          @click="router.push('/merchant/products/new')"
          >新增商品</Button
        >
      </div></PageSlot
    >
    <div class="sc-strip app-product-search">
      <SearchBar
        v-model="filters.keyword"
        placeholder="搜索商品名称"
        @action="apply()"
      />
    </div>
    <Tabs
      v-model="status"
      :items="[
        { key: 'ON', label: '在售', count: counts.ON },
        { key: 'OFF', label: '已下架', count: counts.OFF },
        { key: 'REVIEW', label: '审核中', count: counts.REVIEW },
      ]"
    />
    <div v-if="error" class="app-error body-sm" role="alert">
      {{ error
      }}<Button
        variant="text"
        size="sm"
        :disabled="loading || mutating"
        @click="retry()"
        >重试</Button
      >
    </div>
    <div class="xz-list sc-page-list" :aria-busy="loading">
      <div
        v-for="product in list"
        :key="product.id"
        :class="{ 'app-product-select-row': batchMode }"
      >
        <Checkbox
          v-if="batchMode"
          :model-value="selected.includes(product.id)"
          :disabled="locked"
          :aria-label="'选择 ' + product.name"
          @update:model-value="select(product.id)"
        />
        <ProductRow
          :name="product.name"
          :price="product.priceCents / 100"
          :original="
            product.originalPriceCents == null
              ? undefined
              : product.originalPriceCents / 100
          "
          :sales="product.monthlySales + '+'"
          :low-stock="product.lowStock"
          :status="product.displayStatus"
          :stock="product.stock"
          :image="firstImage(product.images)"
          :reason="product.rejectReason || undefined"
          :locked="locked || product.forcedOff || batchMode"
          @toggle="toggle(product, $event)"
          @edit="router.push('/merchant/products/' + product.id + '/edit')"
        />
      </div>
      <p v-if="loading && !list.length" class="app-empty body-sm" role="status">
        加载中
      </p>
      <p v-else-if="loaded && !list.length && !error" class="app-empty body">
        暂无商品
      </p>
      <Button
        v-if="list.length < total"
        variant="text"
        :disabled="loading || mutating"
        @click="more"
        >加载更多</Button
      >
    </div>
    <PageSlot v-if="batchMode" name="actions"
      ><div class="app-batch-bottom">
        <span class="body-sm">已选 {{ selected.length }} 项</span>
        <div class="sc-full-actions">
          <Button
            size="sm"
            variant="outline"
            :disabled="locked || !selected.length"
            @click="batch('on')"
            >上架</Button
          ><Button
            size="sm"
            variant="outline"
            :disabled="locked || !selected.length"
            @click="batch('off')"
            >下架</Button
          ><Button
            size="sm"
            :disabled="locked || !selected.length"
            @click="stockOpen = true"
            >改库存</Button
          >
        </div>
      </div></PageSlot
    >
    <Dialog
      :open="filtersOpen"
      title="筛选商品"
      variant="sheet"
      @close="filtersOpen = false"
      ><div class="app-stack">
        <Select
          v-model="filters.category"
          label="分类"
          :options="[
            { value: '', label: '全部分类' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]"
        /><Select
          v-model="filters.stock"
          label="库存"
          :options="[
            { value: '', label: '全部库存' },
            { value: 'low', label: '库存预警' },
            { value: 'soldout', label: '已售罄' },
          ]"
        />
        <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      </div>
      <template #actions
        ><Button
          size="lg"
          variant="outline"
          :disabled="loading"
          @click="filter(true)"
          >重置</Button
        ><Button size="lg" :disabled="loading" @click="filter()"
          >查询</Button
        ></template
      ></Dialog
    >
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
      :open="stockOpen"
      :close-disabled="mutating"
      :confirm-discard="true"
      title="修改库存"
      variant="sheet"
      @close="!mutating && (stockOpen = false)"
      ><form id="mobile-stock" class="app-form" @submit.prevent="saveStock">
        <Input
          v-model="stock"
          type="number"
          min="0"
          max="1000000"
          step="1"
          label="库存"
          required
          :disabled="mutating"
        />
        <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      </form>
      <template #actions
        ><Button
          size="lg"
          variant="outline"
          :disabled="mutating"
          @click="stockOpen = false"
          >取消</Button
        ><Button
          size="lg"
          type="submit"
          form="mobile-stock"
          :disabled="mutating"
          >修改库存</Button
        ></template
      ></Dialog
    >
  </div>
</template>
<style scoped>
.app-product-search {
  padding: 0 var(--space-3);
}
.app-products-page > .xz-list {
  padding-bottom: calc(var(--size-button-lg) + var(--space-6));
}
.app-product-select-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
}
.app-product-select-row > .xz-check {
  margin-top: var(--space-3);
}
.app-batch-bottom {
  padding-top: var(--space-2);
  text-align: center;
}
</style>
