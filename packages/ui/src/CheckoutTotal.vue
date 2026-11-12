<script setup lang="ts">
import type { Quote } from "@waimai/shared";
import Button from "./Button.vue";
import Price from "./Price.vue";
defineProps<{
  quote: Quote | null;
  updating?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  inline?: boolean;
}>();
const emit = defineEmits<{ submit: [] }>();
</script>
<template>
  <div
    class="xz-checkout-total"
    :class="{ 'xz-checkout-total--inline': inline }"
  >
    <div class="xz-checkout-total__amount">
      <span class="body-sm">应付金额</span
      ><Price v-if="quote" :value="quote.payCents / 100" size="lg" /><span
        v-else
        class="price-lg"
        >—</span
      >
    </div>
    <Button
      class="xz-checkout-total__submit"
      :class="{ 'is-busy': updating || submitting }"
      size="lg"
      :block="!inline"
      :disabled="disabled || submitting || updating"
      :aria-busy="updating || submitting"
      @click="emit('submit')"
      ><span
        v-if="updating || submitting"
        class="xz-checkout-total__progress"
        role="status"
        :aria-label="submitting ? '订单提交中' : '金额更新中'"
      /><span>提交订单</span></Button
    >
    <slot name="after-submit" />
    <p v-if="!inline" class="caption">提交后前往订单详情确认支付</p>
  </div>
</template>
<style scoped>
.xz-checkout-total {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.xz-checkout-total__amount {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.xz-checkout-total__amount > .body-sm {
  color: var(--ink-muted);
  margin-right: auto;
}
.xz-checkout-total p {
  margin: 0;
  color: var(--ink-muted);
  text-align: center;
}
.xz-checkout-total__submit {
  position: relative;
  padding-inline: calc(var(--space-4) * 2);
  transition: none;
}
.xz-checkout-total__submit.is-busy:disabled {
  background: var(--brand);
  border-color: transparent;
  color: var(--on-brand);
  cursor: progress;
}
.xz-checkout-total__progress {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  width: var(--space-4);
  height: var(--space-4);
  margin-top: calc(var(--space-2) * -1);
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: var(--radius-pill);
  opacity: 0;
  animation:
    checkout-progress-show 0s 160ms forwards,
    checkout-progress-spin 800ms linear infinite;
}
@keyframes checkout-progress-show {
  to {
    opacity: 1;
  }
}
@keyframes checkout-progress-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .xz-checkout-total__progress {
    animation: checkout-progress-show 0s 160ms forwards;
  }
}
.xz-checkout-total--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.xz-checkout-total--inline .xz-checkout-total__amount {
  flex: 1;
  min-width: 0;
  gap: var(--space-1) var(--space-2);
}
.xz-checkout-total--inline .xz-checkout-total__amount > .body-sm {
  flex-basis: 100%;
  margin: 0;
}
.xz-checkout-total--inline > .xz-btn {
  flex: none;
}
</style>
