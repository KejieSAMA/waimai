<script setup lang="ts">
import { OrderCard, Tabs } from "@waimai/ui";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { type Order, type Page, orderStatuses, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { run } from "../../../common/feedback";
const router = useRouter(),
  status = ref(""),
  list = ref<Order[]>([]),
  page = ref(1),
  total = ref(0);
async function load() {
  await run(async () => {
    const result = await api<Page<Order>>(
      `/user/orders?status=${status.value}&page=${page.value}`,
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
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">我的订单</h1>
    <Tabs
      v-model="status"
      :items="[
        { key: '', label: '全部订单' },
        ...Object.entries(orderStatuses).map(([key, s]) => ({
          key,
          label: s.label,
        })),
      ]"
    />
    <div class="ds-orders">
      <OrderCard
        v-for="order in list"
        :key="order.id"
        :title="order.store.name"
        :status="order.status"
        :items="
          order.items.map((it) => ({ name: it.nameSnapshot, qty: it.qty }))
        "
        :total="order.payCents / 100"
        :time="time(order.createdAt)"
        :actions="[
          {
            label: '查看订单',
            onClick: () => router.push('/orders/' + order.id),
          },
        ]"
      />
    </div>
    <p v-if="!list.length" class="app-empty body">暂无订单</p>
    <Pagination v-model="page" :total="total" @update:model-value="load" />
  </div>
</template>
