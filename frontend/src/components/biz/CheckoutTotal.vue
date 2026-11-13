<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import type { Quote } from "@waimai/shared";
import Button from "../antd/PcButton.vue";
import { Price } from "@waimai/ui";
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
      :disabled="disabled"
      :loading="updating || submitting"
      :aria-busy="updating || submitting"
      :aria-label="
        submitting ? '订单提交中' : updating ? '金额更新中' : undefined
      "
      @click="emit('submit')"
      >提交订单</Button
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
  padding-inline: calc(var(--space-4) * 2);
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
.xz-checkout-total--inline > .ant-btn {
  flex: none;
}
</style>
