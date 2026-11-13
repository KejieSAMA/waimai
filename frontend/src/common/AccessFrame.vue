<script setup lang="ts">
import { useTheme } from "@waimai/tokens";
import { identityLabels } from "@waimai/shared";
import { ScrollArea } from "@waimai/ui";
import AppIcon from "../components/antd/AppIcon.vue";
import { useAuth } from "./auth";
const auth = useAuth();
const { theme, toggle } = useTheme();
</script>
<template>
  <div class="access-frame">
    <header class="access-frame__header">
      <div class="access-frame__brand title">
        <span class="access-frame__mark">盟</span>盟信
      </div>
      <div class="access-frame__account">
        <span
          v-if="
            auth.status === 'authenticated' && auth.account && auth.activeRole
          "
          class="body-sm"
          >{{ auth.account.username }} ·
          {{ identityLabels[auth.activeRole] }}</span
        >
        <a-button type="text" aria-label="切换主题" @click="toggle"
          ><AppIcon :name="theme === 'light' ? 'moon' : 'sun'" :size="18"
        /></a-button>
      </div>
    </header>
    <ScrollArea class="access-frame__body" label="权限页面">
      <main class="access-frame__main"><slot /></main>
    </ScrollArea>
  </div>
</template>
<style scoped>
.access-frame {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--ink);
}
.access-frame__header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--line);
  background: var(--surface-raised);
}
.access-frame__brand,
.access-frame__account {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.access-frame__mark {
  display: grid;
  place-items: center;
  width: var(--size-button-sm);
  height: var(--size-button-sm);
  border-radius: var(--radius-md);
  background: var(--brand);
  color: var(--on-brand);
}
.access-frame__account > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-muted);
}
.access-frame__body {
  flex: 1;
  min-height: 0;
}
.access-frame__main {
  display: grid;
  align-items: start;
  justify-items: center;
  padding: clamp(var(--space-6), 12vh, 8rem) var(--space-4) var(--space-6);
}
.access-frame__main :deep(.ant-result) {
  width: 100%;
  max-width: 42rem;
  padding: var(--space-6) var(--space-4);
}
.access-frame__main :deep(.ant-result-icon .anticon) {
  color: var(--ink-muted);
  font-size: var(--size-button-lg);
}
</style>
