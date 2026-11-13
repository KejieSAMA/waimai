<script setup lang="ts">
// 与 @waimai/ui Dialog 同名 props：drawer → a-drawer（宽 560），其余 → a-modal。
// 关闭时销毁内容（与原组件 v-if 一致）；closeDisabled 时不可关闭、遮罩与 Esc 无效。
import type { Action } from "@waimai/shared";
import ActionButton from "./ActionButton.vue";
defineProps<{
  open?: boolean;
  title?: string;
  actions?: Action[];
  variant?: "center" | "sheet" | "modal" | "drawer";
  closeDisabled?: boolean;
  width?: number;
}>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
  <a-drawer
    v-if="variant === 'drawer'"
    :open="open"
    :title="title"
    :width="width || 560"
    :closable="!closeDisabled"
    :mask-closable="!closeDisabled"
    :keyboard="!closeDisabled"
    destroy-on-close
    placement="right"
    class="pc-dialog"
    @close="!closeDisabled && emit('close')"
  >
    <slot />
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
    :keyboard="!closeDisabled"
    destroy-on-close
    centered
    :footer="actions?.length || $slots.actions ? undefined : null"
    class="pc-dialog"
    @cancel="!closeDisabled && emit('close')"
  >
    <div class="pc-dialog__body"><slot /></div>
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
.pc-dialog .ant-modal-body {
  max-height: calc(100dvh - 220px);
  overflow-y: auto;
}
</style>
