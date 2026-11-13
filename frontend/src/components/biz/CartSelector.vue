<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import { ref } from "vue";
import type { StoredCart } from "@waimai/shared";
import Dialog from "../antd/PcDialog.vue";
import Icon from "../antd/AppIcon.vue";
import Thumb from "../antd/PcThumb.vue";
defineProps<{
  carts: StoredCart[];
  selected?: string;
  name?: string;
  logo?: string;
  count: number;
  disabled?: boolean;
  variant: "modal" | "sheet";
}>();
const emit = defineEmits<{ select: [id: string] }>();
const open = ref(false);
</script>
<template>
  <button
    type="button"
    class="xz-cart-selector"
    :disabled="disabled || !carts.length"
    aria-haspopup="dialog"
    :aria-expanded="open"
    @click="open = true"
  >
    <Thumb v-if="count" kind="logo" :name="name || '店铺'" :src="logo" />
    <span class="xz-cart-selector__main"
      ><span class="title-sm">{{ name || "其他购物车" }}</span
      ><span class="body-sm">{{
        count
          ? `共 ${count} 件商品 · 切换店铺`
          : `${carts.length} 家店铺有已选商品`
      }}</span></span
    >
    <Icon name="chevron-down" :size="16" />
  </button>
  <Dialog
    :open="open"
    title="切换购物车"
    :variant="variant"
    @close="open = false"
  >
    <div class="xz-cart-selector__list">
      <button
        v-for="entry in carts"
        :key="entry.storeId"
        type="button"
        class="xz-cart-selector"
        :aria-pressed="selected === entry.storeId"
        :disabled="disabled"
        @click="
          emit('select', entry.storeId);
          open = false;
        "
      >
        <Thumb kind="logo" :name="entry.name || '店铺'" :src="entry.logo" />
        <span class="xz-cart-selector__main"
          ><span class="title-sm">{{ entry.name || "店铺资料待核对" }}</span
          ><span class="body-sm"
            >共
            {{ entry.lines.reduce((sum, line) => sum + line.qty, 0) }}
            件商品</span
          ></span
        >
        <span v-if="selected === entry.storeId" class="body-sm">当前店铺</span
        ><Icon v-else name="chevron-right" :size="16" />
      </button>
    </div>
  </Dialog>
</template>
<style scoped>
.xz-cart-selector {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border: 0;
  border-radius: var(--radius-lg);
  background: none;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  min-width: 0;
  min-height: var(--size-tap);
}
.xz-cart-selector:not(:disabled):hover,
.xz-cart-selector[aria-pressed="true"] {
  background: var(--surface-hover);
}
.xz-cart-selector:disabled {
  cursor: default;
}
.xz-cart-selector__main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
  overflow-wrap: anywhere;
}
.xz-cart-selector__main > .body-sm {
  color: var(--ink-muted);
}
.xz-cart-selector__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
