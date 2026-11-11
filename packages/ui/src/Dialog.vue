<script setup lang="ts">
import Button from "./Button.vue";
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { dialogPresentationKey } from "./dialogContext";
import { dialogStack } from "./overlayStack";
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
    closeDisabled?: boolean;
  }>(),
  { open: false },
);
const emit = defineEmits<{ close: [] }>();
const presentation = inject(dialogPresentationKey, "center");
const variant = computed(() => props.variant ?? presentation);
const panel = ref<HTMLElement>();
const key = Symbol("dialog");
const depth = ref(0);
let previous: HTMLElement | null = null;
function keydown(event: KeyboardEvent) {
  if (!dialogStack.isTop(key)) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
    return;
  }
  if (event.key !== "Tab") return;
  const nodes = Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
    ) ?? [],
  ).filter((node) => node.getClientRects().length > 0);
  if (!nodes.length) {
    event.preventDefault();
    return;
  }
  const first = nodes[0],
    last = nodes[nodes.length - 1];
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
function close() {
  if (!props.closeDisabled && dialogStack.isTop(key)) emit("close");
}
function containFocus(event: FocusEvent) {
  if (!dialogStack.isTop(key) || !props.open || !panel.value) return;
  const target = event.target as HTMLElement | null;
  if (
    target &&
    !panel.value.contains(target) &&
    !target.closest(".xz-select__menu")
  )
    panel.value.focus({ preventScroll: true });
}
function cleanup() {
  const wasTop = dialogStack.isTop(key);
  dialogStack.remove(key);
  document.removeEventListener("keydown", keydown);
  document.removeEventListener("focusin", containFocus);
  if (wasTop && previous?.isConnected) previous.focus({ preventScroll: true });
}
watch(
  () => props.open,
  async (open) => {
    if (open) {
      previous = document.activeElement as HTMLElement;
      depth.value = dialogStack.size;
      dialogStack.push(key);
      document.addEventListener("keydown", keydown);
      document.addEventListener("focusin", containFocus);
      await nextTick();
      if (props.open && dialogStack.isTop(key)) {
        const target =
          panel.value?.querySelector<HTMLElement>(
            "[autofocus]:not(:disabled)",
          ) ?? panel.value;
        target?.focus({ preventScroll: true });
      }
    } else cleanup();
  },
  { immediate: true },
);
onBeforeUnmount(cleanup);
</script>
<template>
  <Teleport to="body"
    ><div
      v-if="open"
      :class="['xz-dialog-scrim', 'xz-dialog-scrim--' + variant]"
      :style="{ zIndex: 50 + depth * 2 }"
      @click.self="close"
    >
      <div
        ref="panel"
        tabindex="-1"
        :class="[
          'xz-dialog',
          'xz-dialog--' + variant,
          { 'xz-dialog--overlay': overlay },
          { 'xz-desk': overlay && variant === 'modal' },
        ]"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div
          v-if="variant === 'drawer' || variant === 'modal'"
          class="xz-dialog__head"
        >
          <h2 class="xz-dialog__title title">{{ title }}</h2>
          <Button
            variant="text"
            class="xz-dialog__close"
            :size="variant === 'modal' ? 'sm' : 'md'"
            :disabled="closeDisabled"
            aria-label="关闭"
            icon="close"
            @click="close"
          />
        </div>
        <h2 v-else-if="title" class="xz-dialog__title title">{{ title }}</h2>
        <ScrollArea
          class="xz-dialog__body body"
          axis="both"
          :label="title || '弹窗内容'"
          contain
          ><div class="xz-dialog__content"><slot /></div
        ></ScrollArea>
        <div v-if="actions || $slots.actions" class="xz-dialog__actions">
          <slot name="actions"
            ><Button
              v-for="(a, i) in actions"
              :key="i"
              :variant="
                a.variant || (i === actions!.length - 1 ? 'primary' : 'outline')
              "
              :size="variant === 'sheet' ? 'lg' : 'md'"
              :block="variant === 'center' || variant === 'sheet'"
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
.xz-dialog-scrim {
  position: fixed;
}
.xz-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - var(--space-8));
  min-height: 0;
}
.xz-dialog--drawer {
  max-height: 100dvh;
}
.xz-dialog > .xz-dialog__head,
.xz-dialog > .xz-dialog__title,
.xz-dialog > .xz-dialog__actions {
  flex: none;
}
.xz-dialog > .xz-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
.xz-dialog--overlay > .xz-dialog__body {
  overflow: hidden;
}
.xz-dialog__content {
  padding: var(--space-1);
}
.xz-dialog--modal {
  padding: 0;
  overflow: hidden;
}
.xz-dialog--modal > .xz-dialog__head {
  height: auto;
  padding: var(--space-5) var(--space-6) var(--space-3);
  gap: var(--space-4);
  border-bottom: 0;
}
.xz-dialog--modal .xz-dialog__title {
  margin: 0;
}
.xz-dialog--modal .xz-dialog__close {
  flex: none;
  width: var(--size-button-sm);
  height: var(--size-button-sm);
  padding: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-hover);
}
.xz-dialog--modal .xz-dialog__content {
  padding: var(--space-3) var(--space-6) var(--space-5);
}
.xz-dialog--modal > .xz-dialog__actions {
  margin: 0;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--line);
}
.xz-dialog--sheet {
  max-height: calc(100dvh - var(--space-6));
}
.xz-dialog--center .xz-dialog__actions > *,
.xz-dialog--sheet .xz-dialog__actions > * {
  flex: 1;
}
</style>
