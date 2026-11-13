<script setup lang="ts">
// 方案 A 顶栏：左（Logo + 地址）/ 中（导航）/ 右（主题、购物车、账号）三区网格，
// 左右两区等宽，地址文字长短不会推动中间的导航。
import { useTheme } from "@waimai/tokens";
import AppIcon from "./antd/AppIcon.vue";
defineProps<{
  location?: string;
  user?: { name: string };
  modelValue?: string;
  cartCount?: number;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  login: [];
  cart: [];
  account: [];
  address: [];
}>();
const { theme, toggle } = useTheme();
const links = [
  { key: "/", label: "首页" },
  { key: "/orders", label: "我的订单" },
];
</script>
<template>
  <header class="pc-site">
    <div class="pc-site__inner">
      <div class="pc-site__left">
        <a
          class="pc-site__logo"
          href="/"
          aria-label="盟信首页"
          @click.prevent="emit('update:modelValue', '/')"
          ><span class="pc-site__mark" aria-hidden="true">盟</span
          ><span class="pc-site__brand">盟信外卖</span></a
        >
        <button
          type="button"
          class="pc-site__btn pc-site__addr"
          :title="location || '选择收货地址'"
          @click="emit('address')"
        >
          <AppIcon name="location" /><span class="pc-site__addr-text">{{
            location || "选择收货地址"
          }}</span>
        </button>
      </div>
      <nav class="pc-site__nav" aria-label="网站导航">
        <a
          v-for="it in links"
          :key="it.key"
          :href="it.key"
          :class="{ 'is-active': modelValue === it.key }"
          :aria-current="modelValue === it.key ? 'page' : undefined"
          @click.prevent="emit('update:modelValue', it.key)"
          >{{ it.label }}</a
        >
      </nav>
      <div class="pc-site__right">
        <a-tooltip :title="theme === 'light' ? '切换深色主题' : '切换浅色主题'">
          <button
            type="button"
            class="pc-site__btn pc-site__icon"
            aria-label="切换主题"
            :aria-pressed="theme === 'dark'"
            @click="toggle"
          >
            <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" :size="18" />
          </button>
        </a-tooltip>
        <a-badge :count="cartCount" :offset="[-4, 4]" size="small">
          <button
            type="button"
            class="pc-site__btn pc-site__icon"
            aria-label="购物车"
            @click="emit('cart')"
          >
            <AppIcon name="cart" :size="18" />
          </button>
        </a-badge>
        <button
          v-if="user"
          type="button"
          :class="[
            'pc-site__btn',
            'pc-site__user',
            { 'is-active': modelValue === '/me' },
          ]"
          :aria-current="modelValue === '/me' ? 'page' : undefined"
          aria-label="账号设置"
          @click="emit('account')"
        >
          <a-avatar :size="28" class="pc-site__avatar">{{
            user.name.slice(0, 1)
          }}</a-avatar
          ><span class="pc-site__user-name">{{ user.name }}</span>
        </button>
        <a-button v-else type="primary" @click="emit('login')">登录</a-button>
      </div>
    </div>
  </header>
</template>
<style scoped>
.pc-site {
  flex: none;
  background: var(--surface-raised);
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}
.pc-site__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-6);
  max-width: var(--size-content);
  height: 64px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}
.pc-site__left,
.pc-site__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}
.pc-site__right {
  justify-self: end;
  gap: var(--space-2);
}
.pc-site__logo {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: inherit;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.pc-site__mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  background: var(--brand);
  color: var(--on-brand);
  font-size: 16px;
}
.pc-site__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  border-radius: var(--radius-lg);
}
.pc-site__btn:hover {
  background: var(--surface-hover);
}
.pc-site__btn:focus-visible,
.pc-site__nav a:focus-visible,
.pc-site__logo:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.pc-site__addr {
  min-width: 0;
  padding: 6px var(--space-2);
  color: var(--ink-muted);
}
.pc-site__addr-text {
  max-width: 12em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pc-site__icon {
  justify-content: center;
  width: 36px;
  height: 36px;
}
.pc-site__nav {
  display: flex;
  gap: var(--space-2);
}
.pc-site__nav a {
  padding: 6px var(--space-3);
  color: var(--ink-muted);
}
.pc-site__nav a:hover {
  color: var(--ink);
}
.pc-site__nav a.is-active {
  color: var(--brand-text);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 currentColor;
}
.pc-site__user {
  height: 36px;
  padding: 0 var(--space-2) 0 var(--space-1);
  gap: var(--space-2);
}
.pc-site__user.is-active {
  color: var(--brand-text);
}
.pc-site__avatar {
  background: var(--brand-soft);
  color: var(--brand-text);
}
.pc-site__user-name {
  max-width: 8em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
