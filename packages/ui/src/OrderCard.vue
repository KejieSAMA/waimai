<script setup lang="ts">
import Icon from "./Icon.vue";
import Button from "./Button.vue";
import Price from "./Price.vue";
import { computed } from "vue";
import { orderStatuses, type Action, type OrderStatus } from "@waimai/shared";
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
  }>(),
  { view: "user" },
);
const state = computed(
  () =>
    orderStatuses[props.status.toUpperCase() as OrderStatus] ?? {
      label: props.status,
      tone: "neutral",
    },
);
const quantity = computed(() =>
  props.items.reduce((sum, it) => sum + (it.qty ?? 1), 0),
);
</script>
<template>
  <div :class="['xz-order', 'xz-order--' + view]">
    <div class="xz-order__head">
      <div class="xz-order__title title-sm">
        <span v-if="serial != null" class="xz-order__serial title"
          >#{{ serial }}</span
        ><span class="xz-order__title-text">{{ title }}</span
        ><Icon
          v-if="view === 'user'"
          name="chevron-right"
          :size="16"
          class="xz-order__chev"
        />
      </div>
      <span :class="['xz-order__status', 'body-sm', 'tone-' + state.tone]">{{
        statusText || state.label
      }}</span>
    </div>
    <div v-if="meta || $slots.meta" class="xz-order__meta body-sm">
      <slot name="meta">{{ meta }}</slot>
    </div>
    <div v-if="view === 'user'" class="xz-order__brief">
      <div class="xz-order__thumbs">
        <span
          v-for="(it, i) in items.slice(0, 3)"
          :key="i"
          class="xz-img xz-img--sm"
          ><img
            v-if="it.image"
            :src="it.image"
            :alt="it.name"
            loading="lazy" /><Icon v-else name="bowl" :size="24"
        /></span>
      </div>
      <span class="xz-order__brief-text body-sm"
        >{{
          items
            .slice(0, 2)
            .map((it) => it.name)
            .join("、")
        }}{{ items.length > 2 ? " 等" : "" }}</span
      >
    </div>
    <div v-else class="xz-order__items">
      <div v-for="(it, i) in items" :key="i" class="xz-order__item body-sm">
        <span class="xz-order__item-name"
          >{{ it.name
          }}<span class="xz-order__item-qty">×{{ it.qty || 1 }}</span></span
        ><span v-if="it.price != null" class="xz-order__item-price"
          >¥{{ it.price }}</span
        >
      </div>
    </div>
    <div v-if="note" class="xz-order__note body-sm">备注 {{ note }}</div>
    <div class="xz-order__sum">
      <span class="xz-order__time body-sm">{{ time }}</span
      ><span class="xz-order__total"
        ><span class="xz-order__sum-label body-sm"
          >共 {{ count || quantity }} 件 · 实付</span
        ><Price :value="total" tone="ink"
      /></span>
    </div>
    <div v-if="actions?.length || $slots.actions" class="xz-order__actions">
      <slot name="actions"
        ><Button
          v-for="(a, i) in actions"
          :key="i"
          size="sm"
          :variant="a.variant || 'outline'"
          @click="a.onClick?.()"
          >{{ a.label }}</Button
        ></slot
      >
    </div>
  </div>
</template>
