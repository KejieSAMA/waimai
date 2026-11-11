<script setup lang="ts">
import { ref, watch } from "vue";
import { ScrollArea } from "@waimai/ui";
const props = withDefaults(
  defineProps<{ bodyScroll?: boolean; label?: string; resetKey?: string }>(),
  {
    bodyScroll: true,
    label: "页面内容",
  },
);
const scroll = ref<InstanceType<typeof ScrollArea>>();
watch(
  () => props.resetKey,
  () => scroll.value?.scrollTo({ top: 0 }),
  { flush: "post" },
);
defineExpose({ scrollToTop: () => scroll.value?.scrollTo({ top: 0 }) });
</script>
<template>
  <section class="bo-page">
    <header v-if="$slots.header" class="bo-page__header">
      <slot name="header" />
    </header>
    <ScrollArea
      v-if="bodyScroll"
      ref="scroll"
      class="bo-page__body"
      content-class="bo-page__content"
      axis="both"
      :label="label"
      scrollbar-placement="outside"
      contain
      ><slot
    /></ScrollArea>
    <div v-else class="bo-page__body bo-page__body--fill"><slot /></div>
    <footer v-if="$slots.footer" class="bo-page__footer">
      <slot name="footer" />
    </footer>
    <slot name="overlay" />
  </section>
</template>
<style scoped>
.bo-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  min-width: 0;
  gap: var(--space-4);
}
.bo-page__header {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}
.bo-page__header :deep(.xz-pagehead),
.bo-page__header :deep(.xz-filterbar) {
  margin-bottom: 0;
}
.bo-page__header :deep(.xz-tabs--line) {
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  border-bottom: 1px solid var(--line);
}
.bo-page__header > p {
  margin: 0;
}
.bo-page__body {
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.bo-page__body--fill {
  display: flex;
  flex-direction: column;
}
.bo-page__footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
:deep(.bo-page__content) {
  min-height: 100%;
}
</style>
