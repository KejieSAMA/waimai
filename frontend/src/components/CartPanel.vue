<script setup lang="ts">
// 购物车面板：高度随内容、最高到本栏；清单行高固定，最多 5.5 行后在覆盖式滚动区内滚动，
// 头部、费用、结算固定，滚动条不占宽度，溢出前后布局不变。
import { Price, ScrollArea } from "@waimai/ui";
import { money, type Quote } from "@waimai/shared";
import { Empty } from "ant-design-vue";
import AppIcon from "./antd/AppIcon.vue";
import QtyStepper from "./cards/QtyStepper.vue";
defineProps<{
  items: {
    id: string;
    name: string;
    qty: number;
    price?: number;
    max?: number;
  }[];
  quote: Quote | null;
  label?: string;
  disabled?: boolean;
  updating?: boolean;
  minOrder?: number;
  pickup?: boolean;
}>();
const emit = defineEmits<{
  checkout: [];
  clear: [];
  pickup: [];
  quantity: [id: string, qty: number];
}>();
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
</script>
<template>
  <aside class="pc-cart" aria-label="购物车">
    <div class="pc-cart__head">
      <span class="pc-cart__title"
        ><AppIcon name="cart" /> 购物车
        <a-badge
          :count="items.reduce((n, it) => n + it.qty, 0)"
          :number-style="{ boxShadow: 'none' }"
      /></span>
      <a-button
        v-if="items.length"
        type="link"
        size="small"
        danger
        @click="emit('clear')"
        >清空</a-button
      >
    </div>
    <ScrollArea
      v-if="items.length"
      class="pc-cart__list"
      content-class="pc-cart__items"
      label="购物车商品列表"
      contain
    >
      <div v-for="it in items" :key="it.id" class="pc-cart__item">
        <span class="pc-cart__name" :title="it.name">{{ it.name }}</span>
        <QtyStepper
          :name="it.name"
          :model-value="it.qty"
          :max="it.max"
          :collapse="false"
          @update:model-value="emit('quantity', it.id, $event)"
        />
        <Price
          v-if="it.price != null"
          class="pc-cart__line"
          :value="it.price"
          size="sm"
          tone="ink"
        /><span v-else class="pc-cart__line pc-cart__muted">—</span>
      </div>
    </ScrollArea>
    <a-empty
      v-else
      :image="simpleImage"
      class="pc-cart__empty"
      description="还没有选购商品"
    />
    <div v-if="quote" class="pc-cart__sum" :aria-busy="updating">
      <div class="pc-cart__row">
        <span>商品小计</span
        ><Price :value="quote.itemsCents / 100" tone="ink" size="sm" />
      </div>
      <div class="pc-cart__row">
        <span>配送费</span><span v-if="!quote.deliveryFeeCents">免配送费</span
        ><Price
          v-else
          :value="quote.deliveryFeeCents / 100"
          tone="ink"
          size="sm"
        />
      </div>
      <div v-if="quote.discountCents" class="pc-cart__row is-off">
        <span>满减优惠</span
        ><span class="xz-num">-¥{{ quote.discountCents / 100 }}</span>
      </div>
    </div>
    <div v-if="quote?.shortfallCents" class="pc-cart__hint">
      <span class="pc-cart__muted"
        >差 {{ money(quote.shortfallCents) }} 起送</span
      >
      <a-button
        type="link"
        size="small"
        :disabled="disabled"
        @click="emit('pickup')"
        >到店自提</a-button
      >
    </div>
    <p v-if="updating" class="pc-cart__hint pc-cart__muted" role="status">
      金额更新中
    </p>
    <div class="pc-cart__foot">
      <div v-if="quote" class="pc-cart__row pc-cart__total">
        <span>合计</span><Price :value="quote.payCents / 100" size="lg" />
      </div>
      <a-button
        type="primary"
        size="large"
        block
        :disabled="
          !items.length ||
          disabled ||
          updating ||
          quote?.checkoutAllowed === false
        "
        @click="emit('checkout')"
        >{{
          !items.length && minOrder && !pickup
            ? money(minOrder) + " 起送"
            : label || "去结算"
        }}</a-button
      >
    </div>
  </aside>
</template>
<style scoped>
.pc-cart {
  --cart-pad: 16px;
  --cart-row: 49px;
  display: flex;
  flex-direction: column;
  align-self: start;
  width: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  box-shadow: var(--shadow-card);
}
.pc-cart__head,
.pc-cart__sum,
.pc-cart__hint,
.pc-cart__foot,
.pc-cart__empty {
  flex: none;
}
.pc-cart__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: 52px;
  padding: 12px 8px 8px var(--cart-pad);
}
.pc-cart__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
}
.pc-cart__list {
  flex: 0 1 auto;
  min-height: 0;
  max-height: calc(var(--cart-row) * 5.5);
}
:deep(.pc-cart__items) {
  padding: 0 var(--cart-pad);
}
.pc-cart__item {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  height: var(--cart-row);
  border-bottom: 1px solid var(--line);
}
.pc-cart__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-cart__line {
  min-width: 48px;
  text-align: right;
}
.pc-cart__empty.ant-empty {
  margin: 0;
  padding: 24px var(--cart-pad);
}
.pc-cart__sum {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px var(--cart-pad);
  color: var(--ink-muted);
}
.pc-cart__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}
.pc-cart__row.is-off {
  color: var(--danger);
}
.pc-cart__hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0 var(--cart-pad) 8px;
  font-size: 12px;
}
.pc-cart__muted {
  color: var(--ink-muted);
}
.pc-cart__foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px var(--cart-pad) var(--cart-pad);
  border-top: 1px solid var(--line);
}
.pc-cart__total {
  font-size: 14px;
  color: var(--ink);
}
</style>
