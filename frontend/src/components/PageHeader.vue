<script setup lang="ts">
import { Button } from "@waimai/ui";
defineProps<{
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  tag?: string;
  back?: boolean;
}>();
const emit = defineEmits<{ back: [] }>();
</script>
<template>
  <div class="xz-pagehead">
    <div v-if="breadcrumb" class="xz-pagehead__crumbs caption">
      <template v-for="(item, i) in breadcrumb" :key="i"
        ><span v-if="i" aria-hidden="true">/</span
        ><span :class="{ 'is-current': i === breadcrumb.length - 1 }">{{
          item
        }}</span></template
      >
    </div>
    <div class="xz-pagehead__row">
      <div class="xz-pagehead__titles">
        <Button
          v-if="back"
          icon="back"
          variant="text"
          aria-label="返回"
          @click="emit('back')"
        />
        <h1 class="xz-pagehead__title title-lg">{{ title }}</h1>
        <slot name="tag">{{ tag }}</slot
        ><span v-if="subtitle" class="xz-pagehead__sub body-md">{{
          subtitle
        }}</span>
      </div>
      <div v-if="$slots.actions" class="xz-pagehead__actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.default" class="xz-pagehead__extra"><slot /></div>
  </div>
</template>
