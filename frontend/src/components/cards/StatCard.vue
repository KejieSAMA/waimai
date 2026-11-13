<script setup lang="ts">
import type { IconName } from "@waimai/ui";
import AppIcon from "../antd/AppIcon.vue";
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    unit?: string;
    prefix?: string;
    delta?: number;
    deltaLabel?: string;
    icon?: IconName;
    tone?: "plain" | "brand" | "chrome";
    size?: "md" | "sm";
  }>(),
  { tone: "plain", size: "md", deltaLabel: "较昨日" },
);
</script>
<template>
  <a-card
    :bordered="false"
    size="small"
    :class="['pc-stat', 'pc-stat--' + tone, { 'pc-stat--sm': size === 'sm' }]"
  >
    <a-statistic :value="value" :prefix="prefix" :suffix="unit">
      <template #title
        ><span class="pc-stat__label"
          ><AppIcon v-if="icon" :name="icon" />{{ label }}</span
        ></template
      >
    </a-statistic>
    <div
      v-if="delta != null"
      :class="['pc-stat__delta', delta >= 0 ? 'is-up' : 'is-down']"
    >
      <b>{{ delta >= 0 ? "↑" : "↓" }} {{ Math.abs(delta) }}%</b
      ><span>{{ deltaLabel }}</span>
    </div>
  </a-card>
</template>
<style scoped>
.pc-stat.ant-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.pc-stat :deep(.ant-card-body) {
  padding: var(--space-4) var(--space-5, 20px);
}
.pc-stat__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.pc-stat :deep(.ant-statistic-content) {
  font-family: var(--font-num), var(--font-sans);
  font-weight: 600;
}
.pc-stat--sm :deep(.ant-statistic-content) {
  font-size: 20px;
}
.pc-stat--brand.ant-card {
  background: var(--brand);
}
.pc-stat--brand :deep(.ant-statistic-title),
.pc-stat--brand :deep(.ant-statistic-content),
.pc-stat--brand .pc-stat__delta {
  color: var(--on-brand);
}
.pc-stat--chrome.ant-card {
  background: var(--brand-soft);
}
.pc-stat__delta {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-1);
  color: var(--ink-muted);
  font-size: 12px;
}
.pc-stat__delta.is-up b {
  color: var(--success);
}
.pc-stat__delta.is-down b {
  color: var(--danger);
}
.pc-stat--brand .pc-stat__delta b {
  color: inherit;
}
</style>
