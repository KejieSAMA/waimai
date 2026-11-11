<script setup lang="ts">
import { SearchBar, Thumb, Icon } from "@waimai/ui";
import SideNav from "./SideNav.vue";
import type { NavGroup } from "@waimai/ui";
defineProps<{
  role: "merchant" | "admin";
  groups: NavGroup[];
  modelValue: string;
  user?: { name: string; role?: string };
  search?: string;
  notices?: number;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  notices: [];
}>();
</script>
<template>
  <div :class="['xz-shell', 'xz-desk', 'xz-shell--' + role]">
    <SideNav
      :role="role"
      :brand="role === 'merchant' ? '盟信商家后台' : '盟信管理后台'"
      :subtitle="user?.name"
      :groups="groups"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
      ><template v-if="$slots.footer" #footer><slot name="footer" /></template
    ></SideNav>
    <div class="xz-shell__main">
      <header class="xz-topbar">
        <div class="xz-topbar__left">
          <slot name="topLeft"
            ><SearchBar v-if="search" :placeholder="search"
          /></slot>
        </div>
        <div class="xz-topbar__right">
          <slot name="topRight" /><button
            type="button"
            class="xz-nav__icon"
            aria-label="查看待办消息"
            @click="emit('notices')"
          >
            <Icon name="bell" :size="22" /><span
              v-if="notices"
              class="xz-nav__badge caption"
              >{{ notices }}</span
            ></button
          ><span v-if="user" class="xz-topbar__user"
            ><Thumb
              class="xz-topbar__avatar"
              kind="logo"
              :name="user.name"
            /><span class="xz-topbar__who"
              ><span class="body-md">{{ user.name }}</span
              ><span class="xz-topbar__role caption">{{
                user.role
              }}</span></span
            ></span
          >
        </div>
      </header>
      <main class="bo-shell-content"><slot /></main>
    </div>
    <slot name="overlay" />
  </div>
</template>

<style scoped>
.bo-shell-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  padding: var(--space-6);
  overflow: hidden;
}
</style>
