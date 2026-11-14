<script setup lang="ts">
import { computed } from "vue";
import { Button, Icon, Price, Thumb } from "@waimai/ui";
import {
  orderPresentation,
  orderTime,
  type Order,
  type OrderUiAction,
} from "@waimai/shared";
import { mobileOrderActions } from "../purchaseUi";
const props = defineProps<{ order: Order; disabled?: boolean }>();
const emit = defineEmits<{ open: []; action: [key: OrderUiAction] }>();
const view = computed(() => orderPresentation(props.order));
</script>
<template>
  <article
    class="purchase-order app-card"
    :aria-label="order.store.name + '，' + view.state.label"
  >
    <div class="purchase-order__head">
      <button
        type="button"
        class="purchase-order__store title-sm"
        @click="emit('open')"
      >
        {{ order.store.name }}<Icon name="chevron-right" :size="16" />
      </button>
      <span
        class="body-sm purchase-order__state"
        :style="{
          color: `var(--${view.state.tone === 'brand' ? 'brand-text' : view.state.tone === 'neutral' ? 'ink-muted' : view.state.tone})`,
        }"
        >{{ view.state.label }}</span
      >
    </div>
    <button
      type="button"
      class="purchase-order__goods"
      aria-label="查看订单商品与详情"
      @click="emit('open')"
    >
      <span class="purchase-order__pictures"
        ><Thumb v-for="item in order.items.slice(0, 3)" :key="item.id"
      /></span>
      <span class="body-sm purchase-order__names">{{
        order.items.map((item) => item.nameSnapshot).join("、")
      }}</span>
    </button>
    <p
      v-if="order.status === 'REFUNDING'"
      class="caption app-muted purchase-order__explanation"
    >
      {{ view.description }}
    </p>
    <div class="purchase-order__meta body-sm app-muted">
      <span
        >{{ orderTime(order.createdAt) }} ·
        {{ order.type === "PICKUP" ? "到店自提" : "外卖配送" }}</span
      ><span>共 {{ view.quantity }} 件</span>
    </div>
    <div class="purchase-order__foot">
      <span class="body-sm app-muted"
        >{{ view.listAmountLabel }}
        <Price :value="order.payCents / 100" tone="ink"
      /></span>
      <div class="purchase-order__actions">
        <Button
          v-for="action in mobileOrderActions(order)"
          :key="action.key"
          size="sm"
          :variant="action.primary ? 'primary' : 'outline'"
          :disabled="disabled"
          @click="emit('action', action.key)"
          >{{ action.label }}</Button
        >
      </div>
    </div>
  </article>
</template>
<style scoped>
.purchase-order {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.purchase-order__head,
.purchase-order__meta,
.purchase-order__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.purchase-order__store,
.purchase-order__goods {
  border: 0;
  background: none;
  padding: 0;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}
.purchase-order__store {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  min-height: var(--size-tap);
  overflow-wrap: anywhere;
}
.purchase-order__store :deep(svg),
.purchase-order__state {
  flex: none;
}
.purchase-order__goods {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}
.purchase-order__pictures {
  display: flex;
  gap: var(--space-1);
  flex: none;
}
.purchase-order__names {
  min-width: 0;
  color: var(--ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.purchase-order__meta {
  flex-wrap: wrap;
}
.purchase-order__explanation {
  margin: 0;
}
.purchase-order__foot {
  flex-wrap: wrap;
  min-height: var(--size-tap);
}
.purchase-order__actions {
  display: flex;
  align-items: center;
  min-height: var(--size-tap);
  gap: var(--space-2);
  margin-left: auto;
}
</style>
