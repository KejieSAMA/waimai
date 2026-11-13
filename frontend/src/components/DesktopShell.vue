<script setup lang="ts">
import SideNav from "./SideNav.vue";
import AppIcon from "./antd/AppIcon.vue";
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
  <div :class="['pc-shell', 'pc-shell--' + role]">
    <SideNav
      :role="role"
      :brand="role === 'merchant' ? '盟信商家后台' : '盟信管理后台'"
      :subtitle="user?.name"
      :groups="groups"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
      ><template v-if="$slots.footer" #footer><slot name="footer" /></template
    ></SideNav>
    <div class="pc-shell__main">
      <header class="pc-topbar">
        <div class="pc-topbar__left">
          <slot name="topLeft"
            ><a-input-search
              v-if="search"
              :placeholder="search"
              class="pc-topbar__search"
          /></slot>
        </div>
        <div class="pc-topbar__right">
          <slot name="topRight" />
          <a-badge :count="notices" :overflow-count="99" size="small">
            <a-button
              type="text"
              shape="circle"
              aria-label="查看待办消息"
              @click="emit('notices')"
              ><AppIcon name="bell" :size="18"
            /></a-button>
          </a-badge>
          <span v-if="user" class="pc-topbar__user">
            <a-avatar shape="square" class="pc-topbar__avatar">{{
              user.name.slice(0, 1)
            }}</a-avatar>
            <span class="pc-topbar__who">
              <span class="pc-topbar__name">{{ user.name }}</span>
              <span class="pc-topbar__role">{{ user.role }}</span>
            </span>
          </span>
        </div>
      </header>
      <main class="bo-shell-content"><slot /></main>
    </div>
    <slot name="overlay" />
  </div>
</template>

<style scoped>
.pc-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--surface);
  color: var(--ink);
}
.pc-shell__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.pc-topbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: var(--size-topbar);
  padding: 0 var(--space-6);
  background: var(--surface-raised);
  border-bottom: 1px solid var(--line);
}
.pc-topbar__left {
  flex: 1;
  min-width: 0;
}
.pc-topbar__search {
  max-width: 360px;
}
.pc-topbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.pc-topbar__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pc-topbar__avatar {
  background: var(--brand-soft);
  color: var(--brand-text);
}
.pc-topbar__who {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.pc-topbar__role {
  color: var(--ink-muted);
  font-size: 12px;
}
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
