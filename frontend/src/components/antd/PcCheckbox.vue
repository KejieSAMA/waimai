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
function change(v: boolean) {
  inner.value = v;
  emit("update:modelValue", v);
}
</script>
<template>
  <a-checkbox
    :checked="inner"
    :disabled="disabled"
    :indeterminate="indeterminate"
    @update:checked="change"
    ><slot>{{ label }}</slot></a-checkbox
  >
</template>
