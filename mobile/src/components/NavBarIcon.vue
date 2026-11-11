<script setup lang="ts">
import { Icon } from "@waimai/ui";
import type { IconName } from "@waimai/ui";
defineProps<{
  name: IconName;
  label: string;
  badge?: number | boolean | string;
}>();
</script>
<template>
  <button type="button" class="xz-nav__icon" :aria-label="label">
    <Icon :name="name" :size="22" /><span
      v-if="badge"
      class="xz-nav__badge caption"
      >{{ badge === true ? "" : badge }}</span
    >
  </button>
</template>
