<script setup lang="ts">
import { Button, Dialog, Input, Select } from "../../../components/pc";
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { time, useUserOrderDetail } from "@waimai/shared";
import { api } from "../../../common/api";
import { orderActivity } from "../../../common/orderActivity";
import PageHeader from "../../../components/PageHeader.vue";
import InfoList from "../../../components/InfoList.vue";
import UserOrderGoods from "../components/UserOrderGoods.vue";
import { orderPresentation, type OrderUiAction } from "../orderPresentation";
import { usePaymentClock } from "../paymentClock";
import { useDraftLeave } from "../../../common/draftLeave";

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
  paymentExpired,
  load,
  act,
  review,
} = useUserOrderDetail(
  api,
  computed(() => String(route.params.id)),
  orderActivity,
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
const view = computed(() =>
  order.value ? orderPresentation(order.value) : undefined,
);
const clock = usePaymentClock(order, orderActivity, load);
const refundDialog = ref<InstanceType<typeof Dialog>>();
const copyInput = ref<{ focus(): void; select(): void }>(),
  copyFallback = ref(false),
  copyNotice = ref("");
watch(
  () => order.value?.id,
  () => {
    copyFallback.value = false;
    copyNotice.value = "";
  },
);
async function copyOrderNo() {
  const target = order.value?.id,
    value = order.value?.orderNo;
  if (!value) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error();
    await navigator.clipboard.writeText(value);
    if (order.value?.id === target) copyNotice.value = "已复制订单号";
  } catch {
    if (order.value?.id !== target) return;
    copyFallback.value = true;
    copyNotice.value = "请选中下方订单号复制";
    await nextTick();
    copyInput.value?.focus();
    copyInput.value?.select();
  }
}
const draftLeave = useDraftLeave(
  () => refundOpen.value && !!reason.value.trim(),
  () => processing.value,
);
async function onAction(key: OrderUiAction) {
  if (key === "evaluate") {
    await router.replace({ hash: "#review" });
    await nextTick();
    document.getElementById("review")?.scrollIntoView({ block: "nearest" });
    document
      .querySelector<HTMLElement>("#review textarea")
      ?.focus({ preventScroll: true });
  } else if (key === "cancel" || key === "complete") confirmation.value = key;
  else if (key === "refund") refundOpen.value = true;
  else if (key === "pay" || key === "dispute") await act(key);
}
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
  <section
    class="app-stack order-detail"
    aria-label="订单详情"
    :aria-busy="pending"
  >
    <PageHeader title="订单详情" back @back="router.push('/orders')" />
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
      <section v-if="view" class="app-card order-status" aria-label="订单状态">
        <div class="order-status__head">
          <div>
            <h1
              class="title-lg"
              aria-live="polite"
              :class="'order-status__title--' + view.state.tone"
            >
              {{ view.state.label }}
            </h1>
            <p class="body-md app-muted">{{ view.description }}</p>
            <p
              v-if="order.status === 'PENDING_PAY'"
              class="body-sm order-status__deadline"
              role="timer"
              aria-live="off"
            >
              {{
                clock.expired.value
                  ? "提交时间已到，请核对订单状态"
                  : clock.text.value
                    ? "剩余 " +
                      clock.text.value +
                      " · 截止 " +
                      time(order.paymentExpiresAt!)
                    : "提交截止时间暂不可用"
              }}
            </p>
          </div>
          <div class="order-status__actions">
            <Button
              v-for="item in view.detailActions"
              :key="item.key"
              :variant="item.primary ? 'primary' : 'outline'"
              :disabled="
                disabled ||
                (item.key === 'pay' && (paymentExpired || clock.expired.value))
              "
              @click="onAction(item.key)"
              >{{ item.label }}</Button
            ><span
              v-if="order.status === 'DONE' && reviewed"
              class="body-sm app-muted"
              >评价已提交</span
            >
          </div>
        </div>
        <a-steps
          v-if="view.steps.length"
          :items="view.steps"
          :current="view.progress"
          :status="order.status === 'DONE' ? 'finish' : 'process'"
          size="small"
          class="order-status__steps order-status__steps--wide"
        />
        <a-steps
          v-if="view.steps.length"
          :items="view.steps"
          :current="view.progress"
          :status="order.status === 'DONE' ? 'finish' : 'process'"
          size="small"
          direction="vertical"
          class="order-status__steps order-status__steps--compact"
        />
        <p
          v-if="order.status === 'REFUNDING' && order.refundReason"
          class="body-sm order-status__reason"
        >
          退款原因：{{ order.refundReason }}
        </p>
      </section>
      <div class="order-detail__columns">
        <UserOrderGoods :order="order" />
        <aside class="order-detail__aside">
          <section class="app-card order-detail__info">
            <h2 class="title-sm">配送信息</h2>
            <InfoList v-if="view" :items="view.deliveryInfo" />
          </section>
          <section class="app-card order-detail__info">
            <h2 class="title-sm">订单资料</h2>
            <p class="caption app-muted">订单编号</p>
            <p class="body-sm order-detail__number">{{ order.orderNo }}</p>
            <Button variant="text" size="sm" @click="copyOrderNo"
              >复制编号</Button
            >
            <p v-if="copyNotice" class="caption app-muted" role="status">
              {{ copyNotice }}
            </p>
            <a-input
              v-if="copyFallback"
              ref="copyInput"
              :value="order.orderNo"
              readonly
              aria-label="订单编号，可选中复制"
              @focus="copyInput?.select()"
            /><InfoList
              :items="[{ label: '下单时间', value: time(order.createdAt) }]"
            />
          </section>
        </aside>
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
      ref="refundDialog"
      :open="refundOpen"
      :close-disabled="processing"
      :confirm-discard="true"
      :dirty="!!reason.trim()"
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
          @click="refundDialog?.close()"
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
      :close-disabled="processing"
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
    <Dialog
      :open="draftLeave.open.value"
      title="放弃修改"
      @close="draftLeave.choose(false)"
      ><p>离开将放弃尚未提交的内容。</p>
      <template #actions
        ><Button variant="outline" @click="draftLeave.choose(false)"
          >继续编辑</Button
        ><Button variant="danger" @click="draftLeave.choose(true)"
          >放弃修改</Button
        ></template
      ></Dialog
    >
  </section>
</template>
<style scoped>
.order-status__title--brand {
  color: var(--brand-text);
}
.order-status__title--info {
  color: var(--info);
}
.order-status__title--success {
  color: var(--success);
}
.order-status__title--warning {
  color: var(--warning);
}
.order-status__title--danger {
  color: var(--danger);
}
.order-detail {
  container: order-detail / inline-size;
}
.order-status__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
}
.order-status h1 {
  margin: 0 0 var(--space-2);
}
.order-status p {
  margin: 0;
}
.order-status__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.order-status__deadline {
  margin-top: var(--space-3) !important;
  color: var(--brand-text);
  font-variant-numeric: tabular-nums;
}
.order-status__steps {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
.order-status__reason {
  margin-top: var(--space-3) !important;
  overflow-wrap: anywhere;
}
.order-detail__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--size-cart-panel);
  gap: var(--space-4);
  align-items: start;
}
.order-detail__aside {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}
.order-detail__info h2 {
  margin: 0 0 var(--space-4);
}
.order-detail__info :deep(.ant-descriptions-item-content) {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.order-detail__number {
  overflow-wrap: anywhere;
  user-select: text;
  margin: var(--space-1) 0;
}
.order-detail__info > p {
  margin-bottom: var(--space-2);
}
@container order-detail (max-width:879px) {
  .order-detail__columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
.order-status__steps--compact {
  display: none;
}
@container order-detail (max-width:559px) {
  .order-status__steps--wide {
    display: none;
  }
  .order-status__steps--compact {
    display: flex;
  }
}
</style>
