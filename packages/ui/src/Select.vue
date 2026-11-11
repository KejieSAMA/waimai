<script setup lang="ts">
import Icon from "./Icon.vue";
import { computed } from "vue";
import { useValue } from "./useValue";
const props = defineProps<{
  modelValue?: string;
  defaultValue?: string;
  options: (string | { value: string; label: string })[];
  label?: string;
  placeholder?: string;
  width?: number | string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const optionsList = computed(() =>
  props.options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  ),
);
const value = useValue(
  () => props.modelValue,
  props.defaultValue ??
    (props.placeholder ? "" : (optionsList.value[0]?.value ?? "")),
  (v) => emit("update:modelValue", v),
);
</script>
<template>
  <label
    class="xz-select"
    :style="
      width
        ? { width: typeof width === 'number' ? width + 'px' : width }
        : undefined
    "
    ><span v-if="label" class="xz-select__label body-md">{{ label }}</span
    ><select
      v-model="value"
      class="xz-select__native body-md"
      :aria-label="label || placeholder"
      :disabled="disabled"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="o in optionsList" :key="o.value" :value="o.value">
        {{ o.label }}
      </option></select
    ><Icon name="chevron-down" :size="16" class="xz-select__chev"
  /></label>
</template>
