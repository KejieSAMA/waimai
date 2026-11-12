<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import { Button } from "@waimai/ui";
import InfoList from "../../../components/InfoList.vue";
import { phoneTail } from "@waimai/shared";
import { useRouter } from "vue-router";
import { useAuth } from "../../../common/auth";
import { switchDevice } from "../../../common/device";
import { run, busy } from "../../../common/feedback";
const auth = useAuth(),
  router = useRouter();
const role = "MERCHANT" as const;
async function logout() {
  await run(async () => {
    await auth.logout(role);
    await router.push("/merchant/login");
  });
}
</script>
<template>
  <BackofficePage class="app-stack">
    <template #header>
      <div class="bo-page__actions">
        <Button variant="outline" @click="switchDevice(true)">手机版</Button>
      </div>
    </template>
    <section class="app-card app-stack" aria-label="账号信息">
      <h2 class="title-sm">账号信息</h2>
      <InfoList
        :items="[
          { label: '姓名', value: auth.accounts[role]?.name },
          {
            label: '手机号',
            value: phoneTail(auth.accounts[role]?.phone ?? ''),
          },
          { label: '账号身份', value: '商家' },
        ]"
      />
      <div class="app-row">
        <Button variant="danger-outline" :disabled="busy" @click="logout"
          >退出登录</Button
        >
      </div>
    </section>
  </BackofficePage>
</template>
