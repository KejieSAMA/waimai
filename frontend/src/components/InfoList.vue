<script setup lang="ts">
defineProps<{ items: { label: string; value: unknown }[]; columns?: 1 | 2 }>();
</script>
<template>
  <dl :class="['xz-info', { 'xz-info--2': columns === 2 }]">
    <div v-for="(it, i) in items" :key="i" class="xz-info__row">
      <dt class="xz-info__label body-md">{{ it.label }}</dt>
      <dd class="xz-info__value body-md">{{ it.value }}</dd>
    </div>
  </dl>
</template>
