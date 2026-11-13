<script setup lang="ts">
import { SafetyCertificateOutlined } from "@ant-design/icons-vue";
import AccessFrame from "./AccessFrame.vue";
import { useAuth } from "./auth";
const auth = useAuth();
</script>
<template>
  <AccessFrame>
    <a-result
      v-if="auth.status === 'error'"
      title="登录状态核验失败"
      :sub-title="auth.verificationError"
    >
      <template #icon><SafetyCertificateOutlined /></template>
      <template #extra
        ><a-button type="primary" @click="auth.refresh()"
          >重试</a-button
        ></template
      >
    </a-result>
    <div
      v-else
      class="session-check"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <a-spin />
      <p class="body-md">正在核验登录状态</p>
    </div>
  </AccessFrame>
</template>
<style scoped>
.session-check {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  color: var(--ink-muted);
}
</style>
