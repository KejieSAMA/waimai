<script setup lang="ts">
import { Icon } from "@waimai/ui";
import { computed } from "vue";
const props = withDefaults(
  defineProps<{ total: number; pageSize?: number; modelValue?: number }>(),
  { pageSize: 20, modelValue: 1 },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const pages = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize)),
);
const visible = computed(() =>
  [
    ...new Set([
      1,
      props.modelValue - 1,
      props.modelValue,
      props.modelValue + 1,
      pages.value,
    ]),
  ]
    .filter((p) => p >= 1 && p <= pages.value)
    .sort((a, b) => a - b),
);
</script>
<template>
  <nav class="xz-pager body-md" aria-label="分页">
    <span class="xz-pager__total">共 {{ total }} 条</span
    ><button
      type="button"
      class="xz-pager__btn"
      aria-label="上一页"
      :disabled="modelValue <= 1"
      @click="emit('update:modelValue', modelValue - 1)"
    >
      <Icon name="back" :size="16" /></button
    ><template v-for="(n, i) in visible" :key="n"
      ><span v-if="i && n - visible[i - 1] > 1" class="xz-pager__gap">…</span
      ><button
        type="button"
        :class="['xz-pager__btn', { 'is-active': modelValue === n }]"
        @click="emit('update:modelValue', n)"
      >
        {{ n }}
      </button></template
    ><button
      type="button"
      class="xz-pager__btn"
      aria-label="下一页"
      :disabled="modelValue >= pages"
      @click="emit('update:modelValue', modelValue + 1)"
    >
      <Icon name="chevron-right" :size="16" />
    </button>
  </nav>
</template>
