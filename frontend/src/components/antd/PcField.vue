<script setup lang="ts">
// 表单项：a-form-item 竖排标签，可脱离 a-form 使用（页面仍用原生 form 提交与校验）。
defineProps<{
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}>();
</script>
<template>
  <a-form-item
    class="pc-field"
    :label="label"
    :required="required"
    :validate-status="error ? 'error' : undefined"
    :help="error || hint"
    :label-col="{ span: 24 }"
    :wrapper-col="{ span: 24 }"
    :colon="false"
  >
    <slot />
  </a-form-item>
</template>
<style scoped>
.pc-field {
  margin-bottom: 0;
}
.pc-field :deep(.ant-form-item-label) {
  padding-bottom: var(--space-1);
}
</style>
