<script setup lang="ts">
import { provide, ref } from "vue";
import { pageScrollKey } from "../common/pageScroll";
const body = ref<HTMLElement>();
provide(pageScrollKey, (target) => {
  const viewport = body.value;
  if (!viewport) return;
  const top = target
    ? target.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top +
      viewport.scrollTop
    : 0;
  viewport.scrollTo({ top: Math.max(0, top) });
});
defineExpose({ scrollToTop: () => body.value?.scrollTo({ top: 0 }) });
defineProps<{ bottomTone?: "raised" | "clear"; statusBar?: string | false }>();
</script>
<template>
  <div class="xz-page">
    <slot name="navBar" />
    <div ref="body" class="xz-page__body"><slot /></div>
    <div
      v-if="$slots.bottom"
      :class="[
        'xz-page__bottom',
        { 'xz-page__bottom--clear': bottomTone === 'clear' },
      ]"
    >
      <slot name="bottom" />
    </div>
    <div class="xz-page__safe" />
    <slot name="overlay" />
  </div>
</template>
