<script setup lang="ts">
import Icon from "./Icon.vue";
import type { IconName } from "./types";
withDefaults(
  defineProps<{
    variant?:
      | "primary"
      | "secondary"
      | "outline"
      | "text"
      | "danger"
      | "danger-outline"
      | "danger-text";
    size?: "lg" | "md" | "sm";
    block?: boolean;
    icon?: IconName;
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "primary", size: "md", type: "button" },
);
</script>
<template>
  <button
    :type="type"
    :class="[
      'xz-btn',
      'xz-btn--' + variant,
      'xz-btn--' + size,
      { lg: 'title', md: 'title-sm', sm: 'body-sm' }[size],
      { 'xz-btn--block': block },
    ]"
  >
    <Icon v-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" /><slot />
  </button>
</template>
