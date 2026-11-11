<script setup lang="ts">
import Icon from "./Icon.vue";
import type { IconName } from "./types";
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    unit?: string;
    prefix?: string;
    delta?: number;
    deltaLabel?: string;
    icon?: IconName;
    tone?: "plain" | "brand" | "chrome";
    size?: "md" | "sm";
  }>(),
  { tone: "plain", size: "md", deltaLabel: "较昨日" },
);
</script>
<template>
  <div
    :class="['xz-stat', 'xz-stat--' + tone, { 'xz-stat--sm': size === 'sm' }]"
  >
    <div class="xz-stat__label body-sm">
      <Icon v-if="icon" :name="icon" :size="16" />{{ label }}
    </div>
    <div :class="['xz-stat__value', size === 'sm' ? 'price' : 'stat']">
      <span v-if="prefix" class="xz-stat__pre">{{ prefix }}</span
      >{{ value
      }}<span v-if="unit" class="xz-stat__unit body-sm">{{ unit }}</span>
    </div>
    <div
      v-if="delta != null"
      :class="['xz-stat__delta', 'caption', delta >= 0 ? 'is-up' : 'is-down']"
    >
      <b>{{ delta >= 0 ? "↑" : "↓" }} {{ Math.abs(delta) }}%</b
      ><span>{{ deltaLabel }}</span>
    </div>
  </div>
</template>
