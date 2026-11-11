<script setup lang="ts">
import { computed } from "vue";
import { normItems, type NavItem } from "./types";
import { useValue } from "./useValue";
import ScrollArea from "./ScrollArea.vue";
const props = withDefaults(
  defineProps<{
    items: (string | NavItem)[];
    modelValue?: string;
    defaultValue?: string;
    variant?: "line" | "chip";
    wrap?: boolean;
    disabled?: boolean;
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
  <ScrollArea
    :class="['xz-tabs', 'xz-tabs--' + variant, { 'xz-tabs--wrap': wrap }]"
    role="tablist"
    axis="x"
    :disabled="wrap"
    label="页面选项"
    content-class="xz-tabs__items"
  >
    <button
      v-for="it in options"
      :key="it.key"
      type="button"
      role="tab"
      :disabled="disabled || it.disabled"
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
  </ScrollArea>
</template>
<style scoped>
:deep(.xz-tabs__items) {
  display: flex;
  min-width: 100%;
}
.xz-tabs--chip :deep(.xz-tabs__items) {
  gap: var(--space-2);
}
.xz-tabs--wrap {
  flex-direction: row;
  flex-wrap: wrap;
}
</style>
