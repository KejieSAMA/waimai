<script setup lang="ts">
import AppIcon from "./antd/AppIcon.vue";
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
  <div class="pc-pagehead">
    <a-breadcrumb v-if="breadcrumb" class="pc-pagehead__crumbs">
      <a-breadcrumb-item v-for="(item, i) in breadcrumb" :key="i">{{
        item
      }}</a-breadcrumb-item>
    </a-breadcrumb>
    <div class="pc-pagehead__row">
      <div class="pc-pagehead__titles">
        <a-button
          v-if="back"
          type="text"
          shape="circle"
          aria-label="返回"
          @click="emit('back')"
          ><AppIcon name="back"
        /></a-button>
        <h1 class="pc-pagehead__title">{{ title }}</h1>
        <slot name="tag"
          ><a-tag v-if="tag" :bordered="false">{{ tag }}</a-tag></slot
        ><span v-if="subtitle" class="pc-pagehead__sub">{{ subtitle }}</span>
      </div>
      <div v-if="$slots.actions" class="pc-pagehead__actions">
        <a-space wrap><slot name="actions" /></a-space>
      </div>
    </div>
    <div v-if="$slots.default" class="pc-pagehead__extra"><slot /></div>
  </div>
</template>
<style scoped>
.pc-pagehead {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.pc-pagehead__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-width: 0;
}
.pc-pagehead__titles {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.pc-pagehead__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  white-space: nowrap;
}
.pc-pagehead__sub {
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-pagehead__actions {
  flex: none;
}
</style>
