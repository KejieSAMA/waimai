<script setup lang="ts">
import type { IconName } from "@waimai/ui";
import AppIcon from "./AppIcon.vue";
import { tagColor, type Tone } from "./mapping";
withDefaults(
  defineProps<{
    tone?: Tone;
    variant?: "soft" | "outline" | "solid";
    icon?: IconName;
  }>(),
  { tone: "neutral", variant: "soft" },
);
</script>
<template>
  <a-tag
    :color="tagColor(tone)"
    :bordered="variant === 'outline'"
    class="pc-tag"
    ><template v-if="icon" #icon><AppIcon :name="icon" :size="12" /></template
    ><slot
  /></a-tag>
</template>
<style scoped>
.pc-tag.ant-tag {
  margin-inline-end: 0;
}
</style>
