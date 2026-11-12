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
      {{
        auth.account?.phone
          ? "尾号 " + auth.account.phone.slice(-4)
          : "未填写联系手机"
      }}
    </p>
    <ListCellGroup
      ><ListCell
        title="我的订单"
        icon="order"
        arrow
        @click="router.push('/orders')" /><ListCell
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
