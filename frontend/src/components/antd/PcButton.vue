<script setup lang="ts">
// 与 @waimai/ui Button 同名 props 的 a-button 适配（variant/size/icon/type）。
import { computed } from "vue";
import type { IconName } from "@waimai/ui";
import AppIcon from "./AppIcon.vue";
import { buttonProps, type ButtonVariant } from "./mapping";
const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: "lg" | "md" | "sm";
    block?: boolean;
    icon?: IconName;
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "primary", size: "md", type: "button" },
);
const mapped = computed(() => buttonProps(props.variant));
const antSize = computed(
  () =>
    ({ lg: "large", md: "middle", sm: "small" })[props.size] as
      "large" | "middle" | "small",
);
</script>
<template>
  <a-button v-bind="mapped" :size="antSize" :block="block" :html-type="type"
    ><template v-if="icon" #icon
      ><AppIcon :name="icon" :size="size === 'sm' ? 14 : 16" /></template
    ><slot
  /></a-button>
</template>
