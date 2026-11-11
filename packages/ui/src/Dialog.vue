<script setup lang="ts">
import Button from "./Button.vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Action } from "@waimai/shared";
import ScrollArea from "./ScrollArea.vue";
import { useOverlayScrollbars } from "./scrollbarContext";
const overlay = useOverlayScrollbars();
const props = withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    actions?: Action[];
    variant?: "center" | "sheet" | "modal" | "drawer";
  }>(),
  { open: false, variant: "center" },
);
const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLElement>();
let previous: HTMLElement | null = null;
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
  if (event.key !== "Tab") return;
  const nodes = Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
    ) ?? [],
  ).filter((node) => node.getClientRects().length > 0);
  if (!nodes.length) {
    event.preventDefault();
    return;
  }
  const first = nodes[0],
    last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
watch(
  () => props.open,
  async (open) => {
    if (open) {
      previous = document.activeElement as HTMLElement;
      document.addEventListener("keydown", keydown);
      await nextTick();
      panel.value?.focus();
    } else {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    }
  },
);
onBeforeUnmount(() => document.removeEventListener("keydown", keydown));
</script>
<template>
  <Teleport to="body"
    ><div
      v-if="open"
      :class="['xz-dialog-scrim', 'xz-dialog-scrim--' + variant]"
      @click.self="emit('close')"
    >
      <div
        ref="panel"
        tabindex="-1"
        :class="[
          'xz-dialog',
          'xz-dialog--' + variant,
          { 'xz-dialog--overlay': overlay },
        ]"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div v-if="variant === 'drawer'" class="xz-dialog__head">
          <h2 class="xz-dialog__title title">{{ title }}</h2>
          <Button
            variant="text"
            aria-label="关闭"
            icon="close"
            @click="emit('close')"
          />
        </div>
        <h2 v-else-if="title" class="xz-dialog__title title">{{ title }}</h2>
        <ScrollArea
          class="xz-dialog__body body"
          axis="both"
          :label="title || '弹窗内容'"
          contain
          ><slot
        /></ScrollArea>
        <div v-if="actions || $slots.actions" class="xz-dialog__actions">
          <slot name="actions"
            ><Button
              v-for="(a, i) in actions"
              :key="i"
              :variant="a.variant || 'outline'"
              @click="a.onClick?.()"
              >{{ a.label }}</Button
            ></slot
          >
        </div>
      </div>
    </div></Teleport
  >
</template>
<style scoped>
.xz-dialog--overlay {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - var(--space-8));
  min-height: 0;
}
.xz-dialog--overlay.xz-dialog--drawer {
  max-height: 100dvh;
}
.xz-dialog--overlay > .xz-dialog__head,
.xz-dialog--overlay > .xz-dialog__title,
.xz-dialog--overlay > .xz-dialog__actions {
  flex: none;
}
.xz-dialog--overlay > .xz-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
