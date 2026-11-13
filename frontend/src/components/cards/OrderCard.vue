<script setup lang="ts">
import { computed } from "vue";
import { Price } from "@waimai/ui";
import { orderStatuses, type Action, type OrderStatus } from "@waimai/shared";
import AppIcon from "../antd/AppIcon.vue";
import ActionButton from "../antd/ActionButton.vue";
import { tagColor } from "../antd/mapping";
const props = withDefaults(
  defineProps<{
    view?: "user" | "merchant" | "admin";
    title: string;
    status: string;
    statusText?: string;
    items: { name: string; qty?: number; price?: number; image?: string }[];
    total: number;
    serial?: number | string;
    meta?: string;
    time?: string;
    note?: string;
    count?: number;
    actions?: Action[];
    titleClickable?: boolean;
  }>(),
  { view: "user" },
);
const emit = defineEmits<{ open: [] }>();
const state = computed(
  () =>
    orderStatuses[props.status.toUpperCase() as OrderStatus] ?? {
      label: props.status,
      tone: "neutral" as const,
    },
);
const quantity = computed(() =>
  props.items.reduce((sum, it) => sum + (it.qty ?? 1), 0),
);
</script>
<template>
  <a-card
    :bordered="false"
    size="small"
    :class="['pc-order', 'pc-order--' + view]"
  >
    <div class="pc-order__head">
      <component
        :is="titleClickable ? 'button' : 'div'"
        :type="titleClickable ? 'button' : undefined"
        :aria-label="titleClickable ? '查看' + title + '的订单' : undefined"
        class="pc-order__title"
        @click="titleClickable && emit('open')"
      >
        <span v-if="serial != null" class="pc-order__serial xz-num"
          >#{{ serial }}</span
        ><span class="pc-order__title-text">{{ title }}</span
        ><AppIcon v-if="view === 'user'" name="chevron-right" :size="14" />
      </component>
      <a-tag :color="tagColor(state.tone)" :bordered="false">{{
        statusText || state.label
      }}</a-tag>
    </div>
    <div v-if="meta || $slots.meta" class="pc-order__meta">
      <slot name="meta">{{ meta }}</slot>
    </div>
    <div v-if="view === 'user'" class="pc-order__brief">
      <a-avatar-group>
        <a-avatar
          v-for="(it, i) in items.slice(0, 3)"
          :key="i"
          shape="square"
          :size="44"
          :src="it.image || undefined"
          class="pc-order__thumb"
          ><AppIcon name="bowl" :size="22"
        /></a-avatar>
      </a-avatar-group>
      <span class="pc-order__brief-text"
        >{{
          items
            .slice(0, 2)
            .map((it) => it.name)
            .join("、")
        }}{{ items.length > 2 ? " 等" : "" }}</span
      >
    </div>
    <div v-else class="pc-order__items">
      <div v-for="(it, i) in items" :key="i" class="pc-order__item">
        <span class="pc-order__item-name"
          >{{ it.name
          }}<span class="pc-order__qty">×{{ it.qty || 1 }}</span></span
        ><span v-if="it.price != null" class="xz-num">¥{{ it.price }}</span>
      </div>
    </div>
    <div v-if="note" class="pc-order__note">备注 {{ note }}</div>
    <div class="pc-order__sum">
      <span class="pc-order__time">{{ time }}</span
      ><span class="pc-order__total"
        ><span class="pc-order__muted"
          >共 {{ count || quantity }} 件 · 实付</span
        ><Price :value="total" tone="ink"
      /></span>
    </div>
    <div v-if="actions?.length || $slots.actions" class="pc-order__actions">
      <slot name="actions"
        ><ActionButton
          v-for="(a, i) in actions"
          :key="i"
          size="small"
          :variant="a.variant || 'outline'"
          @click="a.onClick?.()"
          >{{ a.label }}</ActionButton
        ></slot
      >
    </div>
  </a-card>
</template>
<style scoped>
.pc-order.ant-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.pc-order :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}
.pc-order__head,
.pc-order__sum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.pc-order__head :deep(.ant-tag) {
  margin: 0;
}
.pc-order__title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
}
button.pc-order__title {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
button.pc-order__title:hover {
  color: var(--brand-text);
}
.pc-order__title-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-order__serial {
  color: var(--brand-text);
}
.pc-order__meta,
.pc-order__note,
.pc-order__time,
.pc-order__muted,
.pc-order__brief-text {
  color: var(--ink-muted);
  font-size: 13px;
}
.pc-order__brief {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.pc-order__thumb {
  background: var(--brand-soft);
  color: var(--brand-text);
}
.pc-order__brief-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-order__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.pc-order__item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}
.pc-order__qty {
  margin-left: var(--space-2);
  color: var(--ink-muted);
}
.pc-order__total {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
}
.pc-order__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
