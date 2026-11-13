<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import FilterBar from "../../../components/FilterBar.vue";
import {
  Button,
  Dialog,
  Input,
  SearchBar,
  Tabs,
  Tag,
} from "../../../components/pc";
import DataTable from "../../../components/DataTable.vue";
import DataTableMedia from "../../../components/DataTableMedia.vue";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, onScopeDispose, ref, watch } from "vue";
import {
  type Product,
  usePagedList,
  productStatuses,
  firstImage,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";

const keyword = ref(""),
  appliedKeyword = ref(""),
  status = ref(new URLSearchParams(location.search).get("status") || ""),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const columns = [
  { key: "name", title: "商品" },
  { key: "storeId", title: "店铺" },
  { key: "priceCents", title: "价格", align: "right" as const, num: true },
  { key: "displayStatus", title: "状态" },
  { key: "actions", title: "操作" },
];
const pages = usePagedList<Product>((target) =>
  api(
    `/admin/products?status=${status.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${target}`,
    {},
    "ADMIN",
  ),
);
const { list, total, page, loading, loaded, error } = pages;
const load = () => pages.refresh();
function query() {
  appliedKeyword.value = keyword.value;
  void pages.query();
}
function reset() {
  keyword.value = appliedKeyword.value = "";
  void pages.query();
}
onMounted(pages.load);
watch(status, () => void pages.query());
const busy = ref(false),
  actionError = ref("");
let alive = true;
onScopeDispose(() => {
  alive = false;
});
function act(id: string, action: string) {
  if (busy.value) return;
  actionError.value = "";
  if (action !== "approve") {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  void send(id, action);
}
async function send(id: string, action: string) {
  if (busy.value) return;
  busy.value = true;
  actionError.value = "";
  try {
    await api(
      `/admin/products/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "ADMIN",
    );
    if (!alive) return;
    pending.value = null;
    await load();
  } catch (e) {
    if (alive) actionError.value = e instanceof Error ? e.message : "处理失败";
  } finally {
    if (alive) busy.value = false;
  }
}
</script>
<template>
  <BackofficePage :body-scroll="false">
    <template #header>
      <Tabs
        v-model="status"
        :items="[
          { key: '', label: '全部商品' },
          ...Object.entries(productStatuses).map(([key, s]) => ({
            key,
            label: s.label,
          })),
        ]"
      /><FilterBar @search="query" @reset="reset"
        ><SearchBar v-model="keyword" placeholder="搜索商品" @action="query"
      /></FilterBar>
      <p
        v-if="error || (actionError && !pending)"
        role="alert"
        class="app-error body-sm"
      >
        {{ error || actionError
        }}<Button v-if="error" variant="text" @click="pages.retry">重试</Button>
      </p>
      <p v-else-if="loading" role="status" class="body-sm app-muted">
        {{ loaded ? "正在更新" : "正在加载" }}
      </p>
    </template>
    <DataTable
      fill
      :reset-key="JSON.stringify([page, status, appliedKeyword])"
      :rows="list"
      :aria-busy="loading"
      :columns="columns"
      ><template #empty>{{
        loading
          ? "正在加载"
          : error
            ? "读取失败，请重试"
            : loaded
              ? "暂无数据"
              : "正在加载"
      }}</template
      ><template #name="{ row }"
        ><DataTableMedia
          :name="row.name"
          :src="firstImage(row.images)"
          :sub="row.rejectReason || undefined" /></template
      ><template #storeId="{ row }">{{
        row.store?.name || "未命名店铺"
      }}</template
      ><template #priceCents="{ row }">{{ money(row.priceCents) }}</template
      ><template #displayStatus="{ row }"
        ><Tag :tone="productStatuses[row.displayStatus].tone">{{
          productStatuses[row.displayStatus].label
        }}</Tag></template
      ><template #actions="{ row }"
        ><div class="app-table-actions">
          <template v-if="row.status === 'REVIEW'"
            ><Button size="sm" variant="text" @click="act(row.id, 'approve')"
              >通过</Button
            ><Button
              size="sm"
              variant="danger-text"
              @click="act(row.id, 'reject')"
              >驳回</Button
            ></template
          ><Button
            v-if="!row.forcedOff"
            size="sm"
            variant="danger-text"
            @click="act(row.id, 'force-off')"
            >强制下架</Button
          >
        </div></template
      ></DataTable
    >
    <Dialog
      :open="!!pending"
      title="填写原因"
      :close-disabled="busy"
      :confirm-discard="true"
      :dirty="!!reason.trim()"
      variant="modal"
      @close="pending = null"
      ><Input v-model="reason" label="处理原因" multiline :disabled="busy" />
      <p v-if="actionError" role="alert" class="app-error body-sm">
        {{ actionError }}
      </p>
      <template #actions
        ><Button
          :disabled="busy || !reason.trim()"
          @click="pending && send(pending.id, pending.action)"
          >提交处理</Button
        ></template
      ></Dialog
    >
    <template #footer
      ><Pagination
        :model-value="page"
        :total="total"
        @update:model-value="pages.changePage"
    /></template>
  </BackofficePage>
</template>
