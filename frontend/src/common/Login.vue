<script setup lang="ts">
import { Button, Input } from "../components/pc";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { roleHome, type Role } from "@waimai/shared";
import { useAuth } from "./auth";
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
watch(role, () => {
  password.value = "";
  register.value = false;
  error.value = "";
});
async function submit() {
  if (pending.value) return;
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
    const target = route.query.redirect;
    const valid =
      typeof target === "string" &&
      target.startsWith("/") &&
      !target.startsWith("//") &&
      !target.includes("\\") &&
      (auth.activeRole === "USER"
        ? !/^\/(admin|merchant)(\/|$)/.test(target)
        : target.startsWith("/" + auth.activeRole?.toLowerCase() + "/"));
    await router.push(
      auth.account?.mustChangePassword
        ? "/password"
        : valid
          ? target
          : roleHome(auth.activeRole),
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "登录失败";
  } finally {
    pending.value = false;
    password.value = "";
  }
}
</script>
<template>
  <form class="app-login app-card app-stack" @submit.prevent="submit">
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
      label="账号"
      autocomplete="username"
      required
      maxlength="32"
      placeholder="英文、数字、下划线或连字符"
      :disabled="pending"
    />
    <Input
      v-model="password"
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
        label="昵称"
        required
        maxlength="30"
        :disabled="pending" /><Input
        v-model="phone"
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
