<script setup lang="ts">
import { money } from "@waimai/shared";
import { Icon, Price } from "@waimai/ui";
defineProps<{
  count: number;
  total?: number;
  deliveryFee?: number;
  minOrder?: number;
  label?: string;
  disabled?: boolean;
  updating?: boolean;
  error?: string;
  loggedIn?: boolean;
  shortfall?: number;
  checkoutAllowed?: boolean;
  pickup?: boolean;
}>();
const emit = defineEmits<{ checkout: []; open: [] }>();
</script>
<template>
  <div class="xz-cartbar">
    <button
      type="button"
      aria-label="查看本店购物车"
      class="app-cart-toggle"
      :class="['xz-cartbar__icon', { 'is-empty': !count }]"
      @click="emit('open')"
    >
      <Icon name="cart" :size="26" /><span
        v-if="count"
        class="xz-cartbar__badge caption"
        >{{ count }}</span
      >
    </button>
    <div class="xz-cartbar__info">
      <Price v-if="total != null" :value="total" tone="chrome" /><span
        v-else
        class="xz-cartbar__empty body-sm"
        >{{
          !count
            ? "未选购商品"
            : !loggedIn
              ? "登录后查看金额"
              : updating
                ? "更新金额中"
                : error
                  ? "金额计算失败"
                  : "等待计算金额"
        }}</span
      ><span class="xz-cartbar__sub caption" role="status">{{
        updating
          ? "金额更新中"
          : error
            ? "金额需重新计算"
            : deliveryFee == null
              ? !loggedIn && minOrder && !pickup
                ? money(minOrder) + " 起送"
                : "\u00a0"
              : deliveryFee === 0
                ? "免配送费"
                : "配送 " + money(deliveryFee * 100)
      }}</span>
    </div>
    <button
      type="button"
      class="xz-cartbar__go title-sm"
      :disabled="
        disabled ||
        !count ||
        (loggedIn && (updating || !!error || checkoutAllowed === false))
      "
      @click="emit('checkout')"
    >
      {{
        !count && minOrder && !pickup
          ? money(minOrder) + " 起送"
          : shortfall && loggedIn
            ? "差 " + money(shortfall) + " 起送"
            : label || "去结算"
      }}
    </button>
  </div>
</template>

<style scoped>
.xz-cartbar__sub {
  display: block;
  min-height: 1.5em;
}
.app-cart-toggle {
  border: 0;
  padding: 0;
  flex: none;
  cursor: pointer;
}
</style>
