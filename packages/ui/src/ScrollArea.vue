<script setup lang="ts">
import { ref } from "vue";
import ScrollBars from "./ScrollBars.vue";
import { useOverlayScrollbars } from "./scrollbarContext";

withDefaults(
  defineProps<{
    as?: string;
    axis?: "x" | "y" | "both";
    label?: string;
    contentClass?: string;
    disabled?: boolean;
    contain?: boolean;
  }>(),
  { as: "div", axis: "y", label: "滚动内容" },
);
const overlay = useOverlayScrollbars();
const root = ref<HTMLElement>(),
  viewport = ref<HTMLElement>(),
  content = ref<HTMLElement>();
defineExpose({
  scrollTo(options: ScrollToOptions) {
    (viewport.value ?? root.value)?.scrollTo(options);
  },
});
</script>

<template>
  <component
    :is="as"
    ref="root"
    :class="
      overlay && !disabled
        ? ['xz-scroll-area', 'xz-scroll-area--' + axis]
        : undefined
    "
  >
    <div v-if="overlay && !disabled" class="xz-scroll-area__frame">
      <div
        ref="viewport"
        class="xz-scroll-area__viewport xz-overlay-viewport"
        :class="{ 'xz-scroll-area__viewport--contained': contain }"
        tabindex="0"
        role="region"
        :aria-label="label"
      >
        <div ref="content" :class="['xz-scroll-area__content', contentClass]">
          <slot />
        </div>
      </div>
      <ScrollBars
        :target="viewport"
        :content="content"
        :axis="axis"
        :label="label"
      />
    </div>
    <slot v-else />
  </component>
</template>

<style scoped>
.xz-scroll-area {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.xz-scroll-area__frame {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
.xz-scroll-area__viewport {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.xz-scroll-area--y > .xz-scroll-area__frame > .xz-scroll-area__viewport {
  overflow-x: hidden;
}
.xz-scroll-area--x > .xz-scroll-area__frame > .xz-scroll-area__viewport {
  overflow-y: hidden;
}
.xz-scroll-area__viewport--contained {
  overscroll-behavior: contain;
}
.xz-scroll-area__viewport:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}
.xz-scroll-area__content {
  min-width: 100%;
}
.xz-scroll-area--x
  > .xz-scroll-area__frame
  > .xz-scroll-area__viewport
  > .xz-scroll-area__content {
  width: max-content;
}
</style>
