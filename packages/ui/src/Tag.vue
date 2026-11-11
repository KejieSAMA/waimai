<script setup lang="ts">
import Icon from "./Icon.vue";
import type { IconName } from "./types";
withDefaults(
  defineProps<{
    tone?:
      | "neutral"
      | "brand"
      | "success"
      | "warning"
      | "info"
      | "danger"
      | "accent";
    variant?: "soft" | "outline" | "solid";
    icon?: IconName;
  }>(),
  { tone: "neutral", variant: "soft" },
);
</script>
<template>
  <span :class="['xz-tag', 'caption', 'xz-tag--' + variant, 'xz-tag--' + tone]"
    ><Icon v-if="icon" :name="icon" :size="12" /><slot
  /></span>
</template>
