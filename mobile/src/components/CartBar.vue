<script setup lang="ts">
import { Icon, Price } from "@waimai/ui";
defineProps<{
  count: number;
  total?: number;
  deliveryFee?: number;
  minOrder?: number;
  label?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ checkout: [] }>();
</script>
<template>
  <div class="xz-cartbar">
    <span :class="['xz-cartbar__icon', { 'is-empty': !count }]"
      ><Icon name="cart" :size="26" /><span
        v-if="count"
        class="xz-cartbar__badge caption"
        >{{ count }}</span
      ></span
    >
    <div class="xz-cartbar__info">
      <Price v-if="total != null" :value="total" tone="chrome" /><span
        v-else
        class="xz-cartbar__empty body-sm"
        >{{ count ? "登录后查看金额" : "未选购商品" }}</span
      ><span v-if="deliveryFee != null" class="xz-cartbar__sub caption"
        >配送 ¥{{ deliveryFee }}</span
      >
    </div>
    <button
      type="button"
      class="xz-cartbar__go title-sm"
      :disabled="disabled || !count"
      @click="emit('checkout')"
    >
      {{ label || "去结算" }}
    </button>
  </div>
</template>
