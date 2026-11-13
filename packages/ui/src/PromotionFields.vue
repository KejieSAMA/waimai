<script setup lang="ts">
import Button from "./Button.vue";
import Input from "./Input.vue";
defineProps<{
  rules: { threshold: string; discount: string }[];
  disabled?: boolean;
  fieldError?: (name: string) => string;
}>();
defineEmits<{
  blur: [name: string];
  add: [];
  remove: [index: number];
  update: [index: number, field: "threshold" | "discount", value: string];
}>();
</script>
<template>
  <div class="promotion-fields">
    <p class="body-sm">多档满减不叠加，取优惠最大的一档；配送与自提均适用。</p>
    <p v-if="!rules.length" class="body-sm app-muted">
      未设置满减，保存空列表将取消全部满减。
    </p>
    <div
      v-for="(row, index) in rules"
      :key="index"
      class="promotion-fields__row"
    >
      <Input
        :name="`rules.${index}.threshold`"
        :error="fieldError?.(`rules.${index}.threshold`)"
        @blur="$emit('blur', `rules.${index}.threshold`)"
        :model-value="row.threshold"
        :label="'第 ' + (index + 1) + ' 档门槛'"
        prefix="¥"
        inputmode="decimal"
        :disabled="disabled"
        @update:model-value="$emit('update', index, 'threshold', $event)"
      />
      <Input
        :name="`rules.${index}.discount`"
        :error="fieldError?.(`rules.${index}.discount`)"
        @blur="$emit('blur', `rules.${index}.discount`)"
        :model-value="row.discount"
        label="优惠金额"
        prefix="¥"
        inputmode="decimal"
        :disabled="disabled"
        @update:model-value="$emit('update', index, 'discount', $event)"
      />
      <Button
        variant="text"
        size="sm"
        :disabled="disabled"
        :aria-label="'移除第 ' + (index + 1) + ' 档'"
        @click="$emit('remove', index)"
        >移除</Button
      >
    </div>
    <Button
      variant="outline"
      icon="plus"
      :disabled="disabled || rules.length >= 10"
      @click="$emit('add')"
      >添加档位</Button
    >
  </div>
</template>
<style scoped>
.promotion-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.promotion-fields p {
  margin: 0;
}
.promotion-fields__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: var(--space-3);
  align-items: end;
}
</style>
