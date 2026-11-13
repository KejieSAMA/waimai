<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import {
  Button,
  ListStatus,
  Dialog,
  Input,
  OrderCard,
  SearchBar,
  Tabs,
} from "@waimai/ui";
import { onMounted, ref, watch, onScopeDispose } from "vue";
import { type Order, usePagedList, orderStatuses, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { useListScroll } from "../../../common/pageScroll";
const disputes = true;
const keyword = ref(""),
  status = ref(""),
  detail = ref<Order | null>(null),
  reason = ref("");
const listStart = ref<HTMLElement>();
const scroll = useListScroll(listStart);
let appliedKeyword = "";
const pages = usePagedList<Order>(
  (target) =>
    api(
      `/admin/disputes?status=${status.value}&keyword=${encodeURIComponent(appliedKeyword)}&page=${target}`,
      {},
      "ADMIN",
    ),
  { scroll },
);
const { list, page, total, loading, loaded, error } = pages;
const load = () => pages.refresh();
function query() {
  appliedKeyword = keyword.value;
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
  } catch (cause) {
    if (alive)
      actionError.value = cause instanceof Error ? cause.message : "处理失败";
  } finally {
    if (alive) busy.value = false;
  }
}
</script>
<template>
  <div class="app-stack" :aria-busy="loading">
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
    /><SearchBar
      v-model="keyword"
      placeholder="搜索订单号"
      action="查询"
      @action="query"
    />
    <div ref="listStart" />
    <ListStatus
      :loading="loading"
      :loaded="loaded"
      :error="error"
      :count="list.length"
      @retry="pages.retry"
    />
    <OrderCard
      v-for="o in list"
      :key="o.id"
      view="admin"
      :title="o.store.name"
      :status="o.status"
      :items="
        o.items.map((i) => ({
          name: i.nameSnapshot,
          qty: i.qty,
          price: i.lineTotalCents == null ? undefined : i.lineTotalCents / 100,
        }))
      "
      :total="o.payCents / 100"
      :time="time(o.createdAt)"
      :actions="[
        {
          label: '查看详情',
          onClick: () => {
            detail = o;
            reason = '';
          },
        },
      ]"
    />
    <div class="app-row">
      <Button
        :disabled="loading || page <= 1"
        @click="pages.changePage(page - 1)"
        >上一页</Button
      ><Button
        :disabled="loading || page * DEFAULT_PAGE_SIZE >= total"
        @click="pages.changePage(page + 1)"
        >下一页</Button
      >
    </div>
    <Dialog
      :open="!!detail"
      title="订单详情"
      variant="sheet"
      :close-disabled="busy"
      :confirm-discard="disputes"
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
  </div>
</template>
