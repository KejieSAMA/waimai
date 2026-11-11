<script setup lang="ts">
import { Icon } from "@waimai/ui";
import type { NavGroup } from "@waimai/ui";
defineProps<{
  role?: string;
  groups: NavGroup[];
  modelValue?: string;
  brand?: string | false;
  subtitle?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <nav
    :class="[
      'xz-sidenav',
      {
        'xz-sidenav--admin': role === 'admin',
        'xz-sidenav--plain': brand === false,
      },
    ]"
    aria-label="主导航"
  >
    <div v-if="brand !== false" class="xz-sidenav__brand">
      <span class="title">{{ brand || "小灶" }}</span
      ><span class="xz-sidenav__sub caption">{{
        subtitle || (role === "admin" ? "运营后台" : "商家中心")
      }}</span>
    </div>
    <div class="xz-sidenav__groups">
      <div v-for="(group, i) in groups" :key="i" class="xz-sidenav__group">
        <div v-if="group.title" class="xz-sidenav__title caption">
          {{ group.title }}
        </div>
        <button
          v-for="it in group.items"
          :key="it.key"
          type="button"
          :class="['xz-sidenav__item', { 'is-active': modelValue === it.key }]"
          :aria-current="modelValue === it.key ? 'page' : undefined"
          @click="emit('update:modelValue', it.key)"
        >
          <Icon v-if="it.icon" :name="it.icon" /><span
            class="xz-sidenav__label body-md"
            >{{ it.label }}</span
          ><span v-if="it.badge" class="xz-sidenav__badge caption">{{
            it.badge
          }}</span>
        </button>
      </div>
    </div>
    <div v-if="$slots.footer" class="xz-sidenav__footer">
      <slot name="footer" />
    </div>
  </nav>
</template>
