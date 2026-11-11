<script setup lang="ts">
defineProps<{ name: "extra" | "right" | "actions" | "overlay" }>();
</script>
<template>
  <Teleport defer :to="'#mobile-page-' + name"><slot /></Teleport>
</template>
