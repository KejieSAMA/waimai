<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LockOutlined } from "@ant-design/icons-vue";
import { identityLabels, roleHome, useAccessRecovery } from "@waimai/shared";
import AccessFrame from "./AccessFrame.vue";
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
  <AccessFrame>
    <a-result :title="canSwitch ? '需要切换身份' : '暂无访问权限'">
      <template #icon><LockOutlined /></template>
      <template #subTitle>
        <p>{{ description }}</p>
        <div
          class="access-context body-sm"
          v-if="auth.account && auth.activeRole"
        >
          <span>当前账号：{{ auth.account.username }}</span>
          <span>当前身份：{{ identityLabels[auth.activeRole] }}</span>
          <span v-if="target?.role"
            >所需身份：{{ identityLabels[target.role] }}</span
          >
        </div>
      </template>
      <template #extra>
        <div class="access-actions">
          <a-button
            v-if="canSwitch"
            type="primary"
            :loading="pending"
            :disabled="pending"
            @click="switchIdentity"
            >切换身份</a-button
          >
          <a-button
            :type="canSwitch ? 'default' : 'primary'"
            :disabled="pending"
            @click="router.replace(roleHome(auth.activeRole))"
            >返回首页</a-button
          >
          <a-button
            v-if="!canSwitch"
            :disabled="pending"
            @click="
              logoutOpen = true;
              error = '';
            "
            >更换账号</a-button
          >
        </div>
        <p v-if="error && !logoutOpen" class="app-error body-sm" role="alert">
          {{ error }}
        </p>
      </template>
    </a-result>
    <a-modal
      :open="logoutOpen"
      title="更换账号"
      centered
      :closable="!pending"
      :mask-closable="!pending"
      :keyboard="!pending"
      @cancel="logoutOpen = false"
    >
      <p class="body-md">退出当前账号，使用有权限的账号登录后继续访问。</p>
      <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      <template #footer
        ><a-button :disabled="pending" @click="logoutOpen = false"
          >保留登录</a-button
        ><a-button
          type="primary"
          :loading="pending"
          :disabled="pending"
          @click="changeAccount"
          >更换账号</a-button
        ></template
      >
    </a-modal>
  </AccessFrame>
</template>
<style scoped>
.access-context {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  color: var(--ink-muted);
  margin-top: var(--space-4);
}
.access-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
</style>
