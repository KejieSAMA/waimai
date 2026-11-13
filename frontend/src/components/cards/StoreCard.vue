<script setup lang="ts">
// 方案 A 店铺卡片：色块封面（有 Logo 显示 Logo）、店名评分、起送配送信息。
import { computed } from "vue";
import AppIcon from "../antd/AppIcon.vue";
const props = withDefaults(
  defineProps<{
    name: string;
    logo?: string;
    rating?: number | null;
    sales?: string;
    time?: string;
    minOrder?: number;
    deliveryFee?: number;
    tags?: string[];
    status?: "open" | "closed";
    notice?: string;
  }>(),
  { status: "open" },
);
defineEmits<{ click: [] }>();
const initial = computed(() => props.name.slice(0, 1));
</script>
<template>
  <a-card
    :class="['pc-store', { 'is-closed': status === 'closed' }]"
    :bordered="false"
    hoverable
    role="link"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
  >
    <template #cover>
      <div class="pc-store__cover">
        <img v-if="logo" :src="logo" :alt="name" loading="lazy" />
        <span v-else class="pc-store__initial">{{ initial }}</span>
        <a-tag v-if="tags?.[0]" class="pc-store__promo pc-tag-promo">{{
          tags[0]
        }}</a-tag>
        <a-tag v-if="status === 'closed'" class="pc-store__status"
          >休息中</a-tag
        >
      </div>
    </template>
    <div class="pc-store__title">
      <h3 class="pc-store__name" :title="name">{{ name }}</h3>
      <span v-if="rating != null" class="pc-store__rating xz-num">{{
        rating.toFixed(1)
      }}</span>
    </div>
    <div class="pc-store__meta">
      <a-rate
        v-if="rating != null"
        :value="rating"
        disabled
        allow-half
        class="pc-store__rate"
      /><span v-else>暂无评分</span><span v-if="sales">月售 {{ sales }}</span>
    </div>
    <div class="pc-store__meta">
      <span v-if="minOrder != null">起送 ¥{{ minOrder }}</span>
      <span>{{ deliveryFee ? "配送 ¥" + deliveryFee : "免配送费" }}</span>
      <span v-if="time"><AppIcon name="clock" :size="13" /> {{ time }}</span>
    </div>
    <p v-if="notice" class="pc-store__notice" :title="notice">{{ notice }}</p>
  </a-card>
</template>
<style scoped>
.pc-store.ant-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.15s;
}
.pc-store.ant-card:hover,
.pc-store.ant-card:focus-visible {
  box-shadow: inset 0 0 0 1.5px var(--brand);
  outline: none;
}
.pc-store.is-closed {
  opacity: 0.55;
}
.pc-store :deep(.ant-card-body) {
  padding: 14px var(--space-4) var(--space-4);
}
.pc-store__cover {
  position: relative;
  display: grid;
  place-items: center;
  height: 132px;
  background: var(--brand-soft);
  color: var(--brand-text);
}
.pc-store__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pc-store__initial {
  font-size: 48px;
  font-weight: 600;
}
.pc-store__cover :deep(.ant-tag) {
  position: absolute;
  top: 12px;
  margin: 0;
  border: 0;
}
.pc-store__promo {
  left: 12px;
}
.pc-store__status {
  right: 12px;
}
.pc-store__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.pc-store__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-store__rating {
  color: var(--rating);
  font-weight: 600;
}
.pc-store__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 13px;
}
.pc-store__rate {
  font-size: 12px;
  color: var(--rating);
}
.pc-store__rate :deep(.ant-rate-star:not(:last-child)) {
  margin-inline-end: 2px;
}
.pc-store__notice {
  margin: 6px 0 0;
  color: var(--ink-muted);
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
