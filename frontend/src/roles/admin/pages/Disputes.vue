<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import FilterBar from "../../../components/FilterBar.vue";
import {
  Button,
  Dialog,
  Input,
  OrderCard,
  SearchBar,
  Tabs,
  Tag,
} from "../../../components/pc";
import DataTable from "../../../components/DataTable.vue";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, onScopeDispose, ref, watch } from "vue";
import {
  type Order,
  usePagedList,
  orderStatuses,
  money,
  time,
} from "@waimai/shared";
import { api } from "../../../common/api";

const disputes = true;
const keyword = ref(""),
  appliedKeyword = ref(""),
  status = ref(""),
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
const pages = usePagedList<Order>((target) =>
  api(
    `/admin/disputes?status=${status.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${target}`,
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
async function resolve(approve: boolean) {
  if (!detail.value) return;
  if (busy.value) return;
  busy.value = true;
  actionError.value = "";
  try {
    await api(
      "/admin/disputes/" + detail.value!.id + "/resolve",
      { method: "POST", body: { approve, reason: reason.value } },
      "ADMIN",
    );
    if (!alive) return;
    detail.value = null;
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
        v-if="!disputes"
        v-model="status"
        :items="[
          { key: '', label: '全部订单' },
          ...Object.entries(orderStatuses).map(([key, s]) => ({
            key,
            label: s.label,
          })),
        ]"
      /><FilterBar @search="query" @reset="reset"
        ><SearchBar v-model="keyword" placeholder="搜索订单号" @action="query"
      /></FilterBar>
      <p
        v-if="error || (actionError && !detail)"
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
      ></DataTable
    >
    <Dialog
      :open="!!detail"
      title="订单详情"
      :close-disabled="busy"
      :confirm-discard="disputes"
      :dirty="!!reason.trim()"
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
        <Input
          v-if="disputes"
          v-model="reason"
          label="裁定原因"
          multiline
          :disabled="busy"
        />
        <p v-if="actionError" role="alert" class="app-error body-sm">
          {{ actionError }}
        </p>
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
    <template #footer
      ><Pagination
        :model-value="page"
        :total="total"
        @update:model-value="pages.changePage"
    /></template>
  </BackofficePage>
</template>
