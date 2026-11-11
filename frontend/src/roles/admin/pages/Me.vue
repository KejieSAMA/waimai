<script setup lang="ts">
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
          { label: '姓名', value: auth.accounts[role]?.name },
          {
            label: '手机号',
            value: phoneTail(auth.accounts[role]?.phone ?? ''),
          },
          { label: '账号身份', value: '管理员' },
        ]"
      />
      <div class="app-row">
        <Button variant="danger-outline" :disabled="busy" @click="logout"
          >退出登录</Button
        >
      </div>
    </section>
  </div>
</template>
