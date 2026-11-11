<script setup lang="ts">
import Icon from "./Icon.vue";
import type { IconName } from "./types";
defineProps<{
  title: string;
  desc?: string;
  value?: string | number;
  icon?: IconName;
  extra?: string;
  arrow?: boolean;
  danger?: boolean;
}>();
const emit = defineEmits<{ click: [] }>();
</script>
<template>
  <component
    :is="arrow ? 'button' : 'div'"
    :type="arrow ? 'button' : undefined"
    :class="['xz-cell', { 'xz-cell--danger': danger }]"
    @click="emit('click')"
    ><span v-if="icon" class="xz-cell__icon"><Icon :name="icon" /></span
    ><span class="xz-cell__main"
      ><span class="xz-cell__title body">{{ title }}</span
      ><span v-if="desc" class="xz-cell__desc body-sm">{{ desc }}</span></span
    ><span v-if="value != null" class="xz-cell__value body-sm">{{ value }}</span
    ><slot name="extra">{{ extra }}</slot
    ><span v-if="arrow" class="xz-cell__arrow"
      ><Icon name="chevron-right" :size="16" /></span
  ></component>
</template>
