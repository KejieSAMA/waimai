<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import { firstImage, type Product, type Quote } from "@waimai/shared";
import Button from "../antd/PcButton.vue";
import { Price } from "@waimai/ui";
import Stepper from "../cards/QtyStepper.vue";
import Thumb from "../antd/PcThumb.vue";
defineProps<{
  product: Product;
  qty: number;
  quoted?: Quote["items"][number];
  issue?: string;
  disabled?: boolean;
  max: number;
}>();
const emit = defineEmits<{ quantity: [value: number] }>();
</script>
<template>
  <article class="xz-checkout-item">
    <Thumb :src="firstImage(product.images)" :name="product.name" />
    <div class="xz-checkout-item__main">
      <h3 class="title-sm">{{ quoted?.name ?? product.name }}</h3>
      <div class="xz-checkout-item__unit caption">
        单价
        <Price
          v-if="quoted"
          :value="quoted.priceCents / 100"
          size="sm"
          tone="ink"
        /><span v-else>—</span>
      </div>
    </div>
    <div class="xz-checkout-item__quantity">
      <Stepper
        :model-value="qty"
        :collapse="false"
        :max="max"
        :disabled="disabled"
        @update:model-value="emit('quantity', $event)"
      /><Button
        size="sm"
        variant="text"
        :disabled="disabled"
        :aria-label="'移除 ' + product.name"
        @click="emit('quantity', 0)"
        >移除</Button
      >
    </div>
    <div class="xz-checkout-item__amount">
      <span class="caption">小计</span
      ><Price
        v-if="quoted"
        :value="quoted.lineTotalCents / 100"
        tone="ink"
        size="sm"
      /><span v-else class="body-sm">—</span>
    </div>
    <p v-if="issue" class="xz-checkout-item__issue body-sm" role="alert">
      {{ issue }}
    </p>
  </article>
</template>
<style scoped>
.xz-checkout-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-2) var(--space-3);
  align-items: start;
  padding: var(--space-4) 0;
}
.xz-checkout-item + .xz-checkout-item {
  border-top: 1px solid var(--line);
}
.xz-checkout-item > .pc-thumb {
  grid-column: 1;
  grid-row: 1 / 3;
}
.xz-checkout-item__main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}
.xz-checkout-item h3 {
  margin: 0 0 var(--space-1);
  overflow-wrap: anywhere;
}
.xz-checkout-item__unit {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  color: var(--ink-muted);
}
.xz-checkout-item__quantity {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.xz-checkout-item__amount {
  grid-column: 3;
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  white-space: nowrap;
}
.xz-checkout-item__amount > .caption {
  color: var(--ink-muted);
}
.xz-checkout-item__issue {
  grid-column: 2 / -1;
  margin: 0;
  color: var(--danger);
}
</style>
