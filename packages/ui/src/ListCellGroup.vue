<script setup lang="ts">
defineProps<{ title?: string }>();
</script>
<template>
  <div class="xz-cellgroup">
    <div v-if="title" class="xz-cellgroup__title body-sm">{{ title }}</div>
    <slot />
  </div>
</template>
