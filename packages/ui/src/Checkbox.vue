<script setup lang="ts">
import Icon from "./Icon.vue";
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
    role="checkbox"
    :aria-checked="indeterminate && !value ? 'mixed' : value"
    :disabled="disabled"
    :class="['xz-check', { 'is-on': value || indeterminate }]"
    @click.stop="value = !value"
  >
    <span class="xz-check__box"
      ><Icon
        v-if="value || indeterminate"
        :name="value ? 'check' : 'minus'"
        :size="14"
        :stroke-width="2.5" /></span
    ><span v-if="label" class="xz-check__label body-md">{{ label }}</span>
  </button>
</template>
