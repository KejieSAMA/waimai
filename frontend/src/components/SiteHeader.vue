<script setup lang="ts">
import { Button, Icon, SearchBar } from "@waimai/ui";
defineProps<{
  location?: string;
  user?: { name: string };
  modelValue?: string;
  search?: string;
  cartCount?: number;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:search": [value: string];
  login: [];
  search: [];
  cart: [];
}>();
</script>
<template>
  <header class="xz-site">
    <div class="xz-site__inner">
      <span class="xz-site__brand title-lg">小灶</span
      ><span class="xz-site__place body-md"
        ><Icon name="location" :size="18" />{{ location || "望京 SOHO" }}</span
      ><SearchBar
        :model-value="search"
        tone="brand"
        placeholder="搜索店铺、菜品"
        action="搜索"
        class="xz-site__search"
        @update:model-value="emit('update:search', $event)"
        @action="emit('search')"
      />
      <nav class="xz-site__links" aria-label="网站导航">
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
