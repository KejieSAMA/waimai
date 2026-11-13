<script setup lang="ts">
// 店铺页双列菜品卡（同原项目 DishCard grid）：图、名称、描述、月售、价格与步进。
import { Price, type TagItem } from "@waimai/ui";
import AppIcon from "../antd/AppIcon.vue";
import QtyStepper from "./QtyStepper.vue";
import { tagColor } from "../antd/mapping";
defineProps<{
  name: string;
  price: number;
  original?: number | null;
  image?: string;
  desc?: string;
  sales?: string;
  tags?: (string | TagItem)[];
  soldOut?: boolean;
  disabled?: boolean;
  modelValue?: number;
  max?: number;
}>();
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
</script>
<template>
  <article :class="['pc-dish', { 'is-soldout': soldOut }]">
    <span class="pc-dish__img">
      <img v-if="image" :src="image" :alt="name" loading="lazy" />
      <AppIcon v-else name="bowl" :size="32" />
    </span>
    <div class="pc-dish__body">
      <h3 class="pc-dish__name" :title="name">{{ name }}</h3>
      <p v-if="desc" class="pc-dish__desc" :title="desc">{{ desc }}</p>
      <p v-if="sales" class="pc-dish__desc">月售 {{ sales }}</p>
      <div v-if="tags?.length" class="pc-dish__tags">
        <a-tag
          v-for="(t, i) in tags"
          :key="i"
          :bordered="false"
          :class="{ 'pc-tag-promo': typeof t === 'string' }"
          :color="typeof t === 'string' ? undefined : tagColor(t.tone)"
          >{{ typeof t === "string" ? t : t.label }}</a-tag
        >
      </div>
      <div class="pc-dish__foot">
        <Price :value="price" :original="original" />
        <a-tag v-if="soldOut" color="warning" :bordered="false">已售罄</a-tag>
        <QtyStepper
          v-else
          :name="name"
          :model-value="modelValue ?? 0"
          :max="max"
          :disabled="disabled"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </div>
    </div>
  </article>
</template>
<style scoped>
.pc-dish {
  display: flex;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  box-shadow: var(--shadow-card);
}
.pc-dish__img {
  flex: none;
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--brand-soft);
  color: var(--brand-text);
}
.pc-dish__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.is-soldout .pc-dish__img,
.is-soldout .pc-dish__name {
  opacity: 0.5;
}
.pc-dish__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pc-dish__name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-dish__desc {
  margin: 0;
  color: var(--ink-muted);
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-dish__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.pc-dish__tags :deep(.ant-tag) {
  margin: 0;
}
.pc-dish__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-1);
}
</style>
