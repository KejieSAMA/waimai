<script setup lang="ts">
// 与 @waimai/ui Dialog 同名 props：drawer → a-drawer（宽 560），其余 → a-modal。
// 关闭时销毁内容（与原组件 v-if 一致）；closeDisabled 时不可关闭、遮罩与 Esc 无效。
import { ScrollArea, dialogStack } from "@waimai/ui";
import { dialogCloseDecision } from "@waimai/shared";
import type { Action } from "@waimai/shared";
import ActionButton from "./ActionButton.vue";
const props = defineProps<{
  open?: boolean;
  title?: string;
  actions?: Action[];
  variant?: "center" | "sheet" | "modal" | "drawer";
  closeDisabled?: boolean;
  confirmDiscard?: boolean;
  dirty?: boolean;
  width?: number;
}>();
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
const emit = defineEmits<{ close: [] }>();
const content = ref<HTMLElement>(),
  edited = ref(false),
  discardOpen = ref(false);
const key = Symbol("pc-dialog");
let previous: HTMLElement | null = null;
function close() {
  if (!dialogStack.isTop(key)) return;
  const decision = dialogCloseDecision(
    !!props.closeDisabled,
    !!props.confirmDiscard && (props.dirty ?? edited.value),
  );
  if (decision === "confirm") discardOpen.value = true;
  else if (decision === "close") emit("close");
}
function discard() {
  discardOpen.value = false;
  edited.value = false;
  emit("close");
}
defineExpose({ close });
function dialogRoot() {
  return content.value?.closest<HTMLElement>(
    ".ant-modal-content,.ant-drawer-content",
  );
}
function keydown(event: KeyboardEvent) {
  if (!dialogStack.isTop(key)) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
    return;
  }
  if (event.key !== "Tab") return;
  const root = dialogRoot();
  const nodes = Array.from(
    root?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
    ) ?? [],
  ).filter((n) => n.getClientRects().length > 0);
  const first = nodes[0],
    last = nodes.at(-1);
  if (!first) {
    event.preventDefault();
    root?.focus();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === root)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
function containFocus(event: FocusEvent) {
  const root = dialogRoot(),
    target = event.target as HTMLElement | null;
  if (!props.open || !dialogStack.isTop(key) || !root || !target) return;
  if (
    !root.contains(target) &&
    !target.closest(".ant-select-dropdown,.ant-picker-dropdown,.ant-dropdown")
  ) {
    root.tabIndex = -1;
    root.focus({ preventScroll: true });
  }
}
function cleanup() {
  const top = dialogStack.isTop(key);
  dialogStack.remove(key);
  document.removeEventListener("keydown", keydown);
  document.removeEventListener("focusin", containFocus);
  if (top && previous?.isConnected)
    void nextTick(() => previous?.focus({ preventScroll: true }));
}
watch(
  () => props.open,
  (open) => {
    if (open) {
      previous = document.activeElement as HTMLElement;
      edited.value = false;
      discardOpen.value = false;
      dialogStack.push(key);
      document.addEventListener("keydown", keydown);
      document.addEventListener("focusin", containFocus);
    } else cleanup();
  },
  { immediate: true },
);
onBeforeUnmount(cleanup);
</script>
<template>
  <a-drawer
    v-if="variant === 'drawer'"
    :open="open"
    :title="title"
    :width="width || 560"
    :closable="!closeDisabled"
    :mask-closable="!closeDisabled"
    :keyboard="false"
    destroy-on-close
    placement="right"
    class="pc-dialog"
    @close="close"
  >
    <ScrollArea class="pc-dialog__body" label="弹窗内容" contain
      ><div
        ref="content"
        class="pc-dialog__content"
        @input.capture="edited = true"
        @change.capture="edited = true"
      >
        <slot /></div
    ></ScrollArea>
    <template v-if="actions?.length || $slots.actions" #footer>
      <div class="pc-dialog__actions">
        <slot name="actions"
          ><ActionButton
            v-for="(a, i) in actions"
            :key="i"
            :variant="
              a.variant || (i === actions!.length - 1 ? 'primary' : 'outline')
            "
            @click="a.onClick?.()"
            >{{ a.label }}</ActionButton
          ></slot
        >
      </div>
    </template>
  </a-drawer>
  <a-modal
    v-else
    :open="open"
    :title="title"
    :width="width || 520"
    :closable="!closeDisabled"
    :mask-closable="!closeDisabled"
    :keyboard="false"
    destroy-on-close
    centered
    :footer="actions?.length || $slots.actions ? undefined : null"
    class="pc-dialog"
    @cancel="close"
  >
    <ScrollArea class="pc-dialog__body" label="弹窗内容" contain
      ><div
        ref="content"
        class="pc-dialog__content"
        @input.capture="edited = true"
        @change.capture="edited = true"
      >
        <slot /></div
    ></ScrollArea>
    <template v-if="actions?.length || $slots.actions" #footer>
      <div class="pc-dialog__actions">
        <slot name="actions"
          ><ActionButton
            v-for="(a, i) in actions"
            :key="i"
            :variant="
              a.variant || (i === actions!.length - 1 ? 'primary' : 'outline')
            "
            @click="a.onClick?.()"
            >{{ a.label }}</ActionButton
          ></slot
        >
      </div>
    </template>
  </a-modal>
  <PcDialog
    v-if="discardOpen && open"
    :open="true"
    title="放弃修改"
    @close="discardOpen = false"
    ><p>尚有未保存的修改，是否放弃？</p>
    <template #actions
      ><ActionButton variant="outline" @click="discardOpen = false"
        >继续编辑</ActionButton
      ><ActionButton variant="danger" @click="discard"
        >放弃修改</ActionButton
      ></template
    ></PcDialog
  >
</template>
<style scoped>
.pc-dialog__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
<style>
.pc-dialog .ant-modal-content {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - var(--space-8));
}
.pc-dialog .ant-modal-body,
.pc-dialog .ant-drawer-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.pc-dialog .ant-modal-body {
  flex: 1 1 auto;
}
.pc-dialog .ant-modal-header,
.pc-dialog .ant-modal-footer {
  flex: none;
}
.pc-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
}
.pc-dialog .ant-drawer-body > .pc-dialog__body {
  flex: 1;
  max-height: none;
}
.pc-dialog__content {
  padding: var(--space-2);
}
</style>
