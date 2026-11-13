<script setup lang="ts">
defineProps<{
  loading?: boolean;
  error?: string;
  notice?: string;
  busy?: boolean;
}>();
defineEmits<{ retry: []; dismiss: [] }>();
</script>
<template>
  <div
    v-if="loading || error || notice"
    class="pc-cart-sync"
    :role="error ? 'alert' : 'status'"
  >
    <a-alert
      :type="error ? 'error' : notice ? 'warning' : 'info'"
      show-icon
      :message="error || notice || '正在读取购物车'"
      :closable="!error && !!notice"
      @close="$emit('dismiss')"
    >
      <template v-if="error" #action>
        <a-button
          size="small"
          type="link"
          :disabled="busy"
          @click="$emit('retry')"
          >重试</a-button
        >
      </template>
    </a-alert>
  </div>
</template>
<style scoped>
.pc-cart-sync {
  position: fixed;
  top: calc(64px + var(--space-3));
  left: 50%;
  z-index: 40;
  width: max-content;
  max-width: calc(100vw - var(--space-6));
  transform: translateX(-50%);
}
</style>
