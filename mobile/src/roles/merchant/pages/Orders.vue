<script setup lang="ts">
import PageSlot from "../../../components/PageSlot.vue";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import { Button, Dialog, Input, OrderCard, Switch, Tabs } from "@waimai/ui";
import { computed, onMounted, ref, watch } from "vue";
import { type Order, type Page, orderStatuses, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
import { useOrderStream } from "../../../common/events";
const toolsOpen = ref(false),
  keyword = ref("");
const counts = ref<Record<string, number>>({});
const list = ref<Order[]>([]),
  status = ref(new URLSearchParams(location.search).get("status") || "PENDING"),
  page = ref(1),
  total = ref(0),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const filtered = computed(() => list.value);
async function load(append = false) {
  await run(async () => {
    const result = await api<Page<Order>>(
      `/merchant/orders?stage=${status.value}&keyword=${encodeURIComponent(keyword.value)}&page=${page.value}`,
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
      ["PENDING", "PREPARING", "DELIVERING", "REFUNDING"].map((stage) =>
        api<Page<Order>>(
          `/merchant/orders?stage=${stage}&pageSize=1`,
          {},
          "MERCHANT",
        ),
      ),
    );
    counts.value = Object.fromEntries(
      ["PENDING", "PREPARING", "DELIVERING", "REFUNDING"].map((stage, i) => [
        stage,
        groups[i].total,
      ]),
    );
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
    page.value = 1;
    await load();
  });
}
</script>
<template>
  <div class="app-merchant-orders">
    <PageSlot name="right"
      ><NavBarIcon name="search" label="搜索订单" @click="toolsOpen = true"
    /></PageSlot>
    <Dialog
      :open="toolsOpen"
      title="搜索订单"
      variant="sheet"
      @close="toolsOpen = false"
      ><Input v-model="keyword" label="订单号" /><Switch
        label="开启新订单提醒"
        :model-value="stream.enabled.value"
        @update:model-value="stream.toggle"
      /><template #actions
        ><Button
          @click="
            page = 1;
            load();
            toolsOpen = false;
          "
          >查询订单</Button
        ></template
      ></Dialog
    >
    <Tabs
      v-model="status"
      :items="[
        { key: 'PENDING', label: '新订单', count: counts.PENDING, alert: true },
        {
          key: 'PREPARING',
          label: '备餐中',
          count: counts.PREPARING,
          alert: false,
        },
        {
          key: 'DELIVERING',
          label: '配送中',
          count: counts.DELIVERING,
          alert: false,
        },
        {
          key: 'REFUNDING',
          label: '退款',
          count: counts.REFUNDING,
          alert: false,
        },
      ]"
    />
    <div class="xz-list sc-page-list">
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
        class="app-order-column"
      >
        <OrderCard
          v-for="o in filtered"
          :key="o.id"
          view="merchant"
          :title="
            (o.type === 'PICKUP' ? '到店自提' : '外卖') +
            (JSON.parse(o.addressSnapshot).phone
              ? ' · ' + JSON.parse(o.addressSnapshot).phone
              : '')
          "
          :serial="o.serialOfDay"
          :status="o.status"
          :items="
            o.items.map((i) => ({
              name: i.nameSnapshot,
              qty: i.qty,
              price: (i.lineTotalCents ?? i.priceCentsSnapshot) / 100,
            }))
          "
          :total="o.payCents / 100"
          :time="time(o.createdAt)"
          :note="o.note"
          ><template #actions
            ><template v-if="o.status === 'PENDING'"
              ><Button
                size="sm"
                variant="danger-outline"
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
                  variant="danger-outline"
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
    <Dialog
      :open="!!pending"
      title="填写原因"
      variant="sheet"
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

<style scoped>
.app-order-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.app-merchant-orders > .app-row {
  padding: var(--space-2) var(--space-3);
}
</style>
