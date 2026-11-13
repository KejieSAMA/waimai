<script setup lang="ts">
import PcField from "../antd/PcField.vue";
import AppIcon from "../antd/AppIcon.vue";
defineProps<{
  rules: { threshold: string; discount: string }[];
  disabled?: boolean;
}>();
defineEmits<{
  add: [];
  remove: [index: number];
  update: [index: number, field: "threshold" | "discount", value: string];
}>();
</script>
<template>
  <div class="pc-promotions">
    <a-alert
      type="info"
      show-icon
      message="多档满减不叠加，取优惠最大的一档；配送与自提均适用。"
    />
    <p v-if="!rules.length" class="pc-promotions__muted">
      未设置满减，保存空列表将取消全部满减。
    </p>
    <div v-for="(row, index) in rules" :key="index" class="pc-promotions__row">
      <PcField :label="'第 ' + (index + 1) + ' 档门槛'">
        <a-input
          :value="row.threshold"
          prefix="¥"
          inputmode="decimal"
          :disabled="disabled"
          @update:value="$emit('update', index, 'threshold', $event)"
        />
      </PcField>
      <PcField label="优惠金额">
        <a-input
          :value="row.discount"
          prefix="¥"
          inputmode="decimal"
          :disabled="disabled"
          @update:value="$emit('update', index, 'discount', $event)"
        />
      </PcField>
      <a-button
        type="link"
        danger
        :disabled="disabled"
        :aria-label="'移除第 ' + (index + 1) + ' 档'"
        @click="$emit('remove', index)"
        >移除</a-button
      >
    </div>
    <div>
      <a-button
        type="dashed"
        :disabled="disabled || rules.length >= 10"
        @click="$emit('add')"
        ><template #icon><AppIcon name="plus" /></template>添加档位</a-button
      >
    </div>
  </div>
</template>
<style scoped>
.pc-promotions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.pc-promotions__muted {
  margin: 0;
  color: var(--ink-muted);
}
.pc-promotions__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  align-items: end;
  gap: var(--space-3);
}
</style>
