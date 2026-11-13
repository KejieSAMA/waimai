<script setup lang="ts">
// 与 @waimai/ui Tabs 同名 props：line → a-tabs（只用标签栏），chip → a-checkable-tag。
import { computed, ref, watch } from "vue";
import type { NavItem } from "@waimai/ui";
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
const options = computed(() =>
  props.items.map((it) =>
    typeof it === "string" ? ({ key: it, label: it } as NavItem) : it,
  ),
);
const inner = ref(
  props.modelValue ?? props.defaultValue ?? options.value[0]?.key ?? "",
);
watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined) inner.value = v;
  },
);
function pick(key: string | number) {
  inner.value = String(key);
  emit("update:modelValue", inner.value);
}
</script>
<template>
  <div
    v-if="variant === 'chip'"
    :class="['pc-chips', { 'pc-chips--wrap': wrap }]"
    role="tablist"
  >
    <a-checkable-tag
      v-for="it in options"
      :key="it.key"
      role="tab"
      :aria-selected="inner === it.key"
      :aria-disabled="disabled || it.disabled || undefined"
      :checked="inner === it.key"
      class="pc-chip"
      @change="!(disabled || it.disabled) && pick(it.key)"
      >{{ it.label
      }}<span v-if="it.count != null" class="pc-chip__count">{{
        it.count
      }}</span></a-checkable-tag
    >
  </div>
  <a-tabs
    v-else
    class="pc-tabs"
    :active-key="inner"
    :tab-bar-gutter="24"
    @change="pick"
  >
    <a-tab-pane
      v-for="it in options"
      :key="it.key"
      :disabled="disabled || it.disabled"
    >
      <template #tab
        >{{ it.label
        }}<a-badge
          v-if="it.count != null"
          :count="it.count"
          :show-zero="true"
          :overflow-count="999"
          :class="['pc-tabs__count', { 'is-alert': it.alert }]"
      /></template>
    </a-tab-pane>
  </a-tabs>
</template>
<style scoped>
.pc-chips {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
}
.pc-chips--wrap {
  flex-wrap: wrap;
  overflow: visible;
}
.pc-chip.ant-tag {
  margin: 0;
  padding: 5px var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--surface-raised);
  font-size: 14px;
  line-height: 20px;
}
.pc-chip.ant-tag-checkable-checked {
  background: var(--brand);
}
.pc-chip__count {
  margin-left: var(--space-1);
  font-family: var(--font-num), var(--font-sans);
}
.pc-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}
.pc-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}
.pc-tabs__count {
  margin-left: var(--space-1);
}
.pc-tabs__count :deep(.ant-badge-count) {
  background: var(--surface-sunken);
  color: var(--ink-muted);
  box-shadow: none;
}
.pc-tabs__count.is-alert :deep(.ant-badge-count) {
  background: var(--danger);
  color: var(--on-brand);
}
</style>
