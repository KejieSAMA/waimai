<script setup lang="ts" generic="R extends object">
// a-table 渲染表格；外层仍是覆盖式 ScrollArea，fill 模式表头吸顶，滚动条不占宽度。
import { ScrollArea } from "@waimai/ui";
import { computed, ref, watch } from "vue";
import { rowActivation } from "@waimai/shared";
import type { Action } from "@waimai/shared";
import ActionButton from "./antd/ActionButton.vue";

type Column = {
  key: string;
  title: string;
  width?: number | string;
  align?: "left" | "right" | "center";
  num?: boolean;
};
const props = withDefaults(
  defineProps<{
    columns: Column[];
    rows: R[];
    rowKey?: string;
    selectable?: boolean;
    rowInteractive?: boolean;
    selected?: string[];
    batchActions?: Action[];
    activeKey?: string;
    fill?: boolean;
    resetKey?: string;
  }>(),
  { rowKey: "id", selected: () => [] },
);
const emit = defineEmits<{ select: [keys: string[]]; rowClick: [row: R] }>();

const scroll = ref<InstanceType<typeof ScrollArea>>();
watch(
  () => props.resetKey,
  () => scroll.value?.scrollTo({ top: 0 }),
  { flush: "post" },
);

const keyOf = (row: R) => String(row[props.rowKey as keyof R]);
const antColumns = computed(() =>
  props.columns.map((c) => ({
    key: c.key,
    dataIndex: c.key,
    title: c.title,
    width: c.width,
    align: c.align || "left",
    className: c.num ? "xz-num" : undefined,
  })),
);
const rowSelection = computed(() =>
  props.selectable
    ? {
        selectedRowKeys: props.selected,
        columnWidth: 48,
        onChange: (keys: (string | number)[]) =>
          emit("select", keys.map(String)),
      }
    : undefined,
);
const customRow = (row: R) =>
  props.rowInteractive
    ? {
        tabindex: 0,
        onClick: (event: MouseEvent) => {
          if (
            rowActivation(
              true,
              !!(event.target as HTMLElement).closest(
                "button,a,input,select,textarea,[role=checkbox],[role=button],[role=link],[contenteditable]",
              ),
            )
          )
            emit("rowClick", row);
        },
        onKeydown: (event: KeyboardEvent) => {
          if (
            rowActivation(true, event.target !== event.currentTarget, event.key)
          ) {
            event.preventDefault();
            emit("rowClick", row);
          }
        },
      }
    : {};
const rowClassName = (row: R) =>
  props.activeKey !== undefined && keyOf(row) === String(props.activeKey)
    ? "is-active"
    : "";
const record = (r: unknown) => r as R;
</script>
<template>
  <div
    class="pc-table"
    :class="{ 'pc-table--fill': fill, 'pc-table--interactive': rowInteractive }"
  >
    <div v-if="$slots.toolbar" class="pc-table__toolbar">
      <slot name="toolbar" />
    </div>
    <div v-if="selectable && selected.length" class="pc-table__batch">
      <span class="pc-table__count">已选 {{ selected.length }} 项</span>
      <slot name="batchActions" />
      <ActionButton
        v-for="a in batchActions"
        :key="a.label"
        size="small"
        :variant="a.variant || 'outline'"
        @click="a.onClick?.()"
        >{{ a.label }}</ActionButton
      >
      <a-button size="small" type="link" @click="emit('select', [])"
        >取消选择</a-button
      >
    </div>
    <ScrollArea
      ref="scroll"
      class="pc-table__scroll"
      :axis="fill ? 'both' : 'x'"
      :scrollbar-placement="fill ? 'outside' : 'inside'"
      label="表格内容"
      :contain="fill"
    >
      <a-table
        :columns="antColumns"
        :data-source="rows"
        :row-key="keyOf"
        :row-selection="rowSelection"
        :custom-row="customRow"
        :row-class-name="rowClassName"
        :pagination="false"
        size="middle"
      >
        <template #bodyCell="{ column, record: r }">
          <slot :name="String(column.key)" :row="record(r)">{{
            record(r)[column.key as keyof R]
          }}</slot>
        </template>
        <template #emptyText>
          <div class="pc-table__empty"><slot name="empty">暂无数据</slot></div>
        </template>
      </a-table>
    </ScrollArea>
    <div v-if="$slots.footer" class="pc-table__foot">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.pc-table {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--surface-raised);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--line);
}
.pc-table--fill {
  flex: 1;
  min-height: 0;
}
.pc-table__toolbar,
.pc-table__batch,
.pc-table__foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
}
.pc-table__toolbar {
  border-bottom: 1px solid var(--line);
}
.pc-table__batch {
  background: var(--brand-soft);
  border-bottom: 1px solid var(--line);
}
.pc-table__count {
  color: var(--brand-text);
  font-weight: 600;
}
.pc-table__foot {
  justify-content: flex-end;
  border-top: 1px solid var(--line);
}
.pc-table__scroll {
  min-width: 0;
}
.pc-table--fill > .pc-table__scroll {
  flex: 1;
  min-height: 0;
}
.pc-table__empty {
  padding: var(--space-8) 0;
  color: var(--ink-muted);
}
.pc-table :deep(.ant-table) {
  background: transparent;
}
.pc-table--fill :deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 2;
}
.pc-table--interactive :deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
.pc-table :deep(.ant-table-tbody > tr.is-active > td) {
  background: var(--brand-soft);
}
</style>
