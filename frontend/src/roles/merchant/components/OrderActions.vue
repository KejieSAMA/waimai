<script setup lang="ts">
import { Button } from "../../../components/pc";
import type { Order } from "@waimai/shared";
defineProps<{ order: Order; disabled?: boolean }>();
const emit = defineEmits<{ act: [id: string, action: string] }>();
</script>
<template>
  <template v-if="order.status === 'PENDING'"
    ><Button
      size="sm"
      variant="danger-text"
      :disabled="disabled"
      @click="emit('act', order.id, 'reject')"
      >拒单</Button
    ><Button
      size="sm"
      :disabled="disabled"
      @click="emit('act', order.id, 'accept')"
      >接单</Button
    ></template
  >
  <Button
    v-if="order.status === 'PREPARING'"
    size="sm"
    :disabled="disabled"
    @click="emit('act', order.id, 'ready')"
    >出餐完成</Button
  >
  <template v-if="order.status === 'REFUNDING'"
    ><span v-if="order.disputed" class="body-sm app-muted">平台处理中</span
    ><template v-else
      ><Button
        size="sm"
        variant="danger-text"
        :disabled="disabled"
        @click="emit('act', order.id, 'refund-reject')"
        >拒绝退款</Button
      ><Button
        size="sm"
        :disabled="disabled"
        @click="emit('act', order.id, 'refund-approve')"
        >同意退款</Button
      ></template
    ></template
  >
</template>
