<script setup lang="ts">
import { ListCell, ListCellGroup, StatCard, Tag } from "@waimai/ui";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  type Stats,
  type Store,
  dashboardMoney,
  storeStatuses,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
const router = useRouter(),
  stats = ref<Stats>();
const todos = computed(() =>
  stats.value
    ? [
        {
          label: "商家入驻待审核",
          count: stats.value.pending,
          tone: "warning" as const,
          icon: "shield" as const,
          path: "/admin/audit",
        },
        {
          label: "商品待审核",
          count: stats.value.pendingProducts,
          tone: "info" as const,
          icon: "box" as const,
          path: "/admin/products?status=REVIEW",
        },
        {
          label: "退款纠纷",
          count: stats.value.disputesPending,
          tone: "danger" as const,
          icon: "alert" as const,
          path: "/admin/disputes",
        },
        {
          label: "证照 30 天内到期",
          count: stats.value.expiringLicenses,
          tone: "neutral" as const,
          icon: "clock" as const,
          path: "/admin/merchants",
        },
      ]
    : [],
);
import PageHeader from "../../../components/PageHeader.vue";
import TrendChart from "../../../components/TrendChart.vue";
import DataTable from "../../../components/DataTable.vue";
import DataTableMedia from "../../../components/DataTableMedia.vue";
const trend = ref<{ label: string; value: number }[]>([]),
  ranking = ref<(Store & { todayOrders: number; todayRevenueCents: number })[]>(
    [],
  );
const columns = [
  { key: "rank", title: "排名", width: 64 },
  { key: "name", title: "商家" },
  { key: "todayOrders", title: "今日订单", num: true, align: "right" as const },
  {
    key: "todayRevenueCents",
    title: "今日 GMV（元）",
    num: true,
    align: "right" as const,
  },
  { key: "rating", title: "评分", num: true, align: "right" as const },
  { key: "status", title: "状态" },
];
onMounted(() =>
  run(async () => {
    const [a, b, c] = await Promise.all([
      api<Stats>("/admin/stats/overview", {}, "ADMIN"),
      api<{ label: string; value: number }[]>(
        "/admin/stats/trend?days=14",
        {},
        "ADMIN",
      ),
      api<typeof ranking.value>("/admin/stats/ranking", {}, "ADMIN"),
    ]);
    stats.value = a;
    trend.value = b;
    ranking.value = c;
  }),
);
</script>
<template>
  <div>
    <PageHeader title="数据总览" subtitle="平台今日经营情况" /><template
      v-if="stats"
      ><div class="ds-grid ds-stats5">
        <StatCard
          tone="chrome"
          label="平台今日 GMV（元）"
          :value="dashboardMoney(stats.revenueCents)"
        /><StatCard label="订单量" :value="stats.orders" unit="单" /><StatCard
          label="在营商家"
          :value="stats.stores"
          unit="家"
        /><StatCard
          label="新入驻"
          :value="stats.newStores"
          unit="家"
        /><StatCard label="退款率" :value="stats.refundRate" unit="%" />
      </div>
      <div class="ds-grid ds-main">
        <TrendChart
          :data="trend"
          title="近 14 日 GMV"
          subtitle="单位：元"
          prefix="¥"
          :height="236"
        /><ListCellGroup title="待办"
          ><ListCell
            v-for="item in todos"
            :key="item.label"
            :title="item.label"
            :icon="item.icon"
            arrow
            @click="router.push(item.path)"
            ><template #extra
              ><Tag :tone="item.tone">{{ item.count }}</Tag></template
            ></ListCell
          ></ListCellGroup
        >
      </div>
      <div class="ds-section">
        <span class="title-sm">今日商家订单量排行</span>
      </div>
      <DataTable :rows="ranking" :columns="columns"
        ><template #rank="{ row }"
          ><span class="ds-rank">{{ ranking.indexOf(row) + 1 }}</span></template
        ><template #name="{ row }"
          ><DataTableMedia
            kind="logo"
            :name="row.name"
            :src="row.logo"
            :sub="row.category?.name" /></template
        ><template #todayRevenueCents="{ row }">{{
          dashboardMoney(row.todayRevenueCents)
        }}</template
        ><template #status="{ row }"
          ><Tag :tone="storeStatuses[row.status].tone">{{
            storeStatuses[row.status].label
          }}</Tag></template
        ></DataTable
      ></template
    >
  </div>
</template>
