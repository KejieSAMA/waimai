<script setup lang="ts">
import { icons } from "./icons";
import type { IconName } from "./types";
withDefaults(
  defineProps<{
    name: IconName;
    size?: number;
    strokeWidth?: number;
    title?: string;
  }>(),
  { size: 20, strokeWidth: 1.75 },
);
</script>
<template>
  <svg
    class="xz-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="title ? 'img' : undefined"
    :aria-hidden="title ? undefined : true"
    :aria-label="title"
    focusable="false"
  >
    <template v-for="(part, i) in icons[name] || icons.more" :key="i">
      <path v-if="typeof part === 'string'" :d="part" />
      <circle
        v-else-if="part.c"
        :cx="part.c[0]"
        :cy="part.c[1]"
        :r="part.c[2]"
      />
      <circle
        v-else-if="part.d"
        :cx="part.d[0]"
        :cy="part.d[1]"
        r="1.4"
        fill="currentColor"
        stroke="none"
      />
      <rect
        v-else-if="part.r"
        :x="part.r[0]"
        :y="part.r[1]"
        :width="part.r[2]"
        :height="part.r[3]"
        rx="1.5"
      />
      <path v-else :d="part.f" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>
