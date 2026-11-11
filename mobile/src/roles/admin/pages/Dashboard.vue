<script setup lang="ts">
import NavBarIcon from "../../../components/NavBarIcon.vue";
import { ListCell, ListCellGroup, StatCard, Tag } from "@waimai/ui";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { type Stats, dashboardMoney } from "@waimai/shared";
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
          count: stats.value.refundPending,
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
import PageSlot from "../../../components/PageSlot.vue";
onMounted(() =>
  run(async () => {
    stats.value = await api<Stats>("/admin/stats/overview", {}, "ADMIN");
  }),
);
</script>
<template>
  <PageSlot name="right"
    ><NavBarIcon
      name="bell"
      label="待办消息"
      :badge="stats?.pending"
      @click="router.push('/admin/audit')"
  /></PageSlot>
  <div v-if="stats" class="xz-list sc-page-list">
    <PageSlot name="extra"
      ><div class="sc-hero">
        <StatCard
          tone="chrome"
          label="平台今日 GMV（元）"
          :value="dashboardMoney(stats.revenueCents)"
        /></div
    ></PageSlot>
    <div class="xz-grid2">
      <StatCard
        size="sm"
        label="订单量"
        :value="stats.orders"
        unit="单"
      /><StatCard
        size="sm"
        label="在营商家"
        :value="stats.stores"
        unit="家"
      /><StatCard
        size="sm"
        label="新入驻"
        :value="stats.newStores"
        unit="家"
      /><StatCard size="sm" label="退款率" :value="stats.refundRate" unit="%" />
    </div>
    <ListCellGroup title="待办"
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
</template>
