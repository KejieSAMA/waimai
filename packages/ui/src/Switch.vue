<script setup lang="ts">
import { useValue } from "./useValue";
const props = defineProps<{
  modelValue?: boolean;
  defaultChecked?: boolean;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const value = useValue(
  () => props.modelValue,
  props.defaultChecked ?? false,
  (value) => emit("update:modelValue", value),
);
</script>
<template>
  <button
    type="button"
    role="switch"
    :aria-checked="value"
    :disabled="disabled"
    :class="['xz-switch', { 'is-on': value }]"
    @click="value = !value"
  >
    <span v-if="label" class="xz-switch__label body-sm">{{ label }}</span
    ><span class="xz-switch__track"><span class="xz-switch__thumb" /></span>
  </button>
</template>
