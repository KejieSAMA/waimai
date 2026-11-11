<script setup lang="ts">
import FilterBar from "../../../components/FilterBar.vue";
import PageHeader from "../../../components/PageHeader.vue";
import {
  Button,
  Dialog,
  Input,
  OrderCard,
  SearchBar,
  Tabs,
  Tag,
} from "@waimai/ui";
import DataTable from "../../../components/DataTable.vue";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, ref, watch } from "vue";
import {
  type Order,
  type Page,
  orderStatuses,
  money,
  time,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const disputes = true;
const list = ref<Order[]>([]),
  keyword = ref(""),
  appliedKeyword = ref(""),
  status = ref(""),
  page = ref(1),
  total = ref(0),
  detail = ref<Order | null>(null),
  reason = ref("");
const columns = [
  { key: "orderNo", title: "订单编号" },
  { key: "store", title: "店铺" },
  { key: "status", title: "状态" },
  { key: "payCents", title: "实付", num: true, align: "right" as const },
  { key: "createdAt", title: "下单时间" },
  { key: "actions", title: "操作" },
];
async function load() {
  await run(async () => {
    const result = await api<Page<Order>>(
      `/admin/${disputes ? "disputes" : "orders"}?status=${status.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${page.value}`,
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
async function resolve(approve: boolean) {
  if (!detail.value) return;
  await run(async () => {
    await api(
      "/admin/disputes/" + detail.value!.id + "/resolve",
      { method: "POST", body: { approve, reason: reason.value } },
      "ADMIN",
    );
    detail.value = null;
    await load();
  });
}
</script>
<template>
  <div class="app-stack">
    <PageHeader :title="disputes ? '退款纠纷' : '订单监管'" />
    <Tabs
      v-if="!disputes"
      v-model="status"
      :items="[
        { key: '', label: '全部订单' },
        ...Object.entries(orderStatuses).map(([key, s]) => ({
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
        placeholder="搜索订单号"
        @action="
          appliedKeyword = keyword;
          page = 1;
          load();
        "
    /></FilterBar>
    <DataTable :rows="list" :columns="columns"
      ><template #store="{ row }">{{ row.store.name }}</template
      ><template #status="{ row }"
        ><Tag :tone="orderStatuses[row.status].tone">{{
          orderStatuses[row.status].label
        }}</Tag></template
      ><template #payCents="{ row }">{{ money(row.payCents) }}</template
      ><template #createdAt="{ row }">{{ time(row.createdAt) }}</template
      ><template #actions="{ row }"
        ><Button
          size="sm"
          variant="text"
          @click="
            detail = row;
            reason = '';
          "
          >查看详情</Button
        ></template
      ><template #footer
        ><Pagination
          v-model="page"
          :total="total"
          @update:model-value="load" /></template
    ></DataTable>
    <Dialog
      :open="!!detail"
      title="订单详情"
      variant="drawer"
      @close="detail = null"
      ><div v-if="detail" class="app-stack">
        <p class="body-sm">{{ detail.orderNo }}</p>
        <OrderCard
          view="admin"
          :title="detail.store.name"
          :status="detail.status"
          :items="
            detail.items.map((i) => ({
              name: i.nameSnapshot,
              qty: i.qty,
              price:
                i.lineTotalCents == null ? undefined : i.lineTotalCents / 100,
            }))
          "
          :total="detail.payCents / 100"
        />
        <p class="body">{{ detail.refundReason }}</p>
        <Input v-if="disputes" v-model="reason" label="裁定原因" multiline />
      </div>
      <template #actions
        ><template v-if="disputes"
          ><Button
            variant="danger-outline"
            :disabled="busy || !reason.trim()"
            @click="resolve(false)"
            >拒绝退款</Button
          ><Button :disabled="busy || !reason.trim()" @click="resolve(true)"
            >同意退款</Button
          ></template
        ><Button v-else variant="outline" @click="detail = null"
          >关闭</Button
        ></template
      ></Dialog
    >
  </div>
</template>
