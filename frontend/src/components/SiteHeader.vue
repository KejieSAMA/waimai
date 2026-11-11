<script setup lang="ts">
import { Button, Icon } from "@waimai/ui";
import { useTheme } from "@waimai/tokens";
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
}>();
const { theme, toggle } = useTheme();
</script>
<template>
  <header class="xz-site">
    <div class="xz-site__inner">
      <span class="xz-site__brand title-lg">盟信</span
      ><span class="xz-site__place body-md"
        ><Icon name="location" :size="18" />{{ location || "望京 SOHO" }}</span
      >
      <nav class="xz-site__links" aria-label="网站导航">
        <button
          type="button"
          class="xz-site__link xz-site__theme"
          aria-label="切换主题"
          :aria-pressed="theme === 'dark'"
          :title="theme === 'light' ? '切换深色主题' : '切换浅色主题'"
          @click="toggle"
        >
          <Icon :name="theme === 'light' ? 'sun' : 'moon'" :size="20" />
        </button>
        <button
          v-for="it in [
            { key: '/', label: '首页' },
            { key: '/orders', label: '我的订单' },
          ]"
          :key="it.key"
          type="button"
          :class="[
            'xz-site__link',
            'body-md',
            { 'is-active': modelValue === it.key },
          ]"
          @click="emit('update:modelValue', it.key)"
        >
          {{ it.label }}
        </button>
      </nav>
      <button
        type="button"
        class="xz-site__cart"
        aria-label="购物车"
        @click="emit('cart')"
      >
        <Icon name="cart" :size="22" /><span
          v-if="cartCount"
          class="xz-site__badge caption"
          >{{ cartCount }}</span
        ></button
      ><span v-if="user" class="xz-site__user body-md">{{ user.name }}</span
      ><Button v-else variant="secondary" size="sm" @click="emit('login')"
        >登录</Button
      >
    </div>
  </header>
</template>
<style scoped>
.xz-site__theme {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--size-button-md);
  padding: 0;
}
</style>
