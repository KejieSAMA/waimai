<script setup lang="ts">
// 与 @waimai/ui Select 同名 props 的 a-select；placeholder 仍作为值为空串的显式选项（如“全部”）。
// layout="vertical" 时标签在上、宽度占满，用于与表单项对齐；默认标签在左（筛选栏、排序）。
import { computed, ref, useId, useAttrs, watch } from "vue";
import PcField from "./PcField.vue";
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const generatedId = useId();
const id = computed(() => String(attrs.id ?? `pc-select-${generatedId}`));
const control = ref<{ focus(): void }>();
defineExpose({ focus: () => control.value?.focus() });
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    defaultValue?: string;
    options: (string | { value: string; label: string })[];
    label?: string;
    error?: string;
    placeholder?: string;
    width?: number | string;
    disabled?: boolean;
    required?: boolean;
    layout?: "inline" | "vertical";
  }>(),
  { layout: "inline" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const list = computed(() => {
  const entries = props.options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return props.placeholder
    ? [{ value: "", label: props.placeholder }, ...entries]
    : entries;
});
const inner = ref(
  props.modelValue ??
    props.defaultValue ??
    (props.placeholder ? "" : (list.value[0]?.value ?? "")),
);
watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined) inner.value = v;
  },
);
function change(v: unknown) {
  inner.value = String(v ?? "");
  emit("update:modelValue", inner.value);
}
const style = computed(() => ({
  width:
    typeof props.width === "number"
      ? props.width + "px"
      : (props.width ??
        (props.layout === "vertical"
          ? "100%"
          : props.label
            ? undefined
            : "160px")),
  minWidth: "120px",
}));
</script>
<template>
  <PcField
    v-if="layout === 'vertical'"
    :label="label"
    :required="required"
    :html-for="id"
    class="pc-select--vertical"
  >
    <a-select
      ref="control"
      v-bind="attrs"
      :id="id"
      :data-field="attrs.name"
      :aria-invalid="!!error"
      :aria-describedby="
        [attrs['aria-describedby'], error ? id + '-error' : '']
          .filter(Boolean)
          .join(' ') || undefined
      "
      :value="inner"
      :options="list"
      :disabled="disabled"
      :style="style"
      :aria-label="label || placeholder"
      @change="change"
    />
    <span
      v-if="error"
      :id="id + '-error'"
      class="pc-select-error"
      role="alert"
      >{{ error }}</span
    >
  </PcField>
  <label v-else class="pc-select" :for="id">
    <span v-if="label" class="pc-select__label">{{ label }}</span>
    <a-select
      ref="control"
      v-bind="attrs"
      :id="id"
      :data-field="attrs.name"
      :aria-invalid="!!error"
      :aria-describedby="
        [attrs['aria-describedby'], error ? id + '-error' : '']
          .filter(Boolean)
          .join(' ') || undefined
      "
      :value="inner"
      :options="list"
      :disabled="disabled"
      :style="style"
      :aria-label="label || placeholder"
      @change="change"
    />
  </label>
  <span
    v-if="error && layout !== 'vertical'"
    :id="id + '-error'"
    class="pc-select-error"
    role="alert"
    >{{ error }}</span
  >
</template>
<style scoped>
.pc-select-error {
  color: var(--danger);
}
.pc-select {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.pc-select__label {
  flex: none;
  color: var(--ink-muted);
}
</style>
