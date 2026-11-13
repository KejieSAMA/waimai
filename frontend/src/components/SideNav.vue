<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref } from "vue";
import { Badge, type ItemType } from "ant-design-vue";
import { ScrollArea, type NavItem } from "@waimai/ui";
import AppIcon from "./antd/AppIcon.vue";
import { sideNavProps } from "./sideNavProps";

const props = defineProps(sideNavProps);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

// 后台侧栏在 1280px 以下收成只显示图标；个人中心侧栏（brand=false）不收起。
const narrow = ref(false);
let media: MediaQueryList | undefined;
const sync = () => (narrow.value = !!media?.matches);
if (typeof window !== "undefined") {
  media = window.matchMedia("(max-width: 1279px)");
  sync();
  media.addEventListener("change", sync);
}
onBeforeUnmount(() => media?.removeEventListener("change", sync));
const collapsed = computed(() => props.brand !== false && narrow.value);

const label = (it: NavItem) =>
  it.badge
    ? h("span", { class: "pc-sidenav__label" }, [
        h("span", it.label),
        h(Badge, {
          count: typeof it.badge === "boolean" ? undefined : it.badge,
          dot: it.badge === true,
          size: "small",
          overflowCount: 99,
        }),
      ])
    : it.label;
const item = (it: NavItem): ItemType => ({
  key: it.key,
  label: label(it),
  title: it.disabled ? "暂未开放" : it.label,
  disabled: it.disabled,
  icon: it.icon ? () => h(AppIcon, { name: it.icon! }) : undefined,
});
const items = computed<ItemType[]>(() =>
  props.groups.flatMap((group, i): ItemType[] =>
    group.title
      ? [
          {
            type: "group",
            key: `group-${i}`,
            label: group.title,
            children: group.items.map(item),
          },
        ]
      : group.items.map(item),
  ),
);
const selected = computed(() => (props.modelValue ? [props.modelValue] : []));
</script>
<template>
  <nav
    :class="[
      'pc-sidenav',
      { 'pc-sidenav--plain': brand === false, 'is-collapsed': collapsed },
    ]"
    aria-label="主导航"
  >
    <div v-if="brand !== false" class="pc-sidenav__brand" :title="brand">
      <span class="pc-sidenav__logo" aria-hidden="true">盟</span>
      <div v-if="!collapsed" class="pc-sidenav__identity">
        <span class="pc-sidenav__name">{{ brand }}</span>
        <span class="pc-sidenav__sub">{{
          subtitle || (role === "admin" ? "运营后台" : "商家中心")
        }}</span>
      </div>
    </div>
    <ScrollArea class="pc-sidenav__scroll" label="导航菜单" contain>
      <a-menu
        mode="inline"
        :inline-collapsed="collapsed"
        :selected-keys="selected"
        :items="items"
        @click="
          ({ key }: { key: string | number }) =>
            emit('update:modelValue', String(key))
        "
      />
    </ScrollArea>
    <div v-if="$slots.footer && !collapsed" class="pc-sidenav__footer">
      <slot name="footer" />
    </div>
  </nav>
</template>
<style scoped>
.pc-sidenav {
  display: flex;
  flex-direction: column;
  width: var(--size-sidebar);
  height: 100%;
  min-height: 0;
  background: var(--surface-raised);
  border-inline-end: 1px solid var(--line);
  transition: width 0.2s;
}
.pc-sidenav.is-collapsed {
  width: var(--size-sidebar-collapsed);
}
.pc-sidenav--plain {
  width: 100%;
  height: auto;
  border: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.pc-sidenav__brand {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--size-topbar);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--line);
}
.is-collapsed .pc-sidenav__brand {
  justify-content: center;
  padding: 0;
}
.pc-sidenav__logo {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  background: var(--brand);
  color: var(--on-brand);
  font-weight: 700;
}
.pc-sidenav__identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pc-sidenav__name,
.pc-sidenav__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-sidenav__name {
  font-weight: 600;
}
.pc-sidenav__sub {
  color: var(--ink-muted);
  font-size: 12px;
}
.pc-sidenav__scroll {
  flex: 1;
  min-height: 0;
}
.pc-sidenav--plain .pc-sidenav__scroll {
  flex: none;
}
.pc-sidenav :deep(.ant-menu) {
  border-inline-end: 0 !important;
  background: transparent;
  padding: var(--space-2);
}
.pc-sidenav :deep(.pc-sidenav__label) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
}
.pc-sidenav__footer {
  flex: none;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--line);
}
</style>
