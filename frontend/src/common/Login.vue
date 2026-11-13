<script setup lang="ts">
import { Button, Input } from "../components/pc";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  useFormFeedback,
  passwordError,
  type FieldErrors,
  clearLoginPassword,
  roleHome,
  type Role,
} from "@waimai/shared";
import { readAccessTarget } from "./authNavigation";
import { useAuth } from "./auth";
import { useFormFocus } from "./formFocus";
const route = useRoute(),
  router = useRouter(),
  auth = useAuth();
const role = computed(() => (route.meta.role as Role) ?? "USER");
const username = ref(""),
  password = ref(""),
  name = ref(""),
  phone = ref(""),
  register = ref(false),
  pending = ref(false),
  error = ref("");
const formElement = ref<HTMLElement>();
const feedback = useFormFeedback(() => {
  const e: FieldErrors = {};
  if (!/^[a-z0-9_-]{3,32}$/.test(username.value.trim().toLowerCase()))
    e.username = "账号须为 3–32 位英文、数字、下划线或连字符";
  if (!password.value) e.password = "请填写密码";
  if (register.value) {
    const p = passwordError(password.value);
    if (p) e.password = p;
    if (!name.value.trim() || name.value.trim().length > 30)
      e.name = "昵称需为 1–30 个字";
    if (phone.value && !/^1[3-9]\d{9}$/.test(phone.value))
      e.phone = "请填写有效手机号，或留空";
  }
  return e;
});
useFormFocus(formElement, feedback);
watch(register, () => feedback.reset());
watch(role, () => {
  password.value = "";
  register.value = false;
  error.value = "";
  feedback.reset();
});
async function submit() {
  if (pending.value || !feedback.check()) return;
  pending.value = true;
  error.value = "";
  try {
    await auth.login(
      register.value
        ? {
            username: username.value,
            password: password.value,
            name: name.value,
            phone: phone.value,
          }
        : {
            username: username.value,
            password: password.value,
            role: role.value,
          },
      register.value,
    );
    password.value = "";
    const target = readAccessTarget(router, route.query.redirect);
    await router.replace(
      auth.account?.mustChangePassword
        ? {
            path: "/password",
            ...(target ? { query: { redirect: target.fullPath } } : {}),
          }
        : (target?.fullPath ?? roleHome(auth.activeRole)),
    );
  } catch (e) {
    feedback.reject(e);
    error.value = e instanceof Error ? e.message : "登录失败";
    if (clearLoginPassword(e)) password.value = "";
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
    @submit.prevent="submit"
  >
    <h1 class="title-lg">
      {{
        register
          ? "注册账号"
          : role === "ADMIN"
            ? "管理员登录"
            : role === "MERCHANT"
              ? "商家登录"
              : "登录盟信"
      }}
    </h1>
    <Input
      v-model="username"
      name="username"
      :error="feedback.field('username')"
      @blur="feedback.blur('username')"
      label="账号"
      autocomplete="username"
      required
      maxlength="32"
      placeholder="英文、数字、下划线或连字符"
      :disabled="pending"
    />
    <Input
      v-model="password"
      name="password"
      :error="feedback.field('password')"
      @blur="feedback.blur('password')"
      label="密码"
      type="password"
      :autocomplete="register ? 'new-password' : 'current-password'"
      required
      :minlength="register ? 8 : undefined"
      :disabled="pending"
    />
    <template v-if="register"
      ><Input
        v-model="name"
        name="name"
        :error="feedback.field('name')"
        @blur="feedback.blur('name')"
        label="昵称"
        required
        maxlength="30"
        :disabled="pending" /><Input
        v-model="phone"
        name="phone"
        :error="feedback.field('phone')"
        @blur="feedback.blur('phone')"
        label="联系手机"
        inputmode="tel"
        maxlength="11"
        placeholder="选填"
        :disabled="pending"
    /></template>
    <p v-if="error" class="body-sm app-error" role="alert">{{ error }}</p>
    <Button type="submit" block :disabled="pending">{{
      pending ? "处理中" : register ? "注册账号" : "登录"
    }}</Button>
    <Button
      v-if="role === 'USER'"
      variant="text"
      :disabled="pending"
      @click="
        register = !register;
        error = '';
        password = '';
      "
      >{{ register ? "返回登录" : "注册账号" }}</Button
    >
    <p class="body-sm app-muted">
      忘记密码请联系管理员。商家身份由管理员授权。
    </p>
  </form>
</template>
