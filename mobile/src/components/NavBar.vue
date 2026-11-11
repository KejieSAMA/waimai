<script setup lang="ts">
import NavBarIcon from "./NavBarIcon.vue";
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    tone?: "light" | "brand" | "admin";
    align?: string;
    back?: boolean;
    bordered?: boolean;
  }>(),
  { tone: "light", bordered: true },
);
const emit = defineEmits<{ back: [] }>();
</script>
<template>
  <header
    :class="[
      'xz-nav',
      'xz-nav--' + tone,
      { 'xz-nav--bordered': bordered && tone === 'light' },
    ]"
  >
    <div :class="['xz-nav__bar', { 'xz-nav__bar--left': align === 'left' }]">
      <div class="xz-nav__left">
        <NavBarIcon
          v-if="back"
          name="back"
          label="返回"
          @click="emit('back')"
        /><slot v-else name="left" />
      </div>
      <div class="xz-nav__title">
        <span :class="align === 'left' ? 'title-lg' : 'title'">{{ title }}</span
        ><span v-if="subtitle" class="xz-nav__sub caption">{{ subtitle }}</span>
      </div>
      <div class="xz-nav__right"><slot name="right" /></div>
    </div>
    <div v-if="$slots.default" class="xz-nav__extra"><slot /></div>
  </header>
</template>
