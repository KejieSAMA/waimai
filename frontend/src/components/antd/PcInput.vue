<script setup lang="ts">
// 与 @waimai/ui Input 同名 props 的 antd 输入框：label/hint/error 走 a-form-item，
// 其余原生属性（required、maxlength、pattern、type…）透传到输入元素，原生表单校验不变。
import { computed, ref, useAttrs, useId, watch } from "vue";
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    defaultValue?: string | number;
    label?: string;
    hint?: string;
    error?: string;
    prefix?: string;
    suffix?: string;
    required?: boolean;
    multiline?: boolean;
    layout?: "vertical" | "horizontal";
  }>(),
  { layout: "vertical" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const attrs = useAttrs();
const generatedId = useId();
const id = computed(() => String(attrs.id ?? `pc-input-${generatedId}`));
const helpId = computed(() => id.value + "-help");
const control = ref<{ focus(): void }>();
defineExpose({ focus: () => control.value?.focus() });
const inner = ref(String(props.modelValue ?? props.defaultValue ?? ""));
watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined) inner.value = String(v);
  },
);
const value = computed({
  get: () => inner.value,
  set: (v: string) => {
    inner.value = v;
    emit("update:modelValue", v);
  },
});
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style as string | undefined,
}));
const inputAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs };
  delete rest.class;
  delete rest.style;
  rest.id = id.value;
  rest["aria-describedby"] =
    [attrs["aria-describedby"], props.error || props.hint ? helpId.value : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return rest;
});
const password = computed(() => attrs.type === "password");
const horizontal = computed(() => props.layout === "horizontal");
</script>
<template>
  <a-form-item
    v-bind="rootAttrs"
    :class="['pc-input', { 'pc-input--h': horizontal }]"
    :label="label"
    :html-for="id"
    :required="required"
    :validate-status="error ? 'error' : undefined"
    :help="error || hint"
    :label-col="horizontal ? { flex: '0 0 7em' } : { span: 24 }"
    :wrapper-col="horizontal ? { flex: '1 1 0' } : { span: 24 }"
    :colon="false"
  >
    <template v-if="error || hint" #help
      ><span :id="helpId">{{ error || hint }}</span></template
    >
    <a-textarea
      v-if="multiline"
      ref="control"
      v-bind="inputAttrs"
      v-model:value="value"
      :required="required"
      :auto-size="{ minRows: 3, maxRows: 8 }"
      :aria-invalid="!!error"
    />
    <a-input-password
      v-else-if="password"
      ref="control"
      v-bind="inputAttrs"
      v-model:value="value"
      :required="required"
      :aria-invalid="!!error"
      ><template v-if="prefix || $slots.prefix" #prefix
        ><slot name="prefix">{{ prefix }}</slot></template
      ></a-input-password
    >
    <a-input
      v-else
      ref="control"
      v-bind="inputAttrs"
      v-model:value="value"
      :required="required"
      :aria-invalid="!!error"
      ><template v-if="prefix || $slots.prefix" #prefix
        ><slot name="prefix">{{ prefix }}</slot></template
      ><template v-if="suffix || $slots.suffix" #suffix
        ><slot name="suffix">{{ suffix }}</slot></template
      ></a-input
    >
  </a-form-item>
</template>
<style scoped>
.pc-input {
  margin-bottom: 0;
}
.pc-input :deep(.ant-form-item-label) {
  padding-bottom: var(--space-1);
}
.pc-input--h :deep(.ant-form-item-label) {
  padding-bottom: 0;
  text-align: start;
}
</style>
