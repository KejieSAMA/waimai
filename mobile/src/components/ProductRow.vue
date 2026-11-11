<script setup lang="ts">
import { Button, Price, Switch, Tag, Thumb } from "@waimai/ui";
import { productStatuses } from "@waimai/shared";
import type { ProductStatus } from "@waimai/shared";
const props = defineProps<{
  name: string;
  price: number;
  status: ProductStatus;
  image?: string;
  stock?: number;
  lowStock?: number;
  reason?: string;
  locked?: boolean;
}>();
const emit = defineEmits<{ toggle: [value: boolean]; edit: [] }>();
</script>
<template>
  <div class="xz-product">
    <div class="xz-product__main">
      <Thumb :src="image" :name="name" />
      <div class="xz-product__info">
        <div class="xz-product__top">
          <span class="xz-product__name title-sm">{{ name }}</span
          ><Tag :tone="productStatuses[status].tone">{{
            productStatuses[status].label
          }}</Tag>
        </div>
        <div class="xz-product__meta body-sm">
          <span :class="{ 'is-low': stock != null && stock <= (lowStock ?? 5) }"
            >库存 {{ stock }}</span
          >
        </div>
        <Price :value="price" />
      </div>
    </div>
    <div v-if="reason" class="xz-product__reason body-sm">{{ reason }}</div>
    <div class="xz-product__actions">
      <Switch
        label="上架"
        :model-value="['ON', 'SOLDOUT'].includes(props.status)"
        :disabled="locked || ['REVIEW', 'REJECTED'].includes(status)"
        @update:model-value="emit('toggle', $event)"
      />
      <div class="xz-product__btns">
        <Button size="sm" variant="text" icon="edit" @click="emit('edit')"
          >编辑</Button
        >
      </div>
    </div>
  </div>
</template>
