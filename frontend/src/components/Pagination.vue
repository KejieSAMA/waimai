<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
withDefaults(
  defineProps<{ total: number; pageSize?: number; modelValue?: number }>(),
  { pageSize: DEFAULT_PAGE_SIZE, modelValue: 1 },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
</script>
<template>
  <nav class="pc-pager" aria-label="分页">
    <a-pagination
      :current="modelValue"
      :total="total"
      :page-size="pageSize"
      :show-size-changer="false"
      :show-total="(n: number) => `共 ${n} 条`"
      @change="(page: number) => emit('update:modelValue', page)"
    />
  </nav>
</template>
<style scoped>
.pc-pager {
  display: flex;
  justify-content: flex-end;
}
.pc-pager.app-home-pagination {
  justify-content: center;
}
</style>
