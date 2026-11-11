<script setup lang="ts">
import Icon from "./Icon.vue";
import Tag from "./Tag.vue";
import Price from "./Price.vue";
import Stepper from "./Stepper.vue";
import type { TagItem } from "./types";
withDefaults(
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
    count?: number;
    modelValue?: number;
    max?: number;
    layout?: "row" | "grid";
  }>(),
  { layout: "row" },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
</script>
<template>
  <div
    :class="[
      'xz-dish',
      { 'xz-dish--grid': layout === 'grid', 'is-soldout': soldOut },
    ]"
  >
    <span class="xz-img"
      ><img v-if="image" :src="image" :alt="name" loading="lazy" /><Icon
        v-else
        name="bowl"
        :size="32"
    /></span>
    <div class="xz-dish__main">
      <div class="xz-dish__name title-sm">{{ name }}</div>
      <div v-if="desc && layout !== 'grid'" class="xz-dish__desc body-sm">
        {{ desc }}
      </div>
      <div v-if="sales" class="xz-dish__sales caption">月售 {{ sales }}</div>
      <div v-if="tags?.length" class="xz-dish__tags">
        <Tag
          v-for="(t, i) in tags"
          :key="i"
          :tone="typeof t === 'string' ? 'brand' : t.tone"
          >{{ typeof t === "string" ? t : t.label }}</Tag
        >
      </div>
      <div class="xz-dish__foot">
        <Price :value="price" :original="original" /><Tag
          v-if="soldOut"
          tone="warning"
          >已售罄</Tag
        ><Stepper
          v-else
          :model-value="modelValue"
          :default-value="count || 0"
          :max="max"
          :disabled="disabled"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </div>
    </div>
  </div>
</template>
