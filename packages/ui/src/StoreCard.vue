<script setup lang="ts">
import Icon from "./Icon.vue";
import type { TagItem } from "./types";
withDefaults(
  defineProps<{
    name: string;
    logo?: string;
    rating?: number | null;
    sales?: string;
    time?: string;
    distance?: string;
    minOrder?: number;
    deliveryFee?: number;
    tags?: (string | TagItem)[];
    status?: "open" | "closed";
    notice?: string;
  }>(),
  { status: "open" },
);
</script>
<template>
  <div
    :class="['xz-store', { 'is-closed': status === 'closed' }]"
    role="link"
    tabindex="0"
    @keydown.enter="($event.currentTarget as HTMLElement).click()"
  >
    <span class="xz-logo"
      ><img v-if="logo" :src="logo" :alt="name" loading="lazy" /><span
        v-else
        class="title-lg"
        >{{ name.slice(0, 1) }}</span
      ></span
    >
    <div class="xz-store__main">
      <div class="xz-store__name title-sm">
        <span class="xz-store__title">{{ name }}</span>
        <span v-if="status === 'closed'" class="xz-store__closed body-sm"
          >休息中</span
        >
      </div>
      <div class="xz-store__row body-sm">
        <span v-if="rating != null" class="xz-store__rating"
          ><Icon name="star" :size="13" />{{ rating.toFixed(1) }}分</span
        ><span v-else class="body-sm">暂无评分</span
        ><span v-if="sales">月售 {{ sales }}</span
        ><span class="xz-store__spacer">{{
          [time, distance].filter(Boolean).join(" · ")
        }}</span>
      </div>
      <div class="xz-store__row body-sm">
        <span v-if="minOrder != null">起送 ¥{{ minOrder }}</span
        ><span class="xz-dot">·</span
        ><span>{{
          deliveryFee === 0 ? "免配送费" : "配送 ¥" + deliveryFee
        }}</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.xz-store {
  align-items: center;
}
.xz-store.is-closed .xz-logo {
  background: var(--surface-sunken);
  color: var(--ink-muted);
  filter: grayscale(1);
}
.xz-store__name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.xz-store__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.xz-store__closed {
  flex: none;
  color: var(--ink-muted);
}
</style>
