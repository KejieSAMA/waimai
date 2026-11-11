<script setup lang="ts">
import { useValue } from "./useValue";
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
const value = useValue(
  () => props.modelValue,
  props.defaultValue ?? "",
  (v) => emit("update:modelValue", String(v)),
);
</script>
<template>
  <label
    :class="[
      'xz-field',
      { 'xz-field--h': layout === 'horizontal', 'xz-field--multi': multiline },
    ]"
    ><span
      v-if="label"
      :class="['xz-field__label', layout === 'horizontal' ? 'body' : 'body-sm']"
      >{{ label
      }}<span v-if="required" class="xz-field__req" aria-hidden="true"
        >*</span
      ></span
    ><span
      :class="[
        'xz-field__control',
        { 'is-error': error, 'is-multi': multiline },
      ]"
      ><span v-if="prefix || $slots.prefix" class="xz-field__affix body"
        ><slot name="prefix">{{ prefix }}</slot></span
      ><component
        :is="multiline ? 'textarea' : 'input'"
        v-bind="$attrs"
        :rows="multiline ? 3 : undefined"
        :required="required"
        class="xz-field__input body"
        :value="value"
        :aria-invalid="!!error"
        @input="value = ($event.target as HTMLInputElement).value"
      /><span v-if="suffix || $slots.suffix" class="xz-field__affix body"
        ><slot name="suffix">{{ suffix }}</slot></span
      ></span
    ><span
      v-if="error || hint"
      :class="['xz-field__hint', 'body-sm', { 'is-error': error }]"
      >{{ error || hint }}</span
    ></label
  >
</template>
