<script setup lang="ts">
import { computed, ref } from "vue";
import Select from "./Select.vue";
const props = defineProps<{
  pages: {
    name: string;
    label: string;
    path: string;
    light: string;
    dark: string;
  }[];
}>();
const selected = ref(props.pages[0]?.name ?? "");
const current = computed(() =>
  props.pages.find((page) => page.name === selected.value),
);
</script>
<template>
  <section class="app-design-references">
    <h2 class="title">页面设计对照</h2>
    <p class="body-sm app-muted">
      先选择设计页，再前往对应业务页面人工对照。业务数据以实际接口为准，需要登录对应角色。
    </p>
    <Select
      v-model="selected"
      label="设计页面"
      :options="pages.map((page) => ({ value: page.name, label: page.label }))"
    />
    <template v-if="current"
      ><a class="body" :href="current.path" target="_blank" rel="noopener"
        >前往{{ current.label }}</a
      >
      <div class="app-design-references__images">
        <figure>
          <figcaption class="body-sm">浅色设计稿</figcaption>
          <img
            :src="current.light"
            :alt="current.label + '浅色设计稿'"
            loading="lazy"
          />
        </figure>
        <figure>
          <figcaption class="body-sm">深色设计稿</figcaption>
          <img
            :src="current.dark"
            :alt="current.label + '深色设计稿'"
            loading="lazy"
          />
        </figure>
      </div>
    </template>
  </section>
</template>
<style scoped>
.app-design-references {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.app-design-references__images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  align-items: start;
}
figure {
  min-width: 0;
  margin: 0;
}
img {
  display: block;
  width: 100%;
  height: auto;
}
figcaption {
  margin-bottom: var(--space-2);
  color: var(--ink-muted);
}
</style>
