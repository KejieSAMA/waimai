<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import { ref, watch } from "vue";
import Button from "../antd/PcButton.vue";
import Dialog from "../antd/PcDialog.vue";
import Icon from "../antd/AppIcon.vue";
import Input from "../antd/PcInput.vue";
const props = defineProps<{
  title: string;
  hasImage: boolean;
  expires: string;
  editable?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  fieldName?: string;
  fieldError?: string;
}>();
const emit = defineEmits<{
  select: [file: File];
  remove: [];
  "update:expires": [value: string];
}>();
const fileInput = ref<HTMLInputElement>();
const previewOpen = ref(false),
  error = ref("");
watch(
  () => props.hasImage,
  (hasImage) => {
    if (!hasImage) previewOpen.value = false;
  },
);
function select(file?: File) {
  if (!file || !props.editable || props.disabled || props.uploading) return;
  error.value = "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    error.value = "请选择 JPG、PNG 或 WebP 图片";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = "单张图片不能超过 5MB";
    return;
  }
  emit("select", file);
}
function choose(event: Event) {
  const input = event.target as HTMLInputElement;
  select(input.files?.[0]);
  input.value = "";
}
function remove() {
  error.value = "";
  emit("remove");
  emit("update:expires", "");
}
</script>
<template>
  <section
    class="qualification-card"
    :aria-label="title"
    :aria-busy="uploading"
  >
    <header class="qualification-card__head">
      <h3 class="title-sm">{{ title }}</h3>
      <span class="caption qualification-card__optional">{{
        editable ? "选填" : hasImage ? "已提供" : "未提供"
      }}</span>
    </header>
    <input
      v-if="editable"
      ref="fileInput"
      type="file"
      hidden
      accept="image/jpeg,image/png,image/webp"
      :disabled="disabled || uploading"
      :aria-label="'上传' + title"
      @change="choose"
    />
    <div v-if="hasImage" class="qualification-card__preview">
      <slot name="preview" />
    </div>
    <button
      v-else-if="editable"
      type="button"
      class="qualification-card__upload"
      :disabled="disabled || uploading"
      :aria-label="'上传' + title"
      @click="fileInput?.click()"
      @dragover.prevent
      @drop.prevent="select($event.dataTransfer?.files[0])"
    >
      <Icon name="camera" />
      <span class="title-sm">{{
        uploading ? "上传中" : "点击或拖拽上传"
      }}</span>
      <span class="caption">清晰完整的证照照片</span>
    </button>
    <div v-else class="qualification-card__empty body-sm">
      <Icon name="camera" /><span>未提供{{ title }}</span>
    </div>
    <div v-if="hasImage" class="qualification-card__actions">
      <Button variant="outline" size="sm" @click="previewOpen = true"
        >查看大图</Button
      >
      <template v-if="editable">
        <Button
          variant="text"
          size="sm"
          :disabled="disabled || uploading"
          @click="fileInput?.click()"
          >{{ uploading ? "上传中" : "更换图片" }}</Button
        >
        <Button
          variant="text"
          size="sm"
          :disabled="disabled || uploading"
          @click="remove"
          >移除</Button
        >
      </template>
    </div>
    <p v-if="error" class="qualification-card__error body-sm" role="alert">
      {{ error }}
    </p>
    <Input
      v-if="editable"
      :model-value="expires"
      :name="fieldName"
      :error="fieldError"
      :disabled="disabled || uploading || !hasImage"
      type="date"
      label="有效期至（选填）"
      hint="长期有效可留空"
      @update:model-value="emit('update:expires', $event)"
    />
    <p v-else-if="hasImage" class="qualification-card__date body-sm">
      有效期至 {{ expires || "未填写" }}
    </p>
    <Dialog
      :open="previewOpen && hasImage"
      :title="title"
      @close="previewOpen = false"
      ><div class="qualification-card__large"><slot name="preview" /></div
    ></Dialog>
  </section>
</template>
<style scoped>
.qualification-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}
.qualification-card__head,
.qualification-card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.qualification-card__head h3 {
  margin: 0;
}
.qualification-card__optional {
  margin-left: auto;
  color: var(--ink-muted);
}
.qualification-card__upload,
.qualification-card__preview,
.qualification-card__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: calc(var(--size-thumb) * 2);
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
  color: var(--ink-muted);
}
.qualification-card__upload {
  border: 1px dashed var(--line-strong);
  cursor: pointer;
  padding: var(--space-3);
}
.qualification-card__upload:not(:disabled):hover {
  background: var(--surface-hover);
  border-color: var(--brand-text);
}
.qualification-card__upload:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.qualification-card__upload:disabled {
  cursor: default;
}
.qualification-card__preview :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-lg);
}
.qualification-card__large :deep(img) {
  display: block;
  max-width: 100%;
  max-height: 65dvh;
  margin: auto;
  object-fit: contain;
}
.qualification-card__picker {
  width: 100%;
}
.qualification-card__date {
  margin: 0;
  color: var(--ink-muted);
}
.qualification-card__error {
  margin: 0;
  color: var(--danger);
}
</style>
