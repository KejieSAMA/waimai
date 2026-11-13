<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Dialog, Icon } from "@waimai/ui";
import { identityLabels, roleHome, useAccessRecovery } from "@waimai/shared";
import MobilePage from "../components/MobilePage.vue";
import NavBar from "../components/NavBar.vue";
import { useAuth } from "./auth";
import { readAccessTarget } from "./authNavigation";
const auth = useAuth(),
  router = useRouter(),
  route = useRoute();
const target = computed(() => readAccessTarget(router, route.query.redirect));
const { pending, error, canSwitch, switchIdentity, changeAccount } =
  useAccessRecovery(auth, target, (to) => router.replace(to));
const logoutOpen = ref(false);
const description = computed(() =>
  canSwitch.value
    ? `访问“${target.value?.title}”需要${identityLabels[target.value!.role!]}身份，切换后将继续访问原页面。`
    : `当前账号没有“${target.value?.title ?? "此页面"}”的访问权限。如需访问，请联系管理员授权。`,
);
</script>
<template>
  <MobilePage>
    <template #navBar
      ><NavBar
        title="访问权限"
        bordered
        back
        :tone="auth.activeRole === 'ADMIN' ? 'admin' : 'light'"
        @back="!pending && router.replace(roleHome(auth.activeRole))"
    /></template>
    <main class="access-result">
      <Icon name="shield" :size="40" />
      <h1 class="title-lg">
        {{ canSwitch ? "需要切换身份" : "暂无访问权限" }}
      </h1>
      <p class="body-sm access-result__description">{{ description }}</p>
      <div
        v-if="auth.account && auth.activeRole"
        class="access-result__context body-sm"
      >
        <p>当前账号：{{ auth.account.username }}</p>
        <p>当前身份：{{ identityLabels[auth.activeRole] }}</p>
        <p v-if="target?.role">所需身份：{{ identityLabels[target.role] }}</p>
      </div>
      <div class="access-result__actions">
        <Button
          v-if="canSwitch"
          block
          :disabled="pending"
          @click="switchIdentity"
          >{{ pending ? "正在切换" : "切换身份" }}</Button
        >
        <Button
          block
          :variant="canSwitch ? 'outline' : 'primary'"
          :disabled="pending"
          @click="router.replace(roleHome(auth.activeRole))"
          >返回首页</Button
        >
        <Button
          v-if="!canSwitch"
          block
          variant="outline"
          :disabled="pending"
          @click="
            logoutOpen = true;
            error = '';
          "
          >更换账号</Button
        >
      </div>
      <p v-if="error && !logoutOpen" class="body-sm app-error" role="alert">
        {{ error }}
      </p>
    </main>
    <Dialog
      :open="logoutOpen"
      title="更换账号"
      variant="sheet"
      :close-disabled="pending"
      @close="logoutOpen = false"
    >
      <p class="body-sm">退出当前账号，使用有权限的账号登录后继续访问。</p>
      <p v-if="error" class="body-sm app-error" role="alert">{{ error }}</p>
      <template #actions
        ><Button
          block
          variant="outline"
          :disabled="pending"
          @click="logoutOpen = false"
          >保留登录</Button
        ><Button block :disabled="pending" @click="changeAccount">{{
          pending ? "正在退出" : "更换账号"
        }}</Button></template
      >
    </Dialog>
  </MobilePage>
</template>
<style scoped>
.access-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: 28rem;
  margin: var(--space-6) auto;
  padding: var(--space-6) var(--space-4);
  text-align: center;
}
.access-result > svg,
.access-result__description,
.access-result__context {
  color: var(--ink-muted);
}
.access-result__context {
  display: grid;
  gap: var(--space-1);
}
.access-result__actions {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-2);
}
</style>
