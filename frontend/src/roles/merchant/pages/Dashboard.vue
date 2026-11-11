<script setup lang="ts">
import {
  ListCell,
  ListCellGroup,
  OrderCard,
  StatCard,
  Switch,
  Tag,
} from "@waimai/ui";
import PageHeader from "../../../components/PageHeader.vue";
import TrendChart from "../../../components/TrendChart.vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  type Stats,
  type Store,
  type Order,
  type Page,
  storeStatuses,
  dashboardMoney,
  time,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
import { useOrderStream } from "../../../common/events";
const router = useRouter(),
  store = ref<Store>(),
  stats = ref<Stats>(),
  trend = ref<{ label: string; value: number }[]>([]),
  orders = ref<Order[]>([]);
async function load() {
  const s = await api<Store | null>("/merchant/application", {}, "MERCHANT");
  if (!s) {
    await router.push("/merchant/apply");
    return;
  }
  store.value = s;
  const [a, b, c] = await Promise.all([
    api<Stats>("/merchant/stats/today", {}, "MERCHANT"),
    api<{ label: string; value: number }[]>(
      "/merchant/stats/trend?days=7",
      {},
      "MERCHANT",
    ),
    api<Page<Order>>("/merchant/orders?status=PENDING", {}, "MERCHANT"),
  ]);
  stats.value = a;
  trend.value = b;
  orders.value = c.list;
}
const stream = useOrderStream(() => run(load));
onMounted(() => run(load));
async function setOpen(value: boolean) {
  await run(async () => {
    store.value = await api<Store>(
      "/merchant/store/open",
      { method: "PUT", body: { open: value } },
      "MERCHANT",
    );
  });
}
</script>
<template>
  <div v-if="store" class="app-stack">
    <PageHeader title="工作台" :subtitle="store.name" />
    <div class="app-card app-row">
      <Tag :tone="storeStatuses[store.status].tone">{{
        storeStatuses[store.status].label
      }}</Tag
      ><Switch
        label="营业状态"
        :model-value="store.status === 'OPEN'"
        :disabled="!['OPEN', 'CLOSED'].includes(store.status)"
        @update:model-value="setOpen"
      /><Switch
        label="开启提醒"
        :model-value="stream.enabled.value"
        @update:model-value="stream.toggle"
      /><span class="body-sm app-muted">{{
        stream.connected.value ? "提醒已连接" : "开启后接收新订单提示音"
      }}</span>
    </div>
    <div v-if="stats" class="ds-grid ds-stats">
      <StatCard
        label="今日营业额（元）"
        :value="dashboardMoney(stats.revenueCents)"
        tone="brand"
      /><StatCard label="今日订单" :value="stats.orders" unit="单" /><StatCard
        label="新订单"
        :value="stats.pending"
        unit="单"
      /><StatCard label="商品数量" :value="stats.products" unit="件" />
    </div>
    <TrendChart :data="trend" title="近 7 日营业额" prefix="¥" /><ListCellGroup
      title="待处理"
      ><ListCell
        title="新订单"
        icon="order"
        :value="orders.length"
        arrow
        @click="router.push('/merchant/orders')" /><ListCell
        title="商品管理"
        icon="box"
        arrow
        @click="router.push('/merchant/products')"
    /></ListCellGroup>
    <div class="ds-grid ds-cards3">
      <OrderCard
        v-for="o in orders.slice(0, 3)"
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
        :actions="[
          { label: '查看订单', onClick: () => router.push('/merchant/orders') },
        ]"
      />
    </div>
  </div>
</template>
