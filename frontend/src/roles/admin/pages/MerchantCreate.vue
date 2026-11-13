<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  useMerchantProvision,
  provisionSections,
  qualificationDocuments as documents,
} from "@waimai/shared";
import {
  Button,
  Dialog,
  Input,
  Select,
  Thumb,
  QualificationCard,
} from "../../../components/pc";
import BackofficePage from "../../../components/BackofficePage.vue";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import { api, upload } from "../../../common/api";
import { useAuth } from "../../../common/auth";
import { useDraftLeave } from "../../../common/draftLeave";
import { useFormFocus } from "../../../common/formFocus";
const formElement = ref<HTMLElement>();
const auth = useAuth(),
  router = useRouter();
const editor = reactive(
  useMerchantProvision({
    request: (path, options) => api(path, options, "ADMIN"),
    upload: (file, key) =>
      upload(file, "ADMIN", key === "logo" ? "image" : "certificate"),
    identity: () => `${auth.account?.id}:${auth.activeRole}:${auth.revision}`,
  }),
);
useFormFocus(formElement, {
  ...editor.feedback,
  first: computed(() => editor.feedback.first),
  focusVersion: computed(() => editor.feedback.focusVersion),
});
const leave = useDraftLeave(
  () => editor.dirty,
  () => editor.saving || !!editor.uploading,
);
const logoInput = ref<HTMLInputElement>();
async function logoChange(event: Event) {
  const input = event.target as HTMLInputElement;
  await editor.upload(input.files?.[0], "logo");
  input.value = "";
}
async function showCreated() {
  if (!editor.created) return;
  try {
    await router.replace({
      path: "/admin/merchants",
      query: { created: editor.created.store.id },
    });
  } catch {
    editor.error = "店铺和账号已创建，请从商家列表查看，不要重复创建";
  }
}
async function submit() {
  if (await editor.save()) await showCreated();
}
</script>
<template>
  <BackofficePage :reset-key="editor.section" label="创建店铺表单">
    <template #header
      ><div class="create-heading body-sm">
        <Button
          variant="text"
          icon="back"
          :disabled="editor.saving || !!editor.uploading"
          @click="router.push('/admin/merchants')"
          >商家管理</Button
        ><span class="app-muted">/ 创建店铺</span>
      </div></template
    >
    <p v-if="editor.loading" class="app-empty body-md" role="status">
      正在加载平台类目
    </p>
    <div v-else-if="editor.loadError" class="app-card app-stack" role="alert">
      <p>{{ editor.loadError }}</p>
      <Button @click="editor.load">重试</Button>
    </div>
    <div v-else-if="!editor.categories.length" class="app-card app-stack">
      <p class="body-md">暂无平台类目，请先创建类目后再创建店铺。</p>
      <Button @click="router.push('/admin/categories')">类目管理</Button
      ><Button variant="outline" @click="editor.load">重新读取</Button>
    </div>
    <div v-else class="merchant-create">
      <a-menu
        class="merchant-create__nav"
        mode="inline"
        :selected-keys="[editor.section]"
        :items="provisionSections"
        @click="
          ({ key }: { key: string | number }) => (editor.section = String(key))
        "
      />
      <form
        ref="formElement"
        id="merchant-create"
        class="app-card merchant-create__form"
        novalidate
        @submit.prevent="submit"
      >
        <section v-if="editor.section === 'account'" class="app-stack">
          <h2 class="title">商家账号</h2>
          <div class="merchant-create__fields">
            <Input
              name="account.username"
              :error="editor.feedback.field('account.username')"
              @blur="editor.feedback.blur('account.username')"
              v-model="editor.account.username"
              label="账号名"
              required
              maxlength="32"
              autocomplete="off"
              hint="3–32 位英文、数字、下划线或连字符，保存时统一小写"
              :disabled="editor.locked"
            />
            <Input
              name="account.password"
              :error="editor.feedback.field('account.password')"
              @blur="editor.feedback.blur('account.password')"
              v-model="editor.account.password"
              label="临时密码"
              type="password"
              required
              autocomplete="new-password"
              hint="至少 8 个字符，不超过 72 字节"
              :disabled="editor.locked"
            />
            <Input
              name="account.name"
              :error="editor.feedback.field('account.name')"
              @blur="editor.feedback.blur('account.name')"
              v-model="editor.account.name"
              label="负责人姓名"
              required
              maxlength="30"
              :disabled="editor.locked"
            />
            <Input
              name="account.phone"
              :error="editor.feedback.field('account.phone')"
              @blur="editor.feedback.blur('account.phone')"
              v-model="editor.account.phone"
              label="账号联系手机"
              inputmode="tel"
              maxlength="11"
              placeholder="选填"
              :disabled="editor.locked"
            />
          </div>
          <p class="body-sm app-muted">
            仅创建商家身份，不绑定已有账号。账号联系手机与门店联系电话分别保存。
          </p>
        </section>
        <section v-else-if="editor.section === 'base'" class="app-stack">
          <h2 class="title">基础信息</h2>
          <div class="app-row">
            <Thumb
              kind="logo"
              :src="editor.form.logo"
              :name="editor.form.name || '店铺'"
            /><input
              ref="logoInput"
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              :disabled="editor.locked"
              @change="logoChange"
            /><Button
              variant="outline"
              :disabled="editor.locked"
              @click="logoInput?.click()"
              >{{
                editor.uploading === "logo" ? "上传中" : "上传 Logo"
              }}</Button
            ><Button
              v-if="editor.form.logo"
              variant="text"
              :disabled="editor.locked"
              @click="editor.form.logo = ''"
              >移除</Button
            >
          </div>
          <div class="merchant-create__fields">
            <Input
              name="store.name"
              :error="editor.feedback.field('store.name')"
              @blur="editor.feedback.blur('store.name')"
              v-model="editor.form.name"
              label="店铺名称"
              required
              maxlength="60"
              :disabled="editor.locked"
            />
            <Select
              name="store.categoryId"
              :error="editor.feedback.field('store.categoryId')"
              @blur="editor.feedback.blur('store.categoryId')"
              v-model="editor.form.categoryId"
              layout="vertical"
              label="平台类目"
              required
              placeholder="请选择类目"
              :options="
                editor.categories.map((c) => ({ value: c.id, label: c.name }))
              "
              :disabled="editor.locked"
            />
            <Input
              name="store.city"
              :error="editor.feedback.field('store.city')"
              @blur="editor.feedback.blur('store.city')"
              v-model="editor.form.city"
              label="城市"
              required
              maxlength="30"
              :disabled="editor.locked"
            />
            <Input
              name="store.contactPhone"
              :error="editor.feedback.field('store.contactPhone')"
              @blur="editor.feedback.blur('store.contactPhone')"
              v-model="editor.form.contactPhone"
              label="门店联系电话"
              required
              maxlength="11"
              inputmode="tel"
              :disabled="editor.locked"
            />
            <Input
              name="store.address"
              :error="editor.feedback.field('store.address')"
              @blur="editor.feedback.blur('store.address')"
              v-model="editor.form.address"
              class="merchant-create__wide"
              label="门店地址"
              required
              maxlength="200"
              :disabled="editor.locked"
            />
          </div>
        </section>
        <section v-else-if="editor.section === 'business'" class="app-stack">
          <h2 class="title">营业配送</h2>
          <Input
            name="store.openHours"
            :error="editor.feedback.field('store.openHours')"
            @blur="editor.feedback.blur('store.openHours')"
            v-model="editor.form.openHours"
            label="营业时间"
            required
            maxlength="100"
            hint="用于门店展示，营业状态由商家开关控制"
            :disabled="editor.locked"
          />
          <div class="merchant-create__fields">
            <Input
              name="store.min"
              :error="editor.feedback.field('store.min')"
              @blur="editor.feedback.blur('store.min')"
              v-model="editor.form.min"
              label="起送价"
              prefix="¥"
              type="number"
              min="0"
              max="10000"
              step="0.01"
              :disabled="editor.locked"
            /><Input
              name="store.fee"
              :error="editor.feedback.field('store.fee')"
              @blur="editor.feedback.blur('store.fee')"
              v-model="editor.form.fee"
              label="配送费"
              prefix="¥"
              type="number"
              min="0"
              max="1000"
              step="0.01"
              :disabled="editor.locked"
            />
          </div>
          <Input
            name="store.notice"
            :error="editor.feedback.field('store.notice')"
            @blur="editor.feedback.blur('store.notice')"
            v-model="editor.form.notice"
            label="店铺公告"
            multiline
            maxlength="300"
            :disabled="editor.locked"
          />
        </section>
        <section v-else class="app-stack">
          <h2 class="title">资质信息</h2>
          <p class="body-sm app-muted">
            证照和有效期均选填。支持 JPG、PNG、WebP，单张不超过 5MB。
          </p>
          <div class="merchant-create__documents">
            <QualificationCard
              v-for="doc in documents"
              :key="doc.key"
              :field-name="'store.' + doc.date"
              :field-error="editor.feedback.field('store.' + doc.date)"
              v-model:expires="editor.form[doc.date]"
              :title="doc.title"
              :has-image="!!editor.form[doc.key]"
              editable
              :disabled="editor.locked"
              :uploading="editor.uploading === doc.key"
              @select="editor.upload($event, doc.key)"
              @remove="editor.form[doc.key] = ''"
              ><template #preview
                ><ProtectedImage
                  role="ADMIN"
                  :src="editor.form[doc.key]"
                  :alt="doc.title" /></template
            ></QualificationCard>
          </div>
        </section>
      </form>
    </div>
    <template #footer
      ><div class="merchant-create__savebar">
        <div class="app-stack">
          <span class="body-sm app-muted" role="status">{{
            editor.created
              ? "店铺和账号已创建，首次登录需改密"
              : editor.saving
                ? "正在创建店铺及账号"
                : editor.uploading
                  ? "正在上传图片"
                  : editor.dirty
                    ? "有未保存修改"
                    : "店铺初始为休息中"
          }}</span
          ><span v-if="editor.error" class="body-sm app-error" role="alert">{{
            editor.error
          }}</span>
        </div>
        <div class="app-row">
          <Button
            variant="outline"
            :disabled="editor.saving || !!editor.uploading"
            @click="router.push('/admin/merchants')"
            >返回列表</Button
          ><Button v-if="editor.created" @click="showCreated">查看店铺</Button
          ><Button
            v-else
            type="submit"
            form="merchant-create"
            :disabled="!editor.canSubmit"
            >创建店铺</Button
          >
        </div>
      </div></template
    >
    <template #overlay
      ><Dialog
        :open="leave.open.value"
        title="放弃创建"
        @close="leave.choose(false)"
        ><p class="body-md">店铺及账号尚未创建，离开将丢失本次填写。</p>
        <template #actions
          ><Button variant="outline" @click="leave.choose(false)"
            >继续填写</Button
          ><Button variant="danger" @click="leave.choose(true)"
            >放弃创建</Button
          ></template
        ></Dialog
      ></template
    >
  </BackofficePage>
</template>
<style scoped>
.create-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.merchant-create {
  display: grid;
  grid-template-columns: 144px minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}
.merchant-create__nav {
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.merchant-create__form {
  min-width: 0;
}
.merchant-create__fields,
.merchant-create__documents {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}
.merchant-create__wide {
  grid-column: 1 / -1;
}
.merchant-create__savebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}
.merchant-create__savebar > .app-stack {
  min-width: 0;
  flex: 1;
  gap: var(--space-1);
}
@media (max-width: 1000px) {
  .merchant-create {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
  .merchant-create__fields,
  .merchant-create__documents {
    grid-template-columns: minmax(0, 1fr);
  }
  .merchant-create__savebar {
    flex-wrap: wrap;
  }
}
</style>
