<script setup lang="ts">
import { Button, Dialog, Input, Select, Tag } from "@waimai/ui";
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  orderStatuses,
  money,
  phoneTail,
  time,
  useUserOrderDetail,
} from "@waimai/shared";
import { api } from "../../../common/api";
import PageHeader from "../../../components/PageHeader.vue";
import InfoList from "../../../components/InfoList.vue";
import DataTable from "../../../components/DataTable.vue";

const route = useRoute(),
  router = useRouter();
const {
  order,
  pending,
  processing,
  error,
  reason,
  rating,
  content,
  reviewed,
  load,
  act,
  review,
} = useUserOrderDetail(
  api,
  computed(() => String(route.params.id)),
);
const refundOpen = ref(false),
  confirmation = ref<"cancel" | "complete">();
watch(
  () => route.params.id,
  () => {
    refundOpen.value = false;
    confirmation.value = undefined;
  },
);
watch(
  [() => order.value?.id, () => route.hash],
  async () => {
    if (route.hash === "#review" && order.value) {
      await nextTick();
      document.getElementById("review")?.scrollIntoView({ block: "start" });
    }
  },
  { flush: "post" },
);
const address = computed(() => {
  try {
    const value = JSON.parse(order.value?.addressSnapshot ?? "{}");
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
});
const canRefund = computed(
  () =>
    order.value &&
    ["PENDING", "PREPARING", "DELIVERING", "PICKUP"].includes(
      order.value.status,
    ),
);
const disabled = computed(() => pending.value || processing.value);
async function confirm() {
  const action = confirmation.value;
  if (action && (await act(action))) confirmation.value = undefined;
}
async function refund() {
  if (await act("refund")) refundOpen.value = false;
}
</script>
<template>
  <section class="app-stack" aria-label="订单详情" :aria-busy="pending">
    <PageHeader
      title="订单详情"
      back
      :subtitle="order?.orderNo"
      @back="router.push('/orders')"
    >
      <template v-if="order" #actions>
        <Button
          v-if="order.status === 'PENDING_PAY'"
          :disabled="disabled"
          @click="act('pay')"
          >模拟支付</Button
        >
        <Button
          v-if="['PENDING_PAY', 'PENDING'].includes(order.status)"
          variant="outline"
          :disabled="disabled"
          @click="confirmation = 'cancel'"
          >取消订单</Button
        >
        <Button
          v-if="['DELIVERING', 'PICKUP'].includes(order.status)"
          :disabled="disabled"
          @click="confirmation = 'complete'"
          >确认完成</Button
        >
        <Button
          v-if="canRefund"
          variant="danger-outline"
          :disabled="disabled"
          @click="refundOpen = true"
          >申请退款</Button
        >
      </template>
    </PageHeader>
    <div
      v-if="error && !refundOpen && !confirmation"
      class="app-error body-sm"
      role="alert"
    >
      {{ error
      }}<Button variant="text" size="sm" :disabled="disabled" @click="load"
        >刷新订单</Button
      >
    </div>
    <p v-if="pending && !order" class="app-empty body-sm" role="status">
      加载中
    </p>
    <template v-if="order">
      <section class="app-card app-stack" aria-label="订单状态">
        <div class="app-row">
          <h2 class="title-sm app-section-title">{{ order.store.name }}</h2>
          <Tag :tone="orderStatuses[order.status].tone">{{
            orderStatuses[order.status].label
          }}</Tag>
        </div>
        <p v-if="order.status === 'REFUNDING'" class="body-md app-muted">
          {{
            order.disputed
              ? "平台正在处理退款申请"
              : order.refundRejected
                ? "商家已拒绝退款，可申请平台介入"
                : "等待商家处理退款申请"
          }}
        </p>
        <InfoList
          :items="[
            { label: '下单时间', value: time(order.createdAt) },
            {
              label: '配送方式',
              value: order.type === 'PICKUP' ? '到店自提' : '外卖配送',
            },
            ...(order.type === 'DELIVERY'
              ? [
                  {
                    label: '收货人',
                    value:
                      String(address.contact ?? '') +
                      ' · ' +
                      phoneTail(String(address.phone ?? '')),
                  },
                  { label: '收货地址', value: address.detail ?? '—' },
                ]
              : [{ label: '自提地址', value: order.store.address }]),
            { label: '订单备注', value: order.note || '无' },
            ...(order.refundReason
              ? [{ label: '退款原因', value: order.refundReason }]
              : []),
          ]"
        />
        <div v-if="order.refundRejected && !order.disputed" class="app-row">
          <Button variant="outline" :disabled="disabled" @click="act('dispute')"
            >申请介入</Button
          >
        </div>
      </section>
      <DataTable
        :columns="[
          { key: 'nameSnapshot', title: '商品' },
          { key: 'price', title: '单价', align: 'right', num: true },
          { key: 'qty', title: '数量', align: 'right', num: true },
          { key: 'subtotal', title: '小计', align: 'right', num: true },
        ]"
        :rows="order.items"
      >
        <template #price="{ row }">{{
          money(row.priceCentsSnapshot)
        }}</template>
        <template #subtotal="{ row }">{{
          row.lineTotalCents == null ? "—" : money(row.lineTotalCents)
        }}</template>
        <template #footer>
          <InfoList
            :items="[
              { label: '商品小计', value: money(order.itemsCents) },
              { label: '配送费', value: money(order.deliveryFeeCents) },
              {
                label: '满减优惠',
                value:
                  (order.discountCents ? '-' : '') + money(order.discountCents),
              },
              { label: '实付金额', value: money(order.payCents) },
            ]"
          />
        </template>
      </DataTable>
      <form
        id="review"
        v-if="order.status === 'DONE' && !reviewed"
        class="app-card app-form"
        @submit.prevent="review"
      >
        <h2 class="title-sm">评价订单</h2>
        <Select
          v-model="rating"
          label="评分"
          :options="['5', '4', '3', '2', '1']"
          :disabled="disabled"
        />
        <Input
          v-model="content"
          label="评价内容"
          multiline
          required
          maxlength="1000"
          :disabled="disabled"
        />
        <div class="app-row">
          <Button type="submit" :disabled="disabled || !content.trim()"
            >提交评价</Button
          >
        </div>
      </form>
      <p v-if="reviewed" id="review" class="app-card body-md" role="status">
        评价已提交
      </p>
    </template>
    <Dialog
      variant="modal"
      :open="refundOpen"
      title="申请退款"
      @close="!processing && (refundOpen = false)"
    >
      <form id="refund-form" class="app-form" @submit.prevent="refund">
        <Input
          v-model="reason"
          label="退款原因"
          multiline
          required
          maxlength="300"
          :disabled="processing"
        />
        <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      </form>
      <template #actions>
        <Button
          variant="outline"
          :disabled="processing"
          @click="refundOpen = false"
          >返回</Button
        >
        <Button
          variant="danger"
          type="submit"
          form="refund-form"
          :disabled="processing || !reason.trim()"
          >申请退款</Button
        >
      </template>
    </Dialog>
    <Dialog
      variant="modal"
      :open="!!confirmation"
      :title="confirmation === 'cancel' ? '取消订单' : '确认完成'"
      @close="!processing && (confirmation = undefined)"
    >
      <p>
        {{
          confirmation === "cancel"
            ? "确认取消当前订单？"
            : "请确认已收到商品，再完成订单。"
        }}
      </p>
      <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      <template #actions>
        <Button
          variant="outline"
          :disabled="processing"
          @click="confirmation = undefined"
          >返回</Button
        >
        <Button
          :variant="confirmation === 'cancel' ? 'danger' : 'primary'"
          :disabled="processing"
          @click="confirm"
          >{{ confirmation === "cancel" ? "取消订单" : "确认完成" }}</Button
        >
      </template>
    </Dialog>
  </section>
</template>
<style scoped>
.app-section-title {
  margin: 0;
}
</style>
