<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import { Button, Dialog, Input, ListCell, ListCellGroup } from "@waimai/ui";
import { useAuth } from "./auth";
import { usePageChrome } from "./pageChrome";
import { profileLeaveDecision, useProfileEditor } from "./profileEditor";
import { accountMePath, identityLabels } from "./accountNavigation";
import PageSlot from "../components/PageSlot.vue";
const auth = useAuth(),
  router = useRouter();
usePageChrome().actions = true;
const revision = auth.revision;
const {
  name,
  phone,
  loading,
  saving,
  loaded,
  error,
  dirty,
  canSave,
  nameError,
  phoneError,
  load,
  save,
} = useProfileEditor({
  read: () => auth.readProfile(),
  save: (data) => auth.updateProfile(data),
});
const leaving = ref(false);
let resolveLeave: ((value: boolean) => void) | undefined;
onBeforeRouteLeave(() => {
  const decision = profileLeaveDecision(
    dirty.value,
    saving.value,
    auth.revision === revision && !!auth.account,
  );
  if (decision === "allow") return true;
  if (decision === "block") return false;
  leaving.value = true;
  return new Promise<boolean>((resolve) => {
    resolveLeave?.(false);
    resolveLeave = resolve;
  });
});
function leave(confirmed: boolean) {
  leaving.value = false;
  resolveLeave?.(confirmed);
  resolveLeave = undefined;
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value && auth.revision === revision && auth.account) {
    event.preventDefault();
    event.returnValue = "";
  }
}
window.addEventListener("beforeunload", beforeUnload);
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
  resolveLeave?.(true);
});
async function submit() {
  if (await save()) await router.replace(accountMePath(auth.activeRole));
}
</script>
<template>
  <div class="app-stack">
    <ListCellGroup title="账号身份"
      ><ListCell title="账号名" :value="auth.account?.username" /><ListCell
        title="授权身份"
        :value="
          auth.account?.roles?.map((role) => identityLabels[role]).join('、')
        "
    /></ListCellGroup>
    <form
      id="account-profile-form"
      class="app-card app-stack"
      :aria-busy="loading || saving"
      @submit.prevent="submit"
    >
      <p v-if="loading" class="body-sm app-muted" role="status">正在加载资料</p>
      <template v-if="loaded">
        <Input
          v-model="name"
          label="昵称"
          required
          maxlength="30"
          autocomplete="nickname"
          :disabled="saving || loading"
          :error="nameError"
        />
        <Input
          v-model="phone"
          label="联系手机"
          type="tel"
          maxlength="11"
          inputmode="tel"
          autocomplete="tel"
          :disabled="saving || loading"
          :error="phoneError"
          placeholder="选填，可留空"
        />
        <p class="body-sm app-muted">
          联系手机不用于登录验证，修改后不会更改收货地址或门店联系电话。
        </p>
      </template>
      <p v-if="error" class="body-sm app-error" role="alert">
        {{ error
        }}<Button
          v-if="!loaded"
          variant="text"
          :disabled="loading"
          @click="load"
          >重试</Button
        >
      </p>
    </form>
    <PageSlot name="actions"
      ><div class="profile-save">
        <Button
          type="submit"
          form="account-profile-form"
          block
          size="lg"
          :disabled="!canSave"
          >{{ saving ? "正在保存" : "保存资料" }}</Button
        >
      </div></PageSlot
    >
    <Dialog
      :open="leaving"
      variant="sheet"
      title="放弃修改"
      @close="leave(false)"
    >
      <p class="body-sm">资料尚未保存，离开后将放弃本次修改。</p>
      <template #actions
        ><Button variant="outline" block @click="leave(false)">继续编辑</Button
        ><Button variant="danger" block @click="leave(true)"
          >放弃修改</Button
        ></template
      >
    </Dialog>
  </div>
</template>
<style scoped>
.profile-save {
  padding: var(--space-2) var(--space-3);
}
:deep(.xz-cell__value) {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
  text-align: right;
}
</style>
