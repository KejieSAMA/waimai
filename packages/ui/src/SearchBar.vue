<script setup lang="ts">
import Icon from "./Icon.vue";
withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    tone?: string;
    action?: string;
  }>(),
  { placeholder: "搜索" },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  action: [];
}>();
</script>
<template>
  <div
    :class="['xz-search', { 'xz-search--brand': tone === 'brand' }]"
    role="search"
  >
    <label class="xz-search__box"
      ><Icon name="search" :size="18" /><input
        class="xz-search__input body-sm"
        type="search"
        :value="modelValue"
        :placeholder="placeholder"
        :aria-label="placeholder"
        @input="
          emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
        @keydown.enter="emit('action')" /></label
    ><button
      v-if="action"
      type="button"
      class="xz-search__action title-sm"
      @click="emit('action')"
    >
      {{ action }}
    </button>
  </div>
</template>
