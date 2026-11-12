<script setup lang="ts">
import AccountControls from "../../../common/AccountControls.vue";
import { useTheme } from "@waimai/tokens";
import { ListCell, ListCellGroup } from "@waimai/ui";
import { useRouter } from "vue-router";
import { useAuth } from "../../../common/auth";
import { switchDevice } from "../../../common/device";
import { run } from "../../../common/feedback";
const { toggle } = useTheme();
const auth = useAuth(),
  router = useRouter();
const role = "ADMIN" as const;
async function logout() {
  await run(async () => {
    await auth.logout(role);
    await router.push("/admin/login");
  });
}
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">{{ auth.accounts[role]?.name }}</h1>
    <p class="body-sm app-muted">
      尾号 {{ auth.accounts[role]?.phone?.slice(-4) }}
    </p>
    <ListCellGroup
      ><ListCell
        title="退款纠纷"
        icon="alert"
        arrow
        @click="router.push('/admin/disputes')" /><ListCell
        title="账号管理"
        icon="user"
        arrow
        @click="router.push('/admin/accounts')" /><ListCell
        title="类目管理"
        icon="grid"
        arrow
        @click="router.push('/admin/categories')" /><ListCell
        title="切换主题"
        icon="sun"
        arrow
        @click="toggle" /><ListCell
        title="电脑版"
        icon="grid"
        arrow
        @click="switchDevice(false)" /><ListCell
        title="退出登录"
        danger
        arrow
        @click="logout"
    /></ListCellGroup>

    <AccountControls />
  </div>
</template>
