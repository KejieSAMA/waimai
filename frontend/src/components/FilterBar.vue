<script setup lang="ts">
withDefaults(defineProps<{ showReset?: boolean }>(), { showReset: true });
const emit = defineEmits<{ search: []; reset: [] }>();
</script>
<template>
  <a-form
    class="pc-filterbar"
    layout="inline"
    role="search"
    @submit.prevent="emit('search')"
  >
    <slot />
    <a-form-item class="pc-filterbar__btns">
      <a-space wrap>
        <a-button v-if="showReset" @click="emit('reset')">重置</a-button>
        <a-button type="primary" html-type="submit">查询</a-button>
        <slot name="actions" />
      </a-space>
    </a-form-item>
  </a-form>
</template>
<style scoped>
.pc-filterbar {
  flex-wrap: wrap;
  row-gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}
.pc-filterbar :deep(.ant-form-item) {
  margin-inline-end: var(--space-4);
}
.pc-filterbar__btns {
  margin-inline-start: auto;
}
.pc-filterbar :deep(.ant-form-item.pc-filterbar__btns) {
  margin-inline-end: 0;
}
</style>
