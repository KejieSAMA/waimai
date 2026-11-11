<script setup lang="ts">
import { Button, Dialog, Input, OrderCard, SearchBar, Tabs } from "@waimai/ui";
import { onMounted, ref, watch } from "vue";
import { type Order, type Page, orderStatuses, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const disputes = true;
const list = ref<Order[]>([]),
  keyword = ref(""),
  status = ref(""),
  page = ref(1),
  total = ref(0),
  detail = ref<Order | null>(null),
  reason = ref("");
async function load() {
  await run(async () => {
    const result = await api<Page<Order>>(
      `/admin/${disputes ? "disputes" : "orders"}?status=${status.value}&keyword=${encodeURIComponent(keyword.value)}&page=${page.value}`,
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
      @action="
        page = 1;
        load();
      "
    /><OrderCard
      v-for="o in list"
      :key="o.id"
      view="admin"
      :title="o.store.name"
      :status="o.status"
      :items="
        o.items.map((i) => ({
          name: i.nameSnapshot,
          qty: i.qty,
          price: i.priceCentsSnapshot / 100,
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
    <Dialog
      :open="!!detail"
      title="订单详情"
      variant="sheet"
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
              price: i.priceCentsSnapshot / 100,
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
