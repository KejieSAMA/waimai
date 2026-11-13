<script setup lang="ts">
import Button from "./Button.vue";
defineProps<{
  loading: boolean;
  loaded: boolean;
  error?: string;
  count: number;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <p v-if="error" class="list-status body-sm" role="alert">
    {{ error
    }}<Button variant="text" :disabled="loading" @click="$emit('retry')"
      >重试</Button
    >
  </p>
  <p v-else-if="loading" class="body-sm" role="status">
    {{ loaded ? "正在更新" : "正在加载" }}
  </p>
  <p v-else-if="loaded && count === 0" class="body-sm">暂无数据</p>
</template>
<style scoped>
.list-status {
  color: var(--danger);
}
</style>
