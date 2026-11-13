<script setup lang="ts">
import type { IconName } from "@waimai/ui";
import AppIcon from "./AppIcon.vue";
defineProps<{
  title: string;
  desc?: string;
  value?: string | number;
  icon?: IconName;
  extra?: string;
  arrow?: boolean;
  danger?: boolean;
}>();
const emit = defineEmits<{ click: [] }>();
</script>
<template>
  <component
    :is="arrow ? 'button' : 'div'"
    :type="arrow ? 'button' : undefined"
    :class="['pc-cell', { 'pc-cell--danger': danger, 'pc-cell--link': arrow }]"
    @click="emit('click')"
  >
    <span v-if="icon" class="pc-cell__icon"><AppIcon :name="icon" /></span>
    <span class="pc-cell__main">
      <span class="pc-cell__title">{{ title }}</span>
      <span v-if="desc" class="pc-cell__desc">{{ desc }}</span>
    </span>
    <span v-if="value != null" class="pc-cell__value">{{ value }}</span>
    <slot name="extra">{{ extra }}</slot>
    <AppIcon
      v-if="arrow"
      class="pc-cell__arrow"
      name="chevron-right"
      :size="14"
    />
  </component>
</template>
<style scoped>
.pc-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 52px;
  padding: var(--space-3) var(--space-4);
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
}
.pc-cell:last-child {
  border-bottom: 0;
}
.pc-cell--link {
  cursor: pointer;
}
.pc-cell--link:hover {
  background: var(--surface-hover);
}
.pc-cell--link:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}
.pc-cell--danger {
  color: var(--danger);
}
.pc-cell__icon {
  display: inline-flex;
  color: var(--ink-muted);
}
.pc-cell__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pc-cell__desc,
.pc-cell__value,
.pc-cell__arrow {
  color: var(--ink-muted);
  font-size: 13px;
}
.pc-cell__desc {
  overflow-wrap: anywhere;
}
</style>
