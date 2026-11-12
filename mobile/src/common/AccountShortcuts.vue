<script setup lang="ts">
import { Icon } from "@waimai/ui";
import type { AccountLink } from "./accountNavigation";
defineProps<{ items: AccountLink[] }>();
defineEmits<{ navigate: [path: string] }>();
</script>
<template>
  <nav
    class="app-card account-shortcuts"
    aria-label="常用功能"
    :style="{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="item in items"
      :key="item.path"
      type="button"
      class="account-shortcuts__item body-sm"
      @click="$emit('navigate', item.path)"
    >
      <Icon :name="item.icon" :size="24" /><span>{{ item.label }}</span>
    </button>
  </nav>
</template>
<style scoped>
.account-shortcuts {
  display: grid;
  gap: var(--space-2);
}
.account-shortcuts__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: calc(var(--size-tap) + var(--space-4));
  padding: var(--space-2) 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}
.account-shortcuts__item svg {
  color: var(--brand-text);
}
.account-shortcuts__item:active {
  background: var(--surface-sunken);
}
.account-shortcuts__item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
