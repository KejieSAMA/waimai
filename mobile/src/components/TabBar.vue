<script setup lang="ts">
import { Icon } from "@waimai/ui";
import type { NavItem } from "@waimai/ui";
defineProps<{ items: NavItem[]; modelValue?: string; role?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <nav class="xz-tabbar" aria-label="主导航">
    <button
      v-for="it in items"
      :key="it.key"
      type="button"
      :class="['xz-tabbar__item', { 'is-active': it.key === modelValue }]"
      :aria-current="it.key === modelValue ? 'page' : undefined"
      @click="emit('update:modelValue', it.key)"
    >
      <span class="xz-tabbar__icon"
        ><Icon v-if="it.icon" :name="it.icon" :size="22" /><span
          v-if="it.badge"
          class="xz-tabbar__badge caption"
          >{{ it.badge }}</span
        ></span
      ><span class="xz-tabbar__label caption">{{ it.label }}</span>
    </button>
  </nav>
</template>
