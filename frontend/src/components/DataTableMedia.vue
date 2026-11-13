<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{
  name: string;
  sub?: string;
  src?: string;
  kind?: "dish" | "logo";
}>();
const initial = computed(() => props.name.slice(0, 1));
</script>
<template>
  <span class="pc-media">
    <a-avatar
      :src="src || undefined"
      :shape="kind === 'logo' ? 'circle' : 'square'"
      :size="40"
      class="pc-media__thumb"
      >{{ initial }}</a-avatar
    >
    <span class="pc-media__text">
      <span class="pc-media__name">{{ name }}</span>
      <span v-if="sub" class="pc-media__sub">{{ sub }}</span>
    </span>
  </span>
</template>
<style scoped>
.pc-media {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  max-width: 100%;
}
.pc-media__thumb {
  flex: none;
  background: var(--brand-soft);
  color: var(--brand-text);
}
.pc-media__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pc-media__name,
.pc-media__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-media__sub {
  color: var(--ink-muted);
  font-size: 12px;
}
</style>
