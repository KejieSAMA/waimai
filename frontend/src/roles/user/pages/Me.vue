<script setup lang="ts">
import { ListCell, ListCellGroup } from "@waimai/ui";
import { useRouter } from "vue-router";
import { useAuth } from "../../../common/auth";
import { switchDevice } from "../../../common/device";
import { run } from "../../../common/feedback";
const auth = useAuth(),
  router = useRouter();
const role = "USER" as const;
async function logout() {
  await run(async () => {
    await auth.logout(role);
    await router.push("/login");
  });
}
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">{{ auth.accounts[role]?.name }}</h1>
    <p class="body-sm app-muted">
      尾号 {{ auth.accounts[role]?.phone.slice(-4) }}
    </p>
    <ListCellGroup
      ><ListCell
        title="我的订单"
        icon="order"
        arrow
        @click="router.push('/orders')" /><ListCell
        title="手机版"
        icon="grid"
        arrow
        @click="switchDevice(true)" /><ListCell
        title="退出登录"
        danger
        arrow
        @click="logout"
    /></ListCellGroup>
    <div class="app-row body-sm">
      <RouterLink to="/">用户首页</RouterLink
      ><RouterLink to="/merchant">商家中心</RouterLink
      ><RouterLink to="/admin">运营后台</RouterLink>
    </div>
  </div>
</template>
