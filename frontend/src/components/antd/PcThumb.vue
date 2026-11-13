<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
withDefaults(
  defineProps<{
    kind?: "dish" | "logo";
    src?: string;
    name?: string;
    size?: "md" | "lg";
  }>(),
  { kind: "dish", size: "md" },
);
</script>
<template>
  <a-avatar
    class="pc-thumb"
    :shape="kind === 'logo' ? 'circle' : 'square'"
    :size="size === 'lg' ? 72 : 48"
    :src="src || undefined"
    :alt="name"
    ><span v-if="kind === 'logo' && name">{{ name.slice(0, 1) }}</span
    ><AppIcon v-else name="bowl" :size="size === 'lg' ? 32 : 22"
  /></a-avatar>
</template>
<style scoped>
.pc-thumb {
  flex: none;
  background: var(--brand-soft);
  color: var(--brand-text);
}
</style>
