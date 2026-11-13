<script setup lang="ts">
// 按共享层 Action/variant 渲染 a-button，供弹窗底部、订单卡片等统一使用。
import { computed } from "vue";
import { buttonProps, type ButtonVariant } from "./mapping";

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: "small" | "middle" | "large";
    block?: boolean;
    disabled?: boolean;
    loading?: boolean;
    htmlType?: "button" | "submit" | "reset";
  }>(),
  { variant: "primary", size: "middle", htmlType: "button" },
);
const mapped = computed(() => buttonProps(props.variant));
</script>
<template>
  <a-button
    v-bind="mapped"
    :size="size"
    :block="block"
    :disabled="disabled"
    :loading="loading"
    :html-type="htmlType"
    ><slot
  /></a-button>
</template>
