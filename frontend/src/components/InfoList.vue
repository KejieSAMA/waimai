<script setup lang="ts">
defineProps<{ items: { label: string; value: unknown }[]; columns?: 1 | 2 }>();
</script>
<template>
  <a-descriptions :column="columns || 1" size="small" class="pc-info">
    <a-descriptions-item v-for="(it, i) in items" :key="i" :label="it.label">{{
      it.value
    }}</a-descriptions-item>
  </a-descriptions>
</template>
<style scoped>
.pc-info :deep(.ant-descriptions-item-label) {
  color: var(--ink-muted);
  min-width: 5em;
}
</style>
