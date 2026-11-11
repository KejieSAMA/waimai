<script setup lang="ts">
import { computed } from "vue";
import { normItems, type NavItem } from "./types";
import { useValue } from "./useValue";
const props = withDefaults(
  defineProps<{
    items: (string | NavItem)[];
    modelValue?: string;
    defaultValue?: string;
    variant?: "line" | "chip";
  }>(),
  { variant: "line" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const options = computed(() => normItems(props.items));
const value = useValue(
  () => props.modelValue,
  props.defaultValue ?? options.value[0]?.key ?? "",
  (v) => emit("update:modelValue", v),
);
</script>
<template>
  <div :class="['xz-tabs', 'xz-tabs--' + variant]" role="tablist">
    <button
      v-for="it in options"
      :key="it.key"
      type="button"
      role="tab"
      :aria-selected="value === it.key"
      :class="[
        'xz-tab',
        variant === 'chip' ? 'body-sm' : 'body',
        { 'is-active': value === it.key },
      ]"
      @click="value = it.key"
    >
      {{ it.label
      }}<span
        v-if="it.count != null"
        :class="['xz-tab__count', { 'is-alert caption': it.alert }]"
        >{{ it.count }}</span
      >
    </button>
  </div>
</template>
