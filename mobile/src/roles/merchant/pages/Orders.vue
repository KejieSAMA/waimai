<script setup lang="ts">
import { Button, Dialog, Input, OrderCard, Switch, Tabs } from "@waimai/ui";
import { computed, onMounted, ref, watch } from "vue";
import { type Order, type Page, orderStatuses, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
import { useOrderStream } from "../../../common/events";
const list = ref<Order[]>([]),
  status = ref(""),
  page = ref(1),
  total = ref(0),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const filtered = computed(() =>
  status.value
    ? list.value.filter((o) => o.status === status.value)
    : list.value,
);
async function load() {
  await run(async () => {
    const result = await api<Page<Order>>(
      `/merchant/orders?status=${status.value}&page=${page.value}`,
      {},
      "MERCHANT",
    );
    list.value = result.list;
    total.value = result.total;
  });
}
const stream = useOrderStream(load);
onMounted(load);
watch(status, () => {
  page.value = 1;
  void load();
});
async function act(id: string, action: string) {
  if (["reject", "refund-reject"].includes(action)) {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  await send(id, action);
}
async function send(id: string, action: string) {
  await run(async () => {
    await api(
      `/merchant/orders/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "MERCHANT",
    );
    pending.value = null;
    await load();
  });
}
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">订单</h1>
    <div class="app-row">
      <Switch
        label="开启提醒"
        :model-value="stream.enabled.value"
        @update:model-value="stream.toggle"
      /><Button variant="outline" @click="load">刷新订单</Button>
    </div>
    <Tabs
      v-model="status"
      :items="[
        { key: '', label: '全部' },
        ...Object.entries(orderStatuses)
          .filter(([k]) => k !== 'PENDING_PAY')
          .map(([key, s]) => ({ key, label: s.label })),
      ]"
    />
    <div class="xz-list">
      <section
        v-for="column in [
          {
            key: status,
            label: status
              ? orderStatuses[status as keyof typeof orderStatuses].label
              : '全部订单',
          },
        ]"
        :key="column.key"
        class="app-stack"
      >
        <h2 class="title-sm">{{ column.label }}</h2>
        <OrderCard
          v-for="o in filtered"
          :key="o.id"
          view="merchant"
          :title="o.type === 'PICKUP' ? '到店自提' : '外卖配送'"
          :serial="o.serialOfDay"
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
          :meta="JSON.parse(o.addressSnapshot).phone"
          :note="o.note"
          ><template #actions
            ><template v-if="o.status === 'PENDING'"
              ><Button
                size="sm"
                variant="outline"
                :disabled="busy"
                @click="act(o.id, 'reject')"
                >拒单</Button
              ><Button size="sm" :disabled="busy" @click="act(o.id, 'accept')"
                >接单</Button
              ></template
            ><Button
              v-if="o.status === 'PREPARING'"
              size="sm"
              :disabled="busy"
              @click="act(o.id, 'ready')"
              >出餐</Button
            ><template v-if="o.status === 'REFUNDING'"
              ><p v-if="o.disputed" class="body-sm">平台处理中</p>
              <template v-else
                ><Button
                  size="sm"
                  variant="outline"
                  :disabled="busy"
                  @click="act(o.id, 'refund-reject')"
                  >拒绝退款</Button
                ><Button
                  size="sm"
                  :disabled="busy"
                  @click="act(o.id, 'refund-approve')"
                  >同意退款</Button
                ></template
              ></template
            ></template
          ></OrderCard
        >
      </section>
    </div>
    <p v-if="!list.length" class="app-empty body">暂无订单</p>
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
  </div>
</template>
