<script setup lang="ts">
import { Button, Input } from "@waimai/ui";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Role, Account } from "@waimai/shared";
import { useAuth } from "./auth";
import { api } from "./api";
import { run, busy } from "./feedback";
const route = useRoute(),
  router = useRouter(),
  auth = useAuth();
const role = computed(() => route.meta.role as Role);
const phone = ref(
  role.value === "ADMIN"
    ? "admin"
    : role.value === "MERCHANT"
      ? "13800000001"
      : "13900000001",
);
const password = ref(""),
  code = ref(""),
  name = ref(""),
  register = ref(false),
  sent = ref(false);
async function send() {
  await run(async () => {
    await api("/auth/user/code", {
      method: "POST",
      body: { phone: phone.value },
    });
    sent.value = true;
  });
}
async function submit() {
  await run(async () => {
    const path =
      role.value === "USER"
        ? "/auth/user/login"
        : `/auth/${role.value.toLowerCase()}/${register.value ? "register" : "login"}`;
    const session = await api<{ accessToken: string; user: Account }>(path, {
      method: "POST",
      body: {
        phone: phone.value,
        password: password.value,
        code: code.value,
        name: name.value,
      },
    });
    auth.save(role.value, session);
    const redirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/") &&
      !route.query.redirect.startsWith("//")
        ? route.query.redirect
        : role.value === "USER"
          ? "/"
          : role.value === "MERCHANT"
            ? register.value
              ? "/merchant/apply"
              : "/merchant"
            : "/admin";
    await router.push(redirect);
  });
}
</script>
<template>
  <form class="app-login app-card app-stack" @submit.prevent="submit">
    <h1 class="title-lg">
      {{
        role === "USER"
          ? "登录小灶"
          : role === "MERCHANT"
            ? "商家登录"
            : "管理员登录"
      }}
    </h1>
    <Input
      v-model="phone"
      :label="role === 'ADMIN' ? '账号' : '手机号'"
      required
      autocomplete="username"
    /><template v-if="role === 'USER'"
      ><Input
        v-model="code"
        label="验证码"
        required
        inputmode="numeric"
        maxlength="6"
      /><Button variant="outline" :disabled="busy" @click="send"
        >获取验证</Button
      >
      <p v-if="sent" class="body-sm app-muted">
        开发环境验证码为 123456，有效期 5 分钟
      </p></template
    ><Input
      v-else
      v-model="password"
      label="密码"
      type="password"
      autocomplete="current-password"
      required
    /><Input v-if="register" v-model="name" label="负责人" required /><Button
      type="submit"
      block
      :disabled="busy"
      >{{ register ? "注册入驻" : "登录" }}</Button
    ><Button
      v-if="role === 'MERCHANT'"
      variant="text"
      @click="register = !register"
      >{{ register ? "返回登录" : "注册入驻" }}</Button
    >
  </form>
</template>
