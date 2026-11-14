<script setup lang="ts">
import { Button, Dialog, Input, Price, Select, Thumb } from "@waimai/ui";
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  money,
  orderPresentation,
  time,
  usePaymentClock,
  useUserOrderDetail,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { orderActivity } from "../../../common/orderActivity";
import { usePageChrome } from "../../../common/pageChrome";
import { useDraftLeave } from "../../../common/draftLeave";
import PageSlot from "../../../components/PageSlot.vue";
import DiscardDraft from "../components/DiscardDraft.vue";
import { useGoodsDisclosure } from "../purchaseUi";
import { useOrderInteractions } from "../orderInteractions";

const route = useRoute();
const detail = useUserOrderDetail(
  api,
  computed(() => String(route.params.id)),
  orderActivity,
);
const {
  order,
  pending,
  processing: busy,
  error,
  reason,
  rating,
  content,
  reviewed,
  paymentExpired,
  load,
} = detail;
const {
  moreOpen,
  refundOpen,
  reviewOpen,
  confirmation,
  formError,
  disabled,
  refundDirty,
  reviewDirty,
  onAction,
  confirm,
  sendRefund,
  sendReview,
  closeRefund,
  closeReview,
} = useOrderInteractions(
  detail,
  computed(() => route.hash),
);
const view = computed(() =>
  order.value ? orderPresentation(order.value) : undefined,
);
const clock = usePaymentClock(order, orderActivity, load);
const goods = useGoodsDisclosure(
  computed(() => String(route.params.id)),
  computed(() => order.value?.items ?? []),
);
const primary = computed(() =>
  view.value?.detailActions.find((a) => a.primary),
);
const secondary = computed(
  () => view.value?.detailActions.filter((a) => !a.primary) ?? [],
);
const chrome = usePageChrome();
watch(
  () => !!view.value?.detailActions.length,
  (value) => {
    chrome.actions = value;
  },
  { immediate: true, flush: "sync" },
);
const refundDialog = ref<InstanceType<typeof Dialog>>(),
  reviewDialog = ref<InstanceType<typeof Dialog>>();
const leave = useDraftLeave(
  () => refundDirty.value || reviewDirty.value,
  () => busy.value,
);
const copyInput = ref<HTMLInputElement>(),
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
</script>
<template>
  <div class="purchase-detail app-stack" :aria-busy="pending">
    <div
      v-if="error && !refundOpen && !reviewOpen && !confirmation"
      class="app-error body-sm"
      role="alert"
    >
      {{ error
      }}<Button variant="text" :disabled="disabled" @click="load">重试</Button>
    </div>
    <p v-if="pending && !order" class="app-empty body-sm" role="status">
      加载中
    </p>
    <template v-if="order && view">
      <section class="app-card purchase-status" aria-label="订单状态">
        <h1
          class="title-lg"
          aria-live="polite"
          :style="{
            color: `var(--${view.state.tone === 'brand' ? 'brand-text' : view.state.tone === 'neutral' ? 'ink-muted' : view.state.tone})`,
          }"
        >
          {{ view.state.label }}
        </h1>
        <p class="body-sm app-muted">{{ view.description }}</p>
        <p
          v-if="order.status === 'PENDING_PAY'"
          class="body-sm purchase-status__deadline"
          role="timer"
          aria-live="off"
        >
          {{
            clock.expired.value
              ? "支付时间已到，请核对订单状态"
              : clock.text.value
                ? "剩余 " +
                  clock.text.value +
                  " · 截止 " +
                  time(order.paymentExpiresAt!)
                : "支付截止时间暂不可用"
          }}
          · 当前为模拟支付
        </p>
        <ol
          v-if="view.steps.length"
          class="purchase-progress"
          aria-label="订单进度"
        >
          <li
            v-for="(step, index) in view.steps"
            :key="step.title"
            :class="{ 'is-reached': index <= view.progress }"
            :aria-current="index === view.progress ? 'step' : undefined"
          >
            <span class="purchase-progress__dot" aria-hidden="true" /><span
              class="caption"
              >{{ step.title }}</span
            >
          </li>
        </ol>
        <p v-if="order.refundReason" class="body-sm purchase-status__reason">
          退款原因：{{ order.refundReason }}
        </p>
      </section>
      <section class="app-card" aria-label="商品及费用">
        <h2 class="title-sm">{{ order.store.name }}</h2>
        <article
          v-for="item in goods.visible.value"
          :key="item.id"
          class="purchase-item"
        >
          <Thumb />
          <div class="purchase-item__main">
            <h3 class="title-sm">{{ item.nameSnapshot }}</h3>
            <p v-if="item.spec" class="caption app-muted">{{ item.spec }}</p>
            <p class="caption app-muted">
              单价 {{ money(item.priceCentsSnapshot) }} · ×{{ item.qty }}
            </p>
          </div>
          <span class="body-sm">{{
            item.lineTotalCents == null ? "—" : money(item.lineTotalCents)
          }}</span>
        </article>
        <Button
          v-if="goods.canToggle.value"
          block
          variant="text"
          :aria-expanded="goods.showAll.value"
          @click="goods.toggle"
          >{{ goods.label.value }}</Button
        >
        <dl class="purchase-fees body-sm">
          <div v-for="fee in view.fees" :key="fee.label">
            <dt>{{ fee.label }}</dt>
            <dd>{{ fee.value }}</dd>
          </div>
        </dl>
        <div class="purchase-total">
          <span class="body-sm">{{ view.amountLabel }}</span
          ><Price size="lg" :value="order.payCents / 100" />
        </div>
      </section>
      <section class="app-card" aria-label="配送信息">
        <h2 class="title-sm">
          {{ order.type === "PICKUP" ? "自提信息" : "配送信息" }}
        </h2>
        <dl class="purchase-info body-sm">
          <div v-for="row in view.deliveryInfo" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>
      <section class="app-card" aria-label="订单资料">
        <h2 class="title-sm">订单资料</h2>
        <dl class="purchase-info body-sm">
          <div>
            <dt>订单编号</dt>
            <dd class="purchase-order-no">
              {{ order.orderNo
              }}<Button size="sm" variant="text" @click="copyOrderNo"
                >复制</Button
              >
            </dd>
          </div>
          <div>
            <dt>下单时间</dt>
            <dd>{{ time(order.createdAt) }}</dd>
          </div>
        </dl>
        <label v-if="copyFallback" class="body-sm"
          >订单编号<input
            ref="copyInput"
            class="purchase-copy"
            readonly
            :value="order.orderNo"
            @focus="copyInput?.select()"
        /></label>
        <p v-if="copyNotice" class="caption app-muted" role="status">
          {{ copyNotice }}
        </p>
        <p v-if="reviewed" id="review" class="body-sm app-muted">评价已提交</p>
      </section>
    </template>
  </div>
  <PageSlot v-if="chrome.actions" name="actions"
    ><div class="purchase-actions">
      <Button
        v-if="secondary.length"
        size="lg"
        variant="outline"
        :disabled="disabled"
        @click="moreOpen = true"
        >更多</Button
      >
      <Button
        v-if="primary"
        size="lg"
        :disabled="
          disabled ||
          (primary.key === 'pay' && (paymentExpired || clock.expired.value))
        "
        @click="onAction(primary.key)"
        >{{ primary.label }}</Button
      >
    </div></PageSlot
  >
  <Dialog
    :open="moreOpen"
    title="订单操作"
    variant="sheet"
    @close="moreOpen = false"
    ><div class="app-stack">
      <Button
        v-for="action in secondary"
        :key="action.key"
        size="lg"
        variant="outline"
        :disabled="disabled"
        @click="onAction(action.key)"
        >{{ action.label }}</Button
      >
    </div>
    <template #actions
      ><Button size="lg" variant="text" @click="moreOpen = false"
        >返回订单</Button
      ></template
    ></Dialog
  >
  <Dialog
    :open="!!confirmation"
    :title="confirmation === 'cancel' ? '取消订单' : '确认完成'"
    :close-disabled="busy"
    @close="confirmation = undefined"
  >
    <p class="body">
      {{
        confirmation === "cancel"
          ? "是否取消当前订单？"
          : order?.type === "PICKUP"
            ? "确认已到店取到商品？"
            : "确认已收到商品？"
      }}
    </p>
    <p v-if="formError" class="app-error body-sm" role="alert">
      {{ formError }}
    </p>
    <template #actions
      ><Button
        variant="outline"
        :disabled="busy"
        @click="confirmation = undefined"
        >返回订单</Button
      ><Button :disabled="disabled" @click="confirm">{{
        confirmation === "cancel" ? "取消订单" : "确认完成"
      }}</Button></template
    >
  </Dialog>
  <Dialog
    ref="refundDialog"
    :open="refundOpen"
    title="申请退款"
    variant="sheet"
    confirm-discard
    :dirty="refundDirty"
    :close-disabled="busy"
    @close="closeRefund"
  >
    <Input
      v-model="reason"
      label="退款原因"
      multiline
      required
      maxlength="500"
      :disabled="busy"
    />
    <p v-if="formError" class="app-error body-sm" role="alert">
      {{ formError }}
    </p>
    <template #actions
      ><Button
        size="lg"
        variant="outline"
        :disabled="busy"
        @click="refundDialog?.close()"
        >取消</Button
      ><Button
        size="lg"
        :disabled="disabled || !reason.trim()"
        @click="sendRefund"
        >申请退款</Button
      ></template
    >
  </Dialog>
  <Dialog
    ref="reviewDialog"
    :open="reviewOpen"
    title="评价订单"
    variant="sheet"
    confirm-discard
    :dirty="reviewDirty"
    :close-disabled="busy"
    @close="closeReview"
  >
    <div class="app-stack">
      <Select
        v-model="rating"
        label="评分"
        :options="['5', '4', '3', '2', '1']"
        :disabled="busy"
      /><Input
        v-model="content"
        label="评价内容"
        multiline
        required
        maxlength="1000"
        :disabled="busy"
      />
      <p v-if="formError" class="app-error body-sm" role="alert">
        {{ formError }}
      </p>
    </div>
    <template #actions
      ><Button
        size="lg"
        variant="outline"
        :disabled="busy"
        @click="reviewDialog?.close()"
        >取消</Button
      ><Button
        size="lg"
        :disabled="disabled || !content.trim()"
        @click="sendReview"
        >提交评价</Button
      ></template
    >
  </Dialog>
  <DiscardDraft :open="leave.open.value" @choose="leave.choose" />
</template>
<style scoped>
.purchase-detail {
  gap: var(--space-2);
}
.purchase-detail h1,
.purchase-detail h2,
.purchase-detail h3 {
  margin: 0;
  overflow-wrap: anywhere;
}
.purchase-detail h2 {
  margin-bottom: var(--space-3);
}
.purchase-status p {
  margin: var(--space-2) 0 0;
}
.purchase-status__deadline {
  color: var(--brand-text);
}
.purchase-status__reason {
  overflow-wrap: anywhere;
}
.purchase-progress {
  display: flex;
  list-style: none;
  padding: var(--space-4) 0 0;
  margin: 0;
}
.purchase-progress li {
  flex: 1;
  min-width: 0;
  text-align: center;
  color: var(--ink-muted);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.purchase-progress li:not(:last-child)::after {
  content: "";
  position: absolute;
  top: var(--space-1);
  left: calc(50% + var(--space-2));
  width: calc(100% - var(--space-4));
  height: 1px;
  background: var(--line);
}
.purchase-progress__dot {
  width: var(--space-2);
  height: var(--space-2);
  background: var(--line-strong);
  border-radius: var(--radius-pill);
}
.purchase-progress .is-reached {
  color: var(--brand-text);
}
.is-reached .purchase-progress__dot {
  background: var(--brand-text);
}
.purchase-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}
.purchase-item + .purchase-item {
  border-top: 1px solid var(--line);
}
.purchase-item__main {
  flex: 1;
  min-width: 0;
}
.purchase-item__main p {
  margin: var(--space-1) 0 0;
  overflow-wrap: anywhere;
}
.purchase-item > .body-sm {
  flex: none;
}
.purchase-fees {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-3) 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}
.purchase-fees > div,
.purchase-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
}
.purchase-fees dt,
.purchase-info dt {
  color: var(--ink-muted);
}
.purchase-fees dd,
.purchase-info dd {
  margin: 0;
}
.purchase-total {
  border-top: 1px solid var(--line);
  padding-top: var(--space-3);
}
.purchase-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
}
.purchase-info > div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3);
  align-items: baseline;
}
.purchase-info dd {
  overflow-wrap: anywhere;
}
.purchase-order-no {
  user-select: text;
}
.purchase-copy {
  width: 100%;
  min-height: var(--size-tap);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  color: var(--ink);
  background: var(--surface-sunken);
}
.purchase-copy:focus {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.purchase-actions {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}
.purchase-actions > * {
  flex: 1;
}
</style>
