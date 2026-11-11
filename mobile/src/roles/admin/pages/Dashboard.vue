<script setup lang="ts">
import { ListCell, ListCellGroup, StatCard } from "@waimai/ui";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { type Stats, type Store, dashboardMoney } from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
const router = useRouter(),
  stats = ref<Stats>(),
  trend = ref<{ label: string; value: number }[]>([]),
  ranking = ref<Store[]>([]);
onMounted(() =>
  run(async () => {
    const [a, b, c] = await Promise.all([
      api<Stats>("/admin/stats/overview", {}, "ADMIN"),
      api<{ label: string; value: number }[]>(
        "/admin/stats/trend?days=14",
        {},
        "ADMIN",
      ),
      api<Store[]>("/admin/stats/ranking", {}, "ADMIN"),
    ]);
    stats.value = a;
    trend.value = b;
    ranking.value = c;
  }),
);
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">数据总览</h1>
    <div v-if="stats" class="app-grid">
      <StatCard
        label="今日 GMV（元）"
        :value="dashboardMoney(stats.revenueCents)"
        tone="chrome"
      /><StatCard label="今日订单" :value="stats.orders" unit="单" /><StatCard
        label="在营商家"
        :value="stats.stores"
        unit="家"
      /><StatCard label="待审核" :value="stats.pending" unit="家" />
    </div>
    <ListCellGroup title="待处理"
      ><ListCell
        title="商家待审核"
        :value="stats?.pending"
        icon="shield"
        arrow
        @click="router.push('/admin/audit')" /><ListCell
        title="退款纠纷"
        icon="alert"
        arrow
        @click="router.push('/admin/disputes')"
    /></ListCellGroup>
    <div class="app-card">
      <h2 class="title-sm">商家销量排行</h2>
      <ListCell
        v-for="(store, i) in ranking"
        :key="store.id"
        :title="i + 1 + '. ' + store.name"
        :value="store.monthlySales + ' 单'"
        :desc="store.category?.name"
      />
    </div>
  </div>
</template>
