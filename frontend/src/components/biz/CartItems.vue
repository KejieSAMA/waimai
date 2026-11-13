<script setup lang="ts">
// PC 版：逻辑与 @waimai/ui 同名组件一致，控件换成 antd 适配组件。
import type { CartLine, Product, Quote } from "@waimai/shared";
import CheckoutItem from "./CheckoutItem.vue";
defineProps<{
  lines: CartLine[];
  quote: Quote | null;
  disabled?: boolean;
  productFor?: (line: CartLine) => Product;
  itemIssue?: (line: CartLine) => string;
}>();
const emit = defineEmits<{
  quantity: [change: { product: Product; qty: number }];
}>();
const max = (product: Product) =>
  Math.min(999, product.stock, product.limitPerOrder ?? 999);
</script>
<template>
  <div>
    <CheckoutItem
      v-for="line in lines"
      :key="line.product.id"
      :product="productFor?.(line) ?? line.product"
      :qty="line.qty"
      :quoted="quote?.items.find((item) => item.productId === line.product.id)"
      :max="max(productFor?.(line) ?? line.product)"
      :issue="itemIssue?.(line)"
      :disabled="disabled"
      @quantity="
        emit('quantity', {
          product: productFor?.(line) ?? line.product,
          qty: $event,
        })
      "
    />
    <p v-if="!lines.length" class="body-sm">本店还没有选购商品</p>
  </div>
</template>
