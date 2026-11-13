<script setup lang="ts">
import { Button, Icon } from "@waimai/ui";
import MobilePage from "../components/MobilePage.vue";
import NavBar from "../components/NavBar.vue";
import { useAuth } from "./auth";
const auth = useAuth();
</script>
<template>
  <MobilePage>
    <template #navBar><NavBar title="登录核验" bordered /></template>
    <main class="session-check" :aria-busy="auth.status !== 'error'">
      <Icon name="shield" :size="40" />
      <h1 class="title">
        {{ auth.status === "error" ? "登录状态核验失败" : "正在核验登录状态" }}
      </h1>
      <p v-if="auth.status === 'error'" class="body-sm">
        {{ auth.verificationError }}
      </p>
      <p v-else class="body-sm" role="status" aria-live="polite">请稍候</p>
      <Button v-if="auth.status === 'error'" block @click="auth.refresh()"
        >重试</Button
      >
    </main>
  </MobilePage>
</template>
<style scoped>
.session-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: 28rem;
  margin: 12vh auto 0;
  padding: var(--space-6);
  text-align: center;
  color: var(--ink-muted);
}
.session-check h1 {
  color: var(--ink);
}
</style>
