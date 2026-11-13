<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import type { Quote } from "@waimai/shared";
import { Price } from "@waimai/ui";
defineProps<{ quote: Quote | null; updating?: boolean; compact?: boolean }>();
</script>
<template>
  <div class="xz-checkout-fees" :aria-busy="updating">
    <dl :class="compact ? 'body-md' : 'body'">
      <div>
        <dt>商品小计</dt>
        <dd>
          <Price
            v-if="quote"
            :value="quote.itemsCents / 100"
            size="sm"
            tone="ink"
          /><span v-else>—</span>
        </dd>
      </div>
      <div>
        <dt>配送费</dt>
        <dd>
          <span v-if="quote?.deliveryFeeCents === 0">免配送费</span
          ><Price
            v-else-if="quote"
            :value="quote.deliveryFeeCents / 100"
            size="sm"
            tone="ink"
          /><span v-else>—</span>
        </dd>
      </div>
      <div
        class="xz-checkout-fees__discount"
        :class="{ 'is-empty': !quote?.discountCents }"
        :aria-hidden="!quote?.discountCents || undefined"
      >
        <dt>满减优惠</dt>
        <dd>
          <template v-if="quote && quote.discountCents > 0"
            >−<Price :value="quote.discountCents / 100" size="sm"
          /></template>
        </dd>
      </div>
    </dl>
  </div>
</template>
<style scoped>
.xz-checkout-fees dl {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
}
.xz-checkout-fees dl > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
}
.xz-checkout-fees dt {
  color: var(--ink-muted);
}
.xz-checkout-fees dd {
  margin: 0;
  text-align: right;
  white-space: nowrap;
}
.xz-checkout-fees .xz-checkout-fees__discount dt,
.xz-checkout-fees .xz-checkout-fees__discount dd {
  color: var(--brand-text);
}
.xz-checkout-fees__discount.is-empty {
  visibility: hidden;
}
</style>
