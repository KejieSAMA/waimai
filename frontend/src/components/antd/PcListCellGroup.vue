<script setup lang="ts">
defineProps<{ title?: string }>();
</script>
<template>
  <a-card :bordered="false" size="small" :title="title" class="pc-cell-group">
    <slot />
  </a-card>
</template>
<style scoped>
.pc-cell-group.ant-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.pc-cell-group :deep(.ant-card-body) {
  padding: 0;
}
</style>
