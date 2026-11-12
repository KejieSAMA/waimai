<script setup lang="ts">
import { ref } from "vue";
import { Button, Input } from "@waimai/ui";
import { useRouter } from "vue-router";
import { useAuth } from "./auth";
import { accountLoginPath } from "./accountNavigation";
import { usePageChrome } from "./pageChrome";
usePageChrome();
const auth = useAuth(),
  router = useRouter();
const oldPassword = ref(""),
  password = ref(""),
  confirm = ref(""),
  error = ref(""),
  pending = ref(false);
async function save() {
  if (pending.value) return;
  if (password.value !== confirm.value) {
    error.value = "两次新密码不一致";
    return;
  }
  pending.value = true;
  error.value = "";
  const role = auth.activeRole;
  try {
    await auth.changePassword(oldPassword.value, password.value);
    await router.replace(accountLoginPath(role));
  } catch (e) {
    error.value = e instanceof Error ? e.message : "修改失败";
  } finally {
    pending.value = false;
    oldPassword.value = "";
    password.value = "";
    confirm.value = "";
  }
}
async function logout() {
  if (pending.value) return;
  const role = auth.activeRole;
  pending.value = true;
  error.value = "";
  try {
    await auth.logout();
    await router.replace(accountLoginPath(role));
  } catch (e) {
    error.value = e instanceof Error ? e.message : "退出失败";
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <form class="app-login app-card app-stack" @submit.prevent="save">
    <h1 class="title-lg">修改密码</h1>
    <p v-if="auth.account?.mustChangePassword" class="body-sm">
      首次登录或密码已重置，请先设置新密码。
    </p>
    <Input
      v-model="oldPassword"
      label="原密码"
      type="password"
      autocomplete="current-password"
      required
      :disabled="pending"
    />
    <Input
      v-model="password"
      label="新密码"
      type="password"
      autocomplete="new-password"
      minlength="8"
      required
      :disabled="pending"
      hint="至少 8 个字符，不超过 72 字节"
    />
    <Input
      v-model="confirm"
      label="再次输入"
      type="password"
      autocomplete="new-password"
      required
      :disabled="pending"
    />
    <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
    <Button type="submit" :disabled="pending">保存密码</Button>
    <Button variant="outline" :disabled="pending" @click="logout"
      >退出登录</Button
    >
  </form>
</template>
