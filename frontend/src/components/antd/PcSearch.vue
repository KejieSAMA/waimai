<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    tone?: string;
    action?: string;
  }>(),
  { placeholder: "搜索" },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  action: [];
}>();
</script>
<template>
  <a-input-search
    class="pc-search"
    role="search"
    :value="modelValue"
    :placeholder="placeholder"
    :aria-label="placeholder"
    :enter-button="action || undefined"
    allow-clear
    @update:value="emit('update:modelValue', $event ?? '')"
    @search="emit('action')"
  />
</template>
<style scoped>
.pc-search {
  max-width: 360px;
}
</style>
