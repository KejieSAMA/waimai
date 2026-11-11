<script setup lang="ts">
import { Button, Input, OrderCard, Select, Tag } from "@waimai/ui";
import { nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { type Order, orderStatuses, money, time } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const route = useRoute(),
  order = ref<Order>(),
  reason = ref(""),
  rating = ref("5"),
  content = ref(""),
  reviewed = ref(false);
async function load() {
  order.value = await api<Order>("/user/orders/" + route.params.id);
  reviewed.value = !!order.value.review;
  if (route.hash === "#review") {
    await nextTick();
    document.getElementById("review")?.scrollIntoView({ block: "start" });
  }
}
onMounted(() => run(load));
async function act(action: string) {
  await run(async () => {
    await api(`/user/orders/${route.params.id}/${action}`, {
      method: "POST",
      body: { reason: reason.value },
    });
    await load();
  });
}
async function review() {
  await run(async () => {
    await api(`/user/orders/${route.params.id}/review`, {
      method: "POST",
      body: { rating: Number(rating.value), content: content.value },
    });
    reviewed.value = true;
  });
}
</script>
<template>
  <div v-if="order" class="app-stack">
    <div class="app-card app-stack">
      <h1 class="title-lg">{{ orderStatuses[order.status].label }}</h1>
      <p class="body-sm app-muted">
        订单号 {{ order.orderNo }} · {{ time(order.createdAt) }}
      </p>
      <OrderCard
        :title="order.store.name"
        :status="order.status"
        :items="
          order.items.map((it) => ({
            name: it.nameSnapshot,
            qty: it.qty,
            price: it.priceCentsSnapshot / 100,
          }))
        "
        :total="order.payCents / 100"
        view="merchant"
      />
      <div class="app-row body-sm">
        <span>配送费 {{ money(order.deliveryFeeCents) }}</span
        ><span>满减 {{ money(order.discountCents) }}</span
        ><span>{{ order.type === "PICKUP" ? "到店自提" : "外卖配送" }}</span>
      </div>
      <p v-if="order.type === 'DELIVERY'" class="body-sm">
        {{ JSON.parse(order.addressSnapshot).contact }} · 尾号
        {{ String(JSON.parse(order.addressSnapshot).phone).slice(-4) }} ·
        {{ JSON.parse(order.addressSnapshot).detail }}
      </p>
      <div class="app-row">
        <Button
          v-if="order.status === 'PENDING_PAY'"
          :disabled="busy"
          @click="act('pay')"
          >模拟支付</Button
        ><Button
          v-if="['PENDING_PAY', 'PENDING'].includes(order.status)"
          variant="outline"
          :disabled="busy"
          @click="act('cancel')"
          >取消订单</Button
        ><Button
          v-if="['DELIVERING', 'PICKUP'].includes(order.status)"
          :disabled="busy"
          @click="act('complete')"
          >确认完成</Button
        >
      </div>
      <template
        v-if="
          ['PENDING', 'PREPARING', 'DELIVERING', 'PICKUP'].includes(
            order.status,
          )
        "
        ><Input v-model="reason" label="退款原因" /><Button
          variant="danger-outline"
          :disabled="busy || !reason.trim()"
          @click="act('refund')"
          >申请退款</Button
        ></template
      ><template v-if="order.status === 'REFUNDING'"
        ><p class="body">
          {{
            order.refundRejected
              ? "商家已拒绝退款，可申请平台介入"
              : "等待处理退款申请"
          }}
        </p>
        <Button
          v-if="order.refundRejected && !order.disputed"
          variant="outline"
          :disabled="busy"
          @click="act('dispute')"
          >申请介入</Button
        ><Tag v-if="order.disputed" tone="info">平台处理中</Tag></template
      >
    </div>
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
      /><Input v-model="content" label="评价内容" multiline required /><Button
        type="submit"
        :disabled="busy"
        >提交评价</Button
      >
    </form>
    <p v-if="reviewed" class="body">评价已提交</p>
  </div>
</template>
