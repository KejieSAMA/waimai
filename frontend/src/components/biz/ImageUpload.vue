<script setup lang="ts">
// 图片选择交给页面上传（与原组件一致：select 发出文件，remove 发出下标）。
import AppIcon from "../antd/AppIcon.vue";
withDefaults(
  defineProps<{ images: string[]; disabled?: boolean; max?: number }>(),
  { max: 5 },
);
const emit = defineEmits<{
  select: [files: File[]];
  remove: [index: number];
}>();
function choose(event: Event) {
  const input = event.target as HTMLInputElement;
  emit("select", Array.from(input.files ?? []));
  input.value = "";
}
</script>
<template>
  <div class="pc-upload">
    <div v-for="(src, index) in images" :key="src" class="pc-upload__item">
      <a-image
        :src="src"
        :alt="'商品图片 ' + (index + 1)"
        :width="96"
        :height="96"
        class="pc-upload__img"
      />
      <a-button
        class="pc-upload__remove"
        shape="circle"
        size="small"
        :disabled="disabled"
        :aria-label="'移除图片 ' + (index + 1)"
        @click="emit('remove', index)"
        ><AppIcon name="close" :size="12"
      /></a-button>
    </div>
    <label
      v-if="images.length < max"
      class="pc-upload__add"
      :class="{ 'is-disabled': disabled }"
    >
      <input
        class="pc-upload__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        :multiple="max > 1"
        :disabled="disabled"
        aria-label="添加图片"
        @change="choose"
      />
      <AppIcon name="plus" :size="20" /><span>添加图片</span>
    </label>
  </div>
</template>
<style scoped>
.pc-upload {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.pc-upload__item {
  position: relative;
}
.pc-upload__item :deep(.ant-image-img) {
  object-fit: cover;
  border-radius: var(--radius-lg);
}
.pc-upload__remove {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
}
.pc-upload__add {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  width: 96px;
  height: 96px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
  color: var(--ink-muted);
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.pc-upload__add:hover {
  border-color: var(--brand);
  color: var(--brand-text);
}
.pc-upload__add.is-disabled {
  cursor: default;
}
.pc-upload__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.pc-upload__add:focus-within {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
