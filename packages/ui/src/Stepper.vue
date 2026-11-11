<script setup lang="ts">
import Icon from "./Icon.vue";
import { useValue } from "./useValue";
const props = withDefaults(
  defineProps<{
    modelValue?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    collapse?: boolean;
  }>(),
  { min: 0, max: 99, collapse: true },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const value = useValue(
  () => props.modelValue,
  props.defaultValue ?? props.min,
  (value) => emit("update:modelValue", value),
);
</script>
<template>
  <span class="xz-stepper"
    ><template v-if="!collapse || value > min"
      ><button
        type="button"
        class="xz-stepper__btn"
        aria-label="减少"
        :disabled="disabled || value <= min"
        @click="value = Math.max(min, value - 1)"
      >
        <Icon name="minus" :size="14" /></button
      ><span class="xz-stepper__val body" aria-live="polite">{{
        value
      }}</span></template
    ><button
      type="button"
      class="xz-stepper__btn xz-stepper__btn--plus"
      aria-label="增加"
      :disabled="disabled || value >= max"
      @click="value = Math.min(max, value + 1)"
    >
      <Icon name="plus" :size="14" /></button
  ></span>
</template>
