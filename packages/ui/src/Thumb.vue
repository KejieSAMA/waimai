<script setup lang="ts">
import Icon from "./Icon.vue";
withDefaults(
  defineProps<{
    kind?: "dish" | "logo";
    src?: string;
    name?: string;
    size?: "md" | "lg";
  }>(),
  { kind: "dish", size: "md", name: "" },
);
</script>
<template>
  <span
    :class="[
      kind === 'logo' ? 'xz-logo' : 'xz-img xz-img--sm',
      'xz-thumb',
      'xz-thumb--' + size,
    ]"
    ><img v-if="src" :src="src" :alt="name" loading="lazy" /><span
      v-else-if="kind === 'logo'"
      class="title"
      >{{ name.slice(0, 1) }}</span
    ><Icon v-else name="bowl" :size="24"
  /></span>
</template>
