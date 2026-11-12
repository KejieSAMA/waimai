<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@waimai/ui";
import { roleHome, type Role } from "@waimai/shared";
import { useRouter } from "vue-router";
import { useAuth } from "./auth";
const auth = useAuth(),
  router = useRouter();
const pending = ref(false),
  error = ref("");
const labels: Record<Role, string> = {
  USER: "用户中心",
  MERCHANT: "商家中心",
  ADMIN: "管理后台",
};
async function switchTo(role: Role) {
  if (pending.value) return;
  pending.value = true;
  error.value = "";
  try {
    await auth.switchRole(role);
    await router.replace(roleHome(role));
  } catch (e) {
    error.value = e instanceof Error ? e.message : "切换失败";
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <section class="app-card app-stack" aria-label="账号安全与身份">
    <p class="body-sm">账号 {{ auth.account?.username }}</p>
    <div class="app-row">
      <Button
        variant="outline"
        :disabled="pending"
        @click="router.push('/password')"
        >修改密码</Button
      >
      <template v-for="role in auth.account?.roles ?? []" :key="role"
        ><Button
          v-if="role !== auth.activeRole"
          variant="secondary"
          :disabled="pending"
          @click="switchTo(role)"
          >{{ labels[role] }}</Button
        ></template
      >
      <Button
        v-if="auth.activeRole"
        variant="outline"
        :disabled="pending"
        @click="router.push(roleHome(auth.activeRole))"
        >返回首页</Button
      >
    </div>
    <p v-if="error" class="body-sm app-error" role="alert">{{ error }}</p>
  </section>
</template>
