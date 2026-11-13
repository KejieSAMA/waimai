<script setup lang="ts">
import { ref } from "vue";
import { Button, Input } from "../components/pc";
import { useRoute, useRouter } from "vue-router";
import { readAccessTarget } from "./authNavigation";
import { accountLoginPath as loginPath } from "@waimai/shared";
import { useAuth } from "./auth";
import { useFormFeedback, passwordError } from "@waimai/shared";
import { useFormFocus } from "./formFocus";
const auth = useAuth(),
  router = useRouter(),
  route = useRoute();
const oldPassword = ref(""),
  password = ref(""),
  confirm = ref(""),
  error = ref(""),
  pending = ref(false);
const formElement = ref<HTMLElement>();
const feedback = useFormFeedback(() => ({
  ...(!oldPassword.value ? { oldPassword: "请填写原密码" } : {}),
  ...(passwordError(password.value)
    ? { password: passwordError(password.value) }
    : {}),
  ...(password.value !== confirm.value ? { confirm: "两次新密码不一致" } : {}),
}));
useFormFocus(formElement, feedback);
async function save() {
  if (pending.value || !feedback.check()) return;
  if (password.value !== confirm.value) {
    error.value = "两次新密码不一致";
    return;
  }
  pending.value = true;
  error.value = "";
  const role = auth.activeRole;
  try {
    const target = readAccessTarget(router, route.query.redirect);
    await auth.changePassword(oldPassword.value, password.value);
    oldPassword.value = password.value = confirm.value = "";
    await router.replace({
      path: loginPath(role),
      ...(target ? { query: { redirect: target.fullPath } } : {}),
    });
  } catch (e) {
    feedback.reject(e, { newPassword: "password" });
    error.value = e instanceof Error ? e.message : "修改失败";
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <form
    ref="formElement"
    novalidate
    class="app-login app-card app-stack"
    @submit.prevent="save"
  >
    <h1 class="title-lg">修改密码</h1>
    <p v-if="auth.account?.mustChangePassword" class="body-sm">
      首次登录或密码已重置，请先设置新密码。
    </p>
    <Input
      v-model="oldPassword"
      name="oldPassword"
      :error="feedback.field('oldPassword')"
      @blur="feedback.blur('oldPassword')"
      label="原密码"
      type="password"
      autocomplete="current-password"
      required
      :disabled="pending"
    />
    <Input
      v-model="password"
      name="password"
      :error="feedback.field('password')"
      @blur="feedback.blur('password')"
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
      name="confirm"
      :error="feedback.field('confirm')"
      @blur="feedback.blur('confirm')"
      label="再次输入"
      type="password"
      autocomplete="new-password"
      required
      :disabled="pending"
    />
    <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
    <Button type="submit" :disabled="pending">保存密码</Button>
    <Button
      variant="outline"
      :disabled="pending"
      @click="auth.logout().then(() => router.replace('/login'))"
      >退出登录</Button
    >
  </form>
</template>
