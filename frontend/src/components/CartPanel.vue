<script setup lang="ts">
import { Button, Icon, Price, Stepper, ScrollArea } from "@waimai/ui";
import { money, type Quote } from "@waimai/shared";
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
</script>
<template>
  <aside class="xz-cartpanel" aria-label="购物车">
    <div class="xz-cartpanel__head">
      <span class="title">购物车</span
      ><Button
        v-if="items.length"
        size="sm"
        variant="text"
        @click="emit('clear')"
        >清空</Button
      >
    </div>
    <ScrollArea
      v-if="items.length"
      class="xz-cartpanel__list"
      content-class="xz-cartpanel__items"
      label="购物车商品列表"
      contain
    >
      <div v-for="it in items" :key="it.id" class="xz-cartpanel__item">
        <span class="xz-cartpanel__name"
          ><span class="body-md" :title="it.name">{{ it.name }}</span></span
        ><Stepper
          :model-value="it.qty"
          :max="it.max"
          :collapse="false"
          @update:model-value="emit('quantity', it.id, $event)"
        /><Price
          v-if="it.price != null"
          :value="it.price"
          size="sm"
          tone="ink"
        /><span v-else class="body-sm app-muted">—</span>
      </div>
    </ScrollArea>
    <div v-else class="xz-cartpanel__empty body-md">
      <Icon name="cart" :size="32" />还没有选购商品
    </div>
    <div v-if="quote" class="xz-cartpanel__sum body-md" :aria-busy="updating">
      <div>
        <span>商品小计</span
        ><Price :value="quote.itemsCents / 100" tone="ink" size="sm" />
      </div>
      <div>
        <span>配送费</span><span v-if="!quote.deliveryFeeCents">免配送费</span
        ><Price
          v-else
          :value="quote.deliveryFeeCents / 100"
          tone="ink"
          size="sm"
        />
      </div>
      <div v-if="quote.discountCents" class="is-off">
        <span>满减优惠</span><span>-¥{{ quote.discountCents / 100 }}</span>
      </div>
    </div>
    <p v-if="quote?.shortfallCents" class="body-sm app-muted app-cart-hint">
      差 {{ money(quote.shortfallCents) }} 起送
      <Button
        size="sm"
        variant="text"
        :disabled="disabled"
        @click="emit('pickup')"
        >到店自提</Button
      >
    </p>
    <p v-if="updating" class="body-sm app-muted app-cart-hint" role="status">
      金额更新中
    </p>
    <div class="xz-cartpanel__foot">
      <div v-if="quote" class="xz-cartpanel__total">
        <span class="body-md">合计</span
        ><Price :value="quote.payCents / 100" size="lg" />
      </div>
      <Button
        size="lg"
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
        }}</Button
      >
    </div>
  </aside>
</template>
<style scoped>
.xz-cartpanel {
  --cart-row-height: calc(var(--space-6) * 2 + 1px);
  min-height: 0;
  max-height: 100%;
  align-self: start;
}
.xz-cartpanel__head,
.xz-cartpanel__sum,
.xz-cartpanel__foot {
  flex: none;
}
.xz-cartpanel__list {
  flex: 0 1 auto;
  min-height: 0;
  max-height: calc(var(--cart-row-height) * 5.5);
  padding: 0;
}
:deep(.xz-cartpanel__items) {
  padding: 0 var(--space-4);
}
.xz-cartpanel__item {
  box-sizing: border-box;
  flex: none;
  height: var(--cart-row-height);
  min-height: var(--cart-row-height);
}
.xz-cartpanel__empty {
  min-height: 0;
  overflow: hidden;
}
</style>

<style scoped>
.app-cart-hint {
  flex: none;
  padding: 0 var(--space-4);
  margin: var(--space-1) 0;
}
</style>
