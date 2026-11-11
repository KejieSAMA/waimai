<script setup lang="ts">
import Icon from "./Icon.vue";
import Tag from "./Tag.vue";
import type { TagItem } from "./types";
withDefaults(
  defineProps<{
    name: string;
    logo?: string;
    rating?: number;
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
      <div class="xz-store__name title-sm">{{ name }}</div>
      <div class="xz-store__row body-sm">
        <span v-if="rating != null" class="xz-store__rating"
          ><Icon name="star" :size="13" />{{ rating }}分</span
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
      <div class="xz-store__tags">
        <template v-if="status === 'closed'"
          ><Tag>休息中</Tag
          ><span class="xz-store__notice body-sm">{{ notice }}</span></template
        ><template v-else
          ><Tag
            v-for="(t, i) in tags"
            :key="i"
            :tone="typeof t === 'string' ? 'brand' : t.tone"
            :variant="typeof t === 'string' ? 'outline' : t.variant"
            >{{ typeof t === "string" ? t : t.label }}</Tag
          ></template
        >
      </div>
    </div>
  </div>
</template>
