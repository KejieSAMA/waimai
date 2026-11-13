<script setup lang="ts">
import { computed, ref } from "vue";
import AccountLayout from "./AccountLayout.vue";
import { useRouter } from "vue-router";
import { Button, Dialog, Input } from "../components/pc";
import { useProfileEditor } from "@waimai/shared";
import BackofficePage from "../components/BackofficePage.vue";
import { useAuth } from "./auth";
import { useDraftLeave } from "./draftLeave";
import { useFormFocus } from "./formFocus";
const auth = useAuth(),
  router = useRouter();
const shell = computed(() =>
  auth.activeRole === "USER" ? AccountLayout : "div",
);
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
const { open, choose } = useDraftLeave(
  () => dirty.value,
  () => saving.value,
);
const back = () =>
  router.push(
    auth.activeRole === "MERCHANT"
      ? "/merchant/me"
      : auth.activeRole === "ADMIN"
        ? "/admin/me"
        : "/me",
  );
const formElement = ref<HTMLElement>();
useFormFocus(formElement, feedback);
async function submit() {
  if (await save()) await back();
}
</script>
<template>
  <component :is="shell" class="profile-layout"
    ><BackofficePage>
      <template #header
        ><div class="app-row">
          <Button variant="text" icon="back" :disabled="saving" @click="back"
            >返回</Button
          ><span class="body-sm">个人资料</span>
        </div></template
      >
      <form
        ref="formElement"
        novalidate
        id="pc-profile-form"
        class="app-card app-stack profile-form"
        @submit.prevent="submit"
      >
        <p class="body-sm app-muted">
          账号 {{ auth.account?.username }} ·
          {{
            auth.account?.roles
              ?.map(
                (r) => ({ USER: "用户", MERCHANT: "商家", ADMIN: "管理员" })[r],
              )
              .join("、")
          }}
        </p>
        <p v-if="loading" role="status" class="body-sm app-muted">
          正在加载资料
        </p>
        <template v-if="loaded"
          ><Input
            v-model="name"
            label="昵称"
            required
            maxlength="30"
            autocomplete="nickname"
            :disabled="saving || loading"
            :error="feedback.field('name')"
            name="name"
            @blur="feedback.blur('name')"
          /><Input
            v-model="phone"
            label="联系手机"
            type="tel"
            maxlength="11"
            inputmode="tel"
            :disabled="saving || loading"
            :error="feedback.field('phone')"
            name="phone"
            @blur="feedback.blur('phone')"
            placeholder="选填，可留空"
          />
          <p class="body-sm app-muted">
            联系手机不用于登录验证，修改后不会更改收货地址或门店联系电话。
          </p></template
        >
        <p v-if="error" class="app-error body-sm" role="alert">
          {{ error
          }}<Button v-if="!loaded" variant="text" @click="load">重试</Button>
        </p>
      </form>
      <template #footer
        ><Button variant="outline" :disabled="saving" @click="back">取消</Button
        ><Button type="submit" form="pc-profile-form" :disabled="!canSave">{{
          saving ? "正在保存" : "保存资料"
        }}</Button></template
      >
      <template #overlay
        ><Dialog :open="open" title="放弃修改" @close="choose(false)"
          ><p class="body-md">资料尚未保存，离开后将放弃本次修改。</p>
          <template #actions
            ><Button variant="outline" @click="choose(false)">继续编辑</Button
            ><Button variant="danger" @click="choose(true)"
              >放弃修改</Button
            ></template
          ></Dialog
        ></template
      >
    </BackofficePage></component
  >
</template>
<style scoped>
.profile-layout {
  height: 100%;
  min-height: 0;
}
.profile-layout :deep(.app-account-content) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.profile-form {
  max-width: calc(var(--size-cart-panel) * 2);
}
</style>
