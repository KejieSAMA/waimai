<script setup lang="ts">
import { ref, watch } from "vue";
const props = defineProps<{
  modelValue?: boolean;
  defaultChecked?: boolean;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const inner = ref(props.modelValue ?? props.defaultChecked ?? false);
watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined) inner.value = v;
  },
);
function change(v: unknown) {
  inner.value = !!v;
  emit("update:modelValue", inner.value);
}
</script>
<template>
  <span class="pc-switch">
    <span v-if="label" class="pc-switch__label">{{ label }}</span>
    <a-switch
      :checked="inner"
      :disabled="disabled"
      :aria-label="label"
      @change="change"
    />
  </span>
</template>
<style scoped>
.pc-switch {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
</style>
