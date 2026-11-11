<script setup lang="ts">
import { computed } from "vue";
import { normItems, type NavItem } from "./types";
import { useValue } from "./useValue";
import ScrollArea from "./ScrollArea.vue";
const props = withDefaults(
  defineProps<{
    items: (string | NavItem)[];
    modelValue?: string;
    defaultValue?: string;
    variant?: "line" | "chip";
  }>(),
  { variant: "line" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const options = computed(() => normItems(props.items));
const value = useValue(
  () => props.modelValue,
  props.defaultValue ?? options.value[0]?.key ?? "",
  (v) => emit("update:modelValue", v),
);
</script>
<template>
  <ScrollArea
    as="nav"
    class="xz-catnav"
    aria-label="菜品分类"
    label="菜品分类"
    contain
  >
    <button
      v-for="it in options"
      :key="it.key"
      type="button"
      :class="['xz-catnav__item', 'body-sm', { 'is-active': value === it.key }]"
      :aria-current="value === it.key ? 'true' : undefined"
      @click="value = it.key"
    >
      {{ it.label
      }}<span v-if="it.count" class="xz-catnav__count caption">{{
        it.count
      }}</span>
    </button>
  </ScrollArea>
</template>
