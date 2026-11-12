<script setup lang="ts">
import AccountControls from "../../../common/AccountControls.vue";
import { Button } from "@waimai/ui";
import PageHeader from "../../../components/PageHeader.vue";
import InfoList from "../../../components/InfoList.vue";
import { phoneTail } from "@waimai/shared";
import { useRouter } from "vue-router";
import { useAuth } from "../../../common/auth";
import { switchDevice } from "../../../common/device";
import { run, busy } from "../../../common/feedback";
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
    <PageHeader title="账号设置">
      <template #actions
        ><Button variant="outline" @click="switchDevice(true)"
          >手机版</Button
        ></template
      >
    </PageHeader>
    <section class="app-card app-stack" aria-label="账号信息">
      <h2 class="title-sm">账号信息</h2>
      <InfoList
        :items="[
          { label: '昵称', value: auth.accounts[role]?.name },
          {
            label: '手机号',
            value: auth.accounts[role]?.phone
              ? phoneTail(auth.accounts[role]!.phone)
              : '未填写',
          },
          { label: '账号身份', value: '用户' },
        ]"
      />
      <div class="app-row">
        <Button variant="danger-outline" :disabled="busy" @click="logout"
          >退出登录</Button
        >
      </div>
    </section>

    <AccountControls />
  </div>
</template>
