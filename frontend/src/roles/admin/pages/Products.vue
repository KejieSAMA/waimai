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
import { onMounted, ref, watch } from "vue";
import {
  type Product,
  type Page,
  productStatuses,
  firstImage,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const list = ref<Product[]>([]),
  keyword = ref(""),
  appliedKeyword = ref(""),
  status = ref(new URLSearchParams(location.search).get("status") || ""),
  page = ref(1),
  total = ref(0),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const columns = [
  { key: "name", title: "商品" },
  { key: "storeId", title: "店铺" },
  { key: "priceCents", title: "价格", align: "right" as const, num: true },
  { key: "displayStatus", title: "状态" },
  { key: "actions", title: "操作" },
];
async function load() {
  await run(async () => {
    const result = await api<Page<Product>>(
      `/admin/products?status=${status.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${page.value}`,
      {},
      "ADMIN",
    );
    list.value = result.list;
    total.value = result.total;
  });
}
onMounted(load);
watch(status, () => {
  page.value = 1;
  void load();
});
function act(id: string, action: string) {
  if (action !== "approve") {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  void send(id, action);
}
async function send(id: string, action: string) {
  await run(async () => {
    await api(
      `/admin/products/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "ADMIN",
    );
    pending.value = null;
    await load();
  });
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
      /><FilterBar
        @search="
          appliedKeyword = keyword;
          page = 1;
          load();
        "
        @reset="
          keyword = appliedKeyword = '';
          page = 1;
          load();
        "
        ><SearchBar
          v-model="keyword"
          placeholder="搜索商品"
          @action="
            appliedKeyword = keyword;
            page = 1;
            load();
          "
      /></FilterBar>
    </template>
    <DataTable
      fill
      :reset-key="JSON.stringify([page, status, appliedKeyword])"
      :rows="list"
      :columns="columns"
      ><template #name="{ row }"
        ><DataTableMedia
          :name="row.name"
          :src="firstImage(row.images)"
          :sub="row.rejectReason || undefined" /></template
      ><template #storeId="{ row }"
        >{{ row.store?.name || "未命名店铺" }}（{{ row.storeId }}）</template
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
      variant="modal"
      @close="pending = null"
      ><Input v-model="reason" label="处理原因" multiline /><template #actions
        ><Button
          :disabled="busy || !reason.trim()"
          @click="pending && send(pending.id, pending.action)"
          >提交处理</Button
        ></template
      ></Dialog
    >
    <template #footer
      ><Pagination v-model="page" :total="total" @update:model-value="load"
    /></template>
  </BackofficePage>
</template>
