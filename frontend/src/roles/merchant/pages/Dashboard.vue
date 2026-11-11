<script setup lang="ts">
import {
  Button,
  ListCell,
  ListCellGroup,
  OrderCard,
  StatCard,
  Switch,
  Tag,
} from "@waimai/ui";
import { merchantStore } from "../../../common/merchantStatus";
import PageHeader from "../../../components/PageHeader.vue";
import TrendChart from "../../../components/TrendChart.vue";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  type Stats,
  type Store,
  type Order,
  type Page,
  dashboardMoney,
  time,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
import { useOrderStream } from "../../../common/events";
const router = useRouter(),
  store = merchantStore,
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
const todos = computed(() =>
  stats.value
    ? [
        {
          label: "新订单",
          count: stats.value.pending,
          icon: "order" as const,
          path: "/merchant/orders",
        },
        {
          label: "退款申请",
          count: stats.value.refundPending,
          icon: "wallet" as const,
          path: "/merchant/orders?status=REFUNDING",
        },
        {
          label: "库存预警",
          count: stats.value.lowStock,
          icon: "box" as const,
          path: "/merchant/products?stock=low",
        },
      ]
    : [],
);
async function accept(id: string) {
  await run(async () => {
    await api(`/merchant/orders/${id}/accept`, { method: "POST" }, "MERCHANT");
    await load();
  });
}
</script>
<template>
  <div v-if="store && stats">
    <PageHeader
      title="工作台"
      :subtitle="store.name + ' · 今日 ' + store.openHours"
      ><template #actions
        ><Button variant="outline" @click="router.push('/merchant/store')"
          >营业时间</Button
        ><Button icon="plus" @click="router.push('/merchant/products/new')"
          >新增商品</Button
        ></template
      ></PageHeader
    >
    <div class="ds-grid ds-stats">
      <StatCard
        label="今日营业额（元）"
        :value="dashboardMoney(stats.revenueCents)"
        tone="brand"
      /><StatCard
        label="有效订单"
        :value="stats.validOrders"
        unit="单"
      /><StatCard
        label="进店人数"
        :value="stats.visitors ?? '—'"
        unit="人"
      /><StatCard
        label="下单转化率"
        :value="stats.conversionRate ?? '—'"
        unit="%"
      />
    </div>
    <div class="ds-grid ds-main">
      <TrendChart
        :data="trend"
        title="近 7 日营业额"
        subtitle="单位：元"
        prefix="¥"
        :height="236"
      /><ListCellGroup title="待处理"
        ><ListCell
          v-for="item in todos"
          :key="item.label"
          :title="item.label"
          :icon="item.icon"
          arrow
          @click="router.push(item.path)"
          ><template #extra
            ><Tag :tone="item.icon === 'wallet' ? 'danger' : 'brand'">{{
              item.count
            }}</Tag></template
          ></ListCell
        ><ListCell title="差评待回复" :value="stats?.badReviews" icon="star"
      /></ListCellGroup>
    </div>
    <div class="ds-section">
      <span class="title-sm">新订单</span>
      <div class="app-row">
        <Switch
          label="开启提醒"
          :model-value="stream.enabled.value"
          @update:model-value="stream.toggle"
        /><Button
          variant="text"
          size="sm"
          @click="router.push('/merchant/orders')"
          >查看全部订单</Button
        >
      </div>
    </div>
    <div class="ds-grid ds-cards3">
      <OrderCard
        v-for="o in orders.slice(0, 3)"
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
            price:
              i.lineTotalCents == null ? undefined : i.lineTotalCents / 100,
          }))
        "
        :total="o.payCents / 100"
        :time="time(o.createdAt)"
        :note="o.note"
        :actions="[
          { label: '查看订单', onClick: () => router.push('/merchant/orders') },
          { label: '接单', variant: 'primary', onClick: () => accept(o.id) },
        ]"
      />
    </div>
    <p v-if="!orders.length" class="app-empty body-sm">暂无新订单</p>
  </div>
</template>
