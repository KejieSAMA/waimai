<script setup lang="ts" generic="R extends object">
import { Button, Checkbox } from "@waimai/ui";
import { computed } from "vue";
import type { Action } from "@waimai/shared";
const props = withDefaults(
  defineProps<{
    columns: {
      key: string;
      title: string;
      width?: number | string;
      align?: "left" | "right" | "center";
      num?: boolean;
    }[];
    rows: R[];
    rowKey?: string;
    selectable?: boolean;
    selected?: string[];
    batchActions?: Action[];
    activeKey?: string;
  }>(),
  { rowKey: "id", selected: () => [] },
);
const emit = defineEmits<{ select: [keys: string[]]; rowClick: [row: R] }>();
const all = computed(
  () =>
    props.rows.length > 0 &&
    props.rows.every((r) =>
      props.selected.includes(String(r[props.rowKey as keyof R])),
    ),
);
function toggle(id: string) {
  emit(
    "select",
    props.selected.includes(id)
      ? props.selected.filter((x) => x !== id)
      : [...props.selected, id],
  );
}
</script>
<template>
  <div class="xz-table">
    <div v-if="$slots.toolbar" class="xz-table__toolbar">
      <slot name="toolbar" />
    </div>
    <div v-if="selectable && selected.length" class="xz-table__batch body-md">
      <span class="xz-table__count">已选 {{ selected.length }} 项</span
      ><Button
        v-for="a in batchActions"
        :key="a.label"
        size="sm"
        :variant="a.variant || 'outline'"
        @click="a.onClick?.()"
        >{{ a.label }}</Button
      ><Button size="sm" variant="text" @click="emit('select', [])"
        >取消选择</Button
      >
    </div>
    <div class="xz-table__scroll">
      <table>
        <thead>
          <tr>
            <th v-if="selectable" class="xz-table__sel">
              <Checkbox
                :model-value="all"
                :indeterminate="!all && !!selected.length"
                aria-label="全选"
                @update:model-value="
                  emit(
                    'select',
                    all ? [] : rows.map((r) => String(r[rowKey as keyof R])),
                  )
                "
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              class="body-sm"
              :style="{
                width:
                  typeof column.width === 'number'
                    ? column.width + 'px'
                    : column.width,
                textAlign: column.align || 'left',
              }"
            >
              {{ column.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="String(row[rowKey as keyof R])"
            :class="{
              'is-selected': selected.includes(String(row[rowKey as keyof R])),
              'is-active': activeKey === row[rowKey as keyof R],
            }"
            @click="emit('rowClick', row)"
          >
            <td v-if="selectable" class="xz-table__sel">
              <Checkbox
                :model-value="selected.includes(String(row[rowKey as keyof R]))"
                aria-label="选择此行"
                @update:model-value="toggle(String(row[rowKey as keyof R]))"
              />
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              :class="['body-md', { 'xz-num': column.num }]"
              :style="{ textAlign: column.align || 'left' }"
            >
              <slot :name="column.key" :row="row">{{
                row[column.key as keyof R]
              }}</slot>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td
              :colspan="columns.length + (selectable ? 1 : 0)"
              class="xz-table__empty body-md"
            >
              <slot name="empty">暂无数据</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="$slots.footer" class="xz-table__foot">
      <slot name="footer" />
    </div>
  </div>
</template>
