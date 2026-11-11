<script setup lang="ts">
import { Icon, ScrollArea } from "@waimai/ui";
import { sideNavProps } from "./sideNavProps";
defineProps(sideNavProps);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <nav
    :class="[
      'xz-sidenav',
      {
        'xz-sidenav--admin': role === 'admin',
        'xz-sidenav--plain': brand === false,
        'bo-sidenav': brand !== false,
      },
    ]"
    aria-label="主导航"
  >
    <div
      v-if="brand !== false"
      class="xz-sidenav__brand bo-sidenav__brand"
      :title="brand"
    >
      <span class="xz-logo bo-sidenav__logo title" aria-hidden="true">盟</span>
      <div class="bo-sidenav__identity">
        <span class="title-sm">{{ brand }}</span
        ><span class="xz-sidenav__sub caption">{{
          subtitle || (role === "admin" ? "运营后台" : "商家中心")
        }}</span>
      </div>
    </div>
    <ScrollArea class="bo-sidenav__scroll" label="导航菜单" contain>
      <div class="xz-sidenav__groups">
        <div v-for="(group, i) in groups" :key="i" class="xz-sidenav__group">
          <div v-if="group.title" class="xz-sidenav__title caption">
            {{ group.title }}
          </div>
          <button
            v-for="it in group.items"
            :key="it.key"
            type="button"
            :disabled="it.disabled"
            :title="it.disabled ? '暂未开放' : it.label"
            :class="[
              'xz-sidenav__item',
              { 'is-active': modelValue === it.key },
            ]"
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
    </ScrollArea>
    <div v-if="$slots.footer" class="xz-sidenav__footer">
      <slot name="footer" />
    </div>
  </nav>
</template>
<style scoped>
.xz-sidenav__item:disabled {
  color: var(--ink-muted);
  cursor: default;
}
.xz-sidenav--admin {
  --scrollbar-ink: var(--on-chrome-muted);
}
.bo-sidenav {
  border-radius: 0;
  overflow: hidden;
}
.bo-sidenav__brand {
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-3);
}
.bo-sidenav__logo {
  width: var(--size-button-md);
  height: var(--size-button-md);
  flex: none;
}
.bo-sidenav__identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: var(--space-1);
}
.bo-sidenav__identity > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bo-sidenav__scroll {
  flex: 1;
  min-height: 0;
}
.xz-sidenav__footer {
  flex: none;
}
@media (max-width: 1279px) {
  .bo-sidenav__identity {
    display: none;
  }
  .xz-shell .bo-sidenav__brand {
    padding: 0;
  }
}
</style>
