<script setup lang="ts">
import Button from "./Button.vue";
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
    class="cart-sync-notice"
    :role="error ? 'alert' : 'status'"
  >
    <div class="cart-sync-notice__panel body-sm">
      <span>{{ error || notice || "正在读取购物车" }}</span>
      <Button
        v-if="error"
        variant="text"
        size="sm"
        :disabled="busy"
        @click="$emit('retry')"
        >重试</Button
      >
      <Button
        v-else-if="notice"
        variant="text"
        size="sm"
        icon="close"
        aria-label="关闭提示"
        @click="$emit('dismiss')"
      />
    </div>
  </div>
</template>
<style scoped>
.cart-sync-notice {
  position: fixed;
  top: calc(
    var(--size-navbar) + env(safe-area-inset-top, 0px) + var(--space-3)
  );
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  width: max-content;
  max-width: calc(100vw - var(--space-6));
  pointer-events: none;
}
.cart-sync-notice__panel {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-raised);
  color: var(--ink);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  pointer-events: auto;
}
.cart-sync-notice__panel span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.cart-sync-notice__panel .xz-btn {
  flex: none;
}
</style>
