<script setup lang="ts">
import { useTheme } from "@waimai/tokens";
import { message, messageTone } from "./common/feedback";
import AppShell from "./common/AppShell.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "./common/auth";
import { accountRouteDecision, type Role } from "@waimai/shared";
import SessionScreen from "./common/SessionScreen.vue";
const auth = useAuth(),
  route = useRoute();
const sessionBlocked = computed(
  () =>
    !route.matched.length ||
    ["unknown", "checking", "error"].includes(auth.status) ||
    accountRouteDecision(
      {
        path: route.path,
        fullPath: route.fullPath,
        protected: route.meta.protected === true,
        role: route.meta.role as Role | undefined,
      },
      auth.account,
      auth.activeRole,
    ) !== true,
);
useTheme();
</script>
<template>
  <SessionScreen v-if="sessionBlocked" />
  <AppShell v-else />
  <div
    v-if="message"
    class="app-feedback body-sm"
    :class="messageTone === 'error' ? 'app-error' : 'app-success'"
    role="alert"
  >
    {{ message }}
    <button type="button" aria-label="关闭提示" @click="message = ''">
      关闭
    </button>
  </div>
</template>
