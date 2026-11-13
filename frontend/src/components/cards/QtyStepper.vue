<script setup lang="ts">
// 圆形加减步进：collapse 时数量为最小值只显示“+”。
import { ref, watch } from "vue";
import AppIcon from "../antd/AppIcon.vue";
const props = withDefaults(
  defineProps<{
    modelValue?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    collapse?: boolean;
    name?: string;
  }>(),
  { min: 0, max: 99, collapse: true },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const inner = ref(props.modelValue ?? props.defaultValue ?? props.min);
watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined) inner.value = v;
  },
);
function set(next: number) {
  const v = Math.min(props.max, Math.max(props.min, next));
  if (props.modelValue === undefined) inner.value = v;
  emit("update:modelValue", v);
}
</script>
<template>
  <span class="pc-qty" @click.stop>
    <template v-if="!collapse || inner > min">
      <a-button
        shape="circle"
        size="small"
        :aria-label="name ? '减少 ' + name : '减少'"
        :disabled="disabled || inner <= min"
        @click="set(inner - 1)"
        ><AppIcon name="minus" :size="14"
      /></a-button>
      <span class="pc-qty__num xz-num" aria-live="polite">{{ inner }}</span>
    </template>
    <a-button
      type="primary"
      shape="circle"
      size="small"
      :aria-label="name ? '加入 ' + name : '增加'"
      :disabled="disabled || inner >= max"
      @click="set(inner + 1)"
      ><AppIcon name="plus" :size="14"
    /></a-button>
  </span>
</template>
<style scoped>
.pc-qty {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.pc-qty :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  min-width: 26px;
  height: 26px;
  padding: 0;
}
.pc-qty__num {
  min-width: 18px;
  text-align: center;
  font-weight: 600;
}
</style>
