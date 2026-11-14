<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Button, Dialog, Input, ListCell, ListCellGroup } from "@waimai/ui";
import { useAuth } from "./auth";
import { usePageChrome } from "./pageChrome";
import { useProfileEditor } from "./profileEditor";
import { accountMePath, identityLabels } from "./accountNavigation";
import PageSlot from "../components/PageSlot.vue";
import { useDraftLeave } from "./draftLeave";
import { useFormFocus } from "./formFocus";
const auth = useAuth(),
  router = useRouter();
usePageChrome().actions = true;

const {
  name,
  phone,
  loading,
  saving,
  loaded,
  error,
  dirty,
  canSave,
  feedback,
  load,
  save,
} = useProfileEditor({
  read: () => auth.readProfile(),
  save: (data) => auth.updateProfile(data),
});
const { open: leaving, choose: leave } = useDraftLeave(
  () => dirty.value,
  () => saving.value,
);
const formElement = ref<HTMLElement>();
useFormFocus(formElement, feedback);
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
      ref="formElement"
      novalidate
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
          :error="feedback.field('name')"
          name="name"
          @blur="feedback.blur('name')"
        />
        <Input
          v-model="phone"
          label="联系手机"
          type="tel"
          maxlength="11"
          inputmode="tel"
          autocomplete="tel"
          :disabled="saving || loading"
          :error="feedback.field('phone')"
          name="phone"
          @blur="feedback.blur('phone')"
          placeholder="选填，可留空"
        />
        <p class="body-sm app-muted">
          手机号可用于密码登录，修改或清空后仍可使用账号登录；不会更改收货地址或门店联系电话。
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
