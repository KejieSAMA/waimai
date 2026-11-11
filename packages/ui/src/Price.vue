<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number;
    original?: number | null;
    size?: "sm" | "md" | "lg";
    tone?: "brand" | "ink" | "chrome" | "on-brand";
  }>(),
  { size: "md", tone: "brand" },
);
const format = (value: number) => Number(value.toFixed(2));
</script>
<template>
  <span :class="['xz-price', 'xz-price--' + tone]"
    ><span
      :class="[
        'xz-price__now',
        { sm: 'price-sm', md: 'price', lg: 'price-lg' }[size],
      ]"
      ><span class="xz-price__sym">¥</span>{{ format(value) }}</span
    ><del v-if="original != null" class="xz-price__orig price-sm"
      >¥{{ format(original) }}</del
    ></span
  >
</template>
