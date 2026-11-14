<script setup lang="ts">
import { computed } from "vue";
import { money, orderTime, type Order } from "@waimai/shared";
import { Button, Icon, Tag } from "../../../components/pc";
import { orderPresentation, type OrderUiAction } from "../orderPresentation";
const props = defineProps<{ order: Order; disabled?: boolean }>();
defineEmits<{ action: [key: OrderUiAction] }>();
const view = computed(() => orderPresentation(props.order));
const summary = computed(() =>
  props.order.items.map((i) => `${i.nameSnapshot} ×${i.qty}`).join("、"),
);
</script>
<template>
  <article class="user-order-row">
    <div class="user-order-row__grid">
      <div class="user-order-row__summary">
        <RouterLink
          :to="'/orders/' + order.id"
          class="user-order-row__store title-sm"
          :title="order.store.name"
          >{{ order.store.name }}<Icon name="chevron-right" :size="14"
        /></RouterLink>
        <div class="user-order-row__goods">
          <div class="user-order-row__thumb" aria-hidden="true">
            <Icon name="bowl" :size="24" />
          </div>
          <p class="body-md user-order-row__brief" :title="summary">
            {{ summary }}
          </p>
        </div>
        <p class="caption user-order-row__muted">
          {{ orderTime(order.createdAt) }} ·
          {{ order.type === "PICKUP" ? "到店自提" : "外卖配送" }} · 共
          {{ view.quantity }} 件
        </p>
      </div>
      <div class="user-order-row__state">
        <Tag :tone="view.state.tone">{{ view.state.label }}</Tag>
        <p
          v-if="order.status === 'REFUNDING'"
          class="caption user-order-row__muted"
        >
          {{ view.description }}
        </p>
      </div>
      <div class="user-order-row__amount">
        <span class="caption user-order-row__muted">{{
          view.listAmountLabel
        }}</span
        ><strong class="price">{{ money(order.payCents) }}</strong>
      </div>
      <div class="user-order-row__actions">
        <Button
          v-for="item in view.listActions"
          :key="item.key"
          :variant="item.primary ? 'primary' : 'outline'"
          size="sm"
          :disabled="disabled"
          @click="$emit('action', item.key)"
          >{{ item.label }}</Button
        >
      </div>
    </div>
  </article>
</template>
<style scoped>
.user-order-row {
  container: order-row / inline-size;
  padding: var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}
.user-order-row__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px 100px 100px;
  gap: var(--space-4);
  align-items: center;
}
.user-order-row__summary {
  min-width: 0;
}
.user-order-row__store {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--ink);
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.user-order-row__goods {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-3) 0;
}
.user-order-row__thumb {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--size-thumb-sm, 48px);
  height: var(--size-thumb-sm, 48px);
  border-radius: var(--radius-md);
  color: var(--ink-muted);
  background: var(--surface-sunken);
}
.user-order-row__brief {
  min-width: 0;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.user-order-row__muted {
  color: var(--ink-muted);
  margin: 0;
}
.user-order-row__state p {
  margin-top: var(--space-2);
}
.user-order-row__amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.user-order-row__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: stretch;
}
@container order-row (max-width:799px) {
  .user-order-row__grid {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .user-order-row__state {
    align-self: start;
  }
  .user-order-row__amount {
    grid-column: 1;
    text-align: left;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
  }
  .user-order-row__actions {
    grid-column: 2;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
@container order-row (max-width:479px) {
  .user-order-row__amount,
  .user-order-row__actions {
    grid-column: 1/-1;
  }
  .user-order-row__actions {
    justify-content: flex-start;
  }
}
</style>
