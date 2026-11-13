<script setup lang="ts">
// 表单项：a-form-item 竖排标签，可脱离 a-form 使用（页面仍用原生 form 提交与校验）。
defineProps<{
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}>();
</script>
<template>
  <a-form-item
    class="pc-field"
    :label="label"
    :html-for="htmlFor"
    :required="required"
    :validate-status="error ? 'error' : undefined"
    :help="error || hint"
    :label-col="{ span: 24 }"
    :wrapper-col="{ span: 24 }"
    :colon="false"
  >
    <template v-if="error || hint" #help
      ><span :id="htmlFor ? htmlFor + '-help' : undefined">{{
        error || hint
      }}</span></template
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
