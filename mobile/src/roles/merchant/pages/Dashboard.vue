<script setup lang="ts">
import NavBarIcon from "../../../components/NavBarIcon.vue";
import {
  Button,
  ListCell,
  ListCellGroup,
  StatCard,
  Switch,
  Tag,
} from "@waimai/ui";
import { computed, watch } from "vue";
import { useRouter } from "vue-router";
import {
  type Store,
  dashboardMoney,
  useMerchantDashboard,
  trafficDescription,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { useAuth } from "../../../common/auth";
import { run } from "../../../common/feedback";
import { useOrderStream } from "../../../common/events";
import { orderActivity } from "../../../common/orderActivity";
const router = useRouter(),
  auth = useAuth();
const dashboard = useMerchantDashboard(
  (path, options) => api(path, options, "MERCHANT"),
  computed(() =>
    auth.activeRole === "MERCHANT" ? (auth.account?.id ?? "") : "",
  ),
  orderActivity,
  {
    loadStore: () => api<Store | null>("/merchant/application", {}, "MERCHANT"),
    missing: () => router.replace("/merchant/apply"),
  },
);
const { store, stats } = dashboard;
const stream = useOrderStream(() => dashboard.refresh());
async function setOpen(value: boolean) {
  await run(async () => {
    store.value = await api<Store>(
      "/merchant/store/open",
      { method: "PUT", body: { open: value } },
      "MERCHANT",
    );
  });
}
const todos = computed(() =>
  stats.value
    ? [
        {
          label: "新订单",
          count: stats.value.pending,
          icon: "order" as const,
          path: "/merchant/orders?status=PENDING",
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
        {
          label: "差评待回复",
          count: stats.value.badReviews,
          icon: "star" as const,
          path: "/merchant/reviews?rating=bad&reply=pending",
        },
      ]
    : [],
);
import PageSlot from "../../../components/PageSlot.vue";
import { usePageChrome } from "../../../common/pageChrome";
const chrome = usePageChrome();
watch(store, (value) => {
  if (value) chrome.title = value.name;
});
</script>
<template>
  <PageSlot name="right"
    ><NavBarIcon
      name="bell"
      label="待办消息"
      :badge="stats?.pending"
      @click="router.push('/merchant/orders')"
  /></PageSlot>
  <p v-if="!store || !stats" class="app-empty body-sm" role="status">
    {{ dashboard.error.value || "正在读取经营数据" }}
    <Button
      v-if="dashboard.error.value"
      variant="text"
      @click="dashboard.refresh()"
      >重试</Button
    >
  </p>
  <div v-if="store && stats" class="xz-list sc-page-list">
    <ListCellGroup
      ><ListCell
        icon="store"
        :title="
          store.status === 'OPEN'
            ? '营业中'
            : store.status === 'CLOSED'
              ? '休息中'
              : '营业状态'
        "
        :desc="'今日 ' + store.openHours + ' · 关闭后用户无法下单'"
        ><template #extra
          ><Switch
            :model-value="store.status === 'OPEN'"
            :disabled="!['OPEN', 'CLOSED'].includes(store.status)"
            aria-label="营业状态"
            @update:model-value="setOpen" /></template></ListCell
    ></ListCellGroup>
    <StatCard
      label="今日营业额（元）"
      :value="dashboardMoney(stats.revenueCents)"
      tone="brand"
    />
    <div class="xz-grid2">
      <StatCard
        size="sm"
        label="有效订单"
        :value="stats.validOrders"
        unit="单"
      /><StatCard
        size="sm"
        label="进店人数"
        :value="stats.visitors ?? '—'"
        unit="人"
      /><StatCard
        size="sm"
        label="支付转化率"
        :value="
          stats.conversionRate == null ? '—' : stats.conversionRate.toFixed(1)
        "
        :unit="stats.conversionRate == null ? '' : '%'"
      /><StatCard size="sm" label="退款" :value="stats.refunds" unit="单" />
    </div>
    <p class="body-sm" style="color: var(--ink-muted)">
      {{ trafficDescription(stats) }}
    </p>
    <p v-if="dashboard.error.value" class="body-sm" role="alert">
      {{ dashboard.error.value }}
      <Button variant="text" size="sm" @click="dashboard.refresh()"
        >重试</Button
      >
    </p>
    <ListCellGroup title="待处理"
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
      ></ListCellGroup
    ><ListCellGroup
      ><ListCell
        title="新订单提醒"
        :desc="stream.connected.value ? '提醒已连接' : '开启后接收新订单提示音'"
        ><template #extra
          ><Switch
            label="开启提醒"
            :model-value="stream.enabled.value"
            @update:model-value="stream.toggle" /></template></ListCell
    ></ListCellGroup>
  </div>
</template>
