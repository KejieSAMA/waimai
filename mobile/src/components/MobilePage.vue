<script setup lang="ts">
defineProps<{ bottomTone?: "raised" | "clear"; statusBar?: string | false }>();
</script>
<template>
  <div class="xz-page">
    <slot name="navBar" />
    <div class="xz-page__body"><slot /></div>
    <div
      v-if="$slots.bottom"
      :class="[
        'xz-page__bottom',
        { 'xz-page__bottom--clear': bottomTone === 'clear' },
      ]"
    >
      <slot name="bottom" />
    </div>
    <div class="xz-page__safe" />
    <slot name="overlay" />
  </div>
</template>
