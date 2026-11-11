<script setup lang="ts">
import { SearchBar, Thumb } from "@waimai/ui";
import SideNav from "./SideNav.vue";
import type { NavGroup } from "@waimai/ui";
defineProps<{
  role: "merchant" | "admin";
  groups: NavGroup[];
  modelValue: string;
  user?: { name: string; role?: string };
  search?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <div :class="['xz-shell', 'xz-desk', 'xz-shell--' + role]">
    <SideNav
      :role="role"
      :groups="groups"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
      ><template #footer><slot name="footer" /></template
    ></SideNav>
    <div class="xz-shell__main">
      <header class="xz-topbar">
        <div class="xz-topbar__left">
          <slot name="topLeft"
            ><SearchBar v-if="search" :placeholder="search"
          /></slot>
        </div>
        <div class="xz-topbar__right">
          <slot name="topRight" /><span v-if="user" class="xz-topbar__user"
            ><Thumb kind="logo" :name="user.name" /><span class="xz-topbar__who"
              ><span class="body-md">{{ user.name }}</span
              ><span class="xz-topbar__role caption">{{
                user.role
              }}</span></span
            ></span
          >
        </div>
      </header>
      <main class="xz-shell__content"><slot /></main>
    </div>
    <slot name="overlay" />
  </div>
</template>
