<script setup lang="ts">
import { Button, Dialog, Input, OrderCard, Switch, Tag } from "@waimai/ui";
import PageHeader from "../../../components/PageHeader.vue";
import Pagination from "../../../components/Pagination.vue";
import { onMounted, ref } from "vue";
import { usePagedColumns, type Order, type Page, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
import { useOrderStream } from "../../../common/events";
const columns = [
  { key: "PENDING", label: "新订单", tone: "brand" as const },
  { key: "PREPARING", label: "备餐中", tone: "warning" as const },
  { key: "DELIVERING", label: "配送中", tone: "info" as const },
  { key: "REFUNDING", label: "退款", tone: "danger" as const },
];
const {
  boards,
  load: loadColumn,
  refresh: load,
  changePage,
} = usePagedColumns<Order>(
  columns.map((c) => c.key),
  (key, page) =>
    api<Page<Order>>(
      `/merchant/orders?stage=${key}&page=${page}`,
      {},
      "MERCHANT",
    ),
);
const reason = ref(""),
  pending = ref<{ id: string; action: string }>();
const stream = useOrderStream(load);
onMounted(load);
async function act(id: string, action: string) {
  if (["reject", "refund-reject"].includes(action)) {
    pending.value = { id, action };
    reason.value = "";
  } else await send(id, action);
}
async function send(id: string, action: string) {
  await run(async () => {
    await api(
      `/merchant/orders/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "MERCHANT",
    );
    pending.value = undefined;
    await load();
  });
}
function title(order: Order) {
  let phone = "";
  try {
    phone = JSON.parse(order.addressSnapshot).phone ?? "";
  } catch {
    /* Missing legacy contact. */
  }
  return (
    (order.type === "PICKUP" ? "到店自提" : "外卖") +
    (phone ? " · " + phone : "")
  );
}
</script>
<template>
  <div class="app-stack">
    <PageHeader title="订单" subtitle="接单、出餐与退款处理"
      ><template #actions
        ><Switch
          label="开启提醒"
          :model-value="stream.enabled.value"
          @update:model-value="stream.toggle"
        /><Button variant="outline" @click="load">刷新订单</Button></template
      ></PageHeader
    >
    <div class="ds-board">
      <section
        v-for="column in columns"
        :key="column.key"
        class="ds-col"
        :aria-busy="boards[column.key].pending"
      >
        <h2 class="ds-col__head title-sm">
          {{ column.label
          }}<Tag
            :tone="column.tone"
            :variant="column.key === 'PENDING' ? 'solid' : 'soft'"
            >{{ boards[column.key].total }}</Tag
          >
        </h2>
        <div
          v-if="boards[column.key].error"
          class="app-error body-sm"
          role="alert"
        >
          {{ boards[column.key].error
          }}<Button
            size="sm"
            variant="text"
            :disabled="boards[column.key].pending"
            @click="loadColumn(column.key)"
            >重试</Button
          >
        </div>
        <OrderCard
          v-for="order in boards[column.key].list"
          :key="order.id"
          view="merchant"
          :title="title(order)"
          :serial="order.serialOfDay"
          :status="order.status"
          :items="
            order.items.map((item) => ({
              name: item.nameSnapshot,
              qty: item.qty,
              price:
                item.lineTotalCents == null
                  ? undefined
                  : item.lineTotalCents / 100,
            }))
          "
          :total="order.payCents / 100"
          :time="time(order.createdAt)"
          :note="order.note"
        >
          <template #actions>
            <template v-if="order.status === 'PENDING'"
              ><Button
                size="sm"
                variant="danger-outline"
                :disabled="busy"
                @click="act(order.id, 'reject')"
                >拒单</Button
              ><Button
                size="sm"
                :disabled="busy"
                @click="act(order.id, 'accept')"
                >接单</Button
              ></template
            >
            <Button
              v-if="order.status === 'PREPARING'"
              size="sm"
              :disabled="busy"
              @click="act(order.id, 'ready')"
              >出餐完成</Button
            >
            <template v-if="order.status === 'REFUNDING'"
              ><p v-if="order.disputed" class="body-sm">平台处理中</p>
              <template v-else
                ><Button
                  size="sm"
                  variant="danger-outline"
                  :disabled="busy"
                  @click="act(order.id, 'refund-reject')"
                  >拒绝</Button
                ><Button
                  size="sm"
                  :disabled="busy"
                  @click="act(order.id, 'refund-approve')"
                  >同意退款</Button
                ></template
              ></template
            >
          </template>
        </OrderCard>
        <p
          v-if="!boards[column.key].list.length && !boards[column.key].error"
          class="app-empty body-sm"
        >
          {{ boards[column.key].pending ? "加载中" : "暂无订单" }}
        </p>
        <Pagination
          v-if="boards[column.key].total > 20"
          :model-value="boards[column.key].page"
          :total="boards[column.key].total"
          @update:model-value="changePage(column.key, $event)"
        />
      </section>
    </div>
    <Dialog
      :open="!!pending"
      title="填写原因"
      @close="!busy && (pending = undefined)"
      ><Input
        v-model="reason"
        label="处理原因"
        multiline
        maxlength="500"
      /><template #actions
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
.ds-col :deep(.xz-pager) {
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1);
}
</style>
