<script setup lang="ts">
import Button from "./Button.vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Action } from "@waimai/shared";
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
  const nodes = panel.value?.querySelectorAll<HTMLElement>(
    'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
  );
  if (!nodes?.length) {
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
        :class="['xz-dialog', 'xz-dialog--' + variant]"
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
        <div class="xz-dialog__body body"><slot /></div>
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
