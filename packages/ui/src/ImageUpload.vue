<script setup lang="ts">
import Icon from "./Icon.vue";
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
  <div class="app-image-upload">
    <div
      v-for="(src, index) in images"
      :key="src"
      class="app-image-upload__item"
    >
      <span class="xz-img"
        ><img :src="src" :alt="'商品图片 ' + (index + 1)"
      /></span>
      <button
        type="button"
        class="app-image-upload__remove"
        :disabled="disabled"
        :aria-label="'移除图片 ' + (index + 1)"
        @click="emit('remove', index)"
      >
        <Icon name="close" :size="16" />
      </button>
    </div>
    <label
      v-if="images.length < max"
      class="app-image-upload__add"
      :class="{ 'is-disabled': disabled }"
    >
      <input
        class="app-image-upload__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        :multiple="max > 1"
        :disabled="disabled"
        aria-label="添加图片"
        @change="choose"
      />
      <Icon name="camera" /><span class="caption">添加图片</span>
    </label>
  </div>
</template>
<style scoped>
.app-image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.app-image-upload__item {
  position: relative;
}
.app-image-upload__add {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  width: var(--size-thumb);
  height: var(--size-thumb);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-md);
  color: var(--ink-muted);
  cursor: pointer;
  overflow: hidden;
}
.app-image-upload__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.app-image-upload__add:focus-within {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.app-image-upload__add.is-disabled {
  background: var(--surface-sunken);
  cursor: default;
}
.app-image-upload__remove {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  display: flex;
  padding: var(--space-1);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-raised);
  color: var(--ink);
  cursor: pointer;
}
</style>
