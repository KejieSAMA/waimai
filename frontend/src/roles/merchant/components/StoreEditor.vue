<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import {
  Button,
  Dialog,
  Input,
  Select,
  Switch,
  Tag,
  Thumb,
  QualificationCard,
} from "../../../components/pc";
import {
  merchantStoreRedirect,
  storeStatuses,
  useStoreEditor,
  qualificationDocuments as documents,
} from "@waimai/shared";
import { api, upload } from "../../../common/api";
import { useAuth } from "../../../common/auth";
import {
  loadMerchantStore,
  merchantStore,
  merchantStoreBusy,
  updateMerchantStore,
} from "../../../common/merchantStatus";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import BackofficePage from "../../../components/BackofficePage.vue";
const props = defineProps<{ application: boolean }>();
const route = useRoute(),
  router = useRouter(),
  auth = useAuth();
const editor = reactive(
  useStoreEditor(
    (path, options) => api(path, options, "MERCHANT"),
    props.application,
    () => loadMerchantStore(auth.accounts.MERCHANT!.id, true),
    updateMerchantStore,
  ),
);
const current = computed(() => merchantStore.value ?? editor.store);
const locked = computed(
  () =>
    merchantStoreBusy.value ||
    editor.loading ||
    editor.saving ||
    editor.uploading ||
    current.value?.status === "FROZEN",
);
const statusPending = ref(false),
  notice = ref("");
const uploadingKey = ref("");
watch([() => merchantStore.value?.status, () => editor.loading], () => {
  if (editor.loading || (editor.error && !editor.store)) return;
  const target = merchantStoreRedirect(merchantStore.value, route.path);
  if (target) void router.replace(target);
});
async function image(
  event: Event,
  key: "logo" | "licenseImage" | "foodPermitImage",
) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  await imageFile(file, key);
  input.value = "";
}
async function imageFile(
  file: File | undefined,
  key: "logo" | "licenseImage" | "foodPermitImage",
) {
  if (!file || locked.value) return;
  editor.uploading = true;
  uploadingKey.value = key;
  editor.error = "";
  try {
    editor.form[key] = await upload(
      file,
      "MERCHANT",
      key === "logo" ? "image" : "certificate",
    );
  } catch (cause) {
    editor.error = cause instanceof Error ? cause.message : "上传失败";
  } finally {
    editor.uploading = false;
    uploadingKey.value = "";
  }
}
async function save() {
  if (merchantStoreBusy.value) return;
  notice.value = "";
  merchantStoreBusy.value = true;
  try {
    if (await editor.save())
      notice.value = props.application ? "资料已提交审核" : "设置已保存";
  } finally {
    merchantStoreBusy.value = false;
  }
}
async function setOpen(open: boolean) {
  if (locked.value || statusPending.value) return;
  statusPending.value = true;
  merchantStoreBusy.value = true;
  editor.error = "";
  try {
    updateMerchantStore(
      await api(
        "/merchant/store/open",
        { method: "PUT", body: { open } },
        "MERCHANT",
      ),
    );
  } catch (cause) {
    editor.error = cause instanceof Error ? cause.message : "营业状态更新失败";
  } finally {
    statusPending.value = false;
    merchantStoreBusy.value = false;
  }
}
const discardOpen = ref(false),
  leaving = ref(false);
let resolveLeave: ((value: boolean) => void) | undefined;
function confirmDiscard() {
  editor.reset();
  discardOpen.value = false;
  resolveLeave?.(true);
  resolveLeave = undefined;
  leaving.value = false;
}
function keepEditing() {
  discardOpen.value = false;
  resolveLeave?.(false);
  resolveLeave = undefined;
  leaving.value = false;
}
onBeforeRouteLeave(() => {
  if (editor.saving || editor.uploading) return false;
  if (!editor.dirty) return true;
  if (resolveLeave) return false;
  discardOpen.value = true;
  leaving.value = true;
  return new Promise<boolean>((resolve) => {
    resolveLeave = resolve;
  });
});
function beforeUnload(event: BeforeUnloadEvent) {
  if (editor.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
}
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
  resolveLeave?.(false);
});
</script>
<template>
  <BackofficePage>
    <template v-if="current" #header>
      <div class="store-editor__identity">
        <Thumb kind="logo" :src="current.logo" :name="current.name" />
        <div>
          <h2 class="title-sm">{{ current.name }}</h2>
          <Tag :tone="storeStatuses[current.status].tone">{{
            storeStatuses[current.status].label
          }}</Tag>
        </div>
        <p
          v-if="current.rejectReason || current.frozenReason"
          class="body-sm app-muted"
        >
          {{ current.rejectReason || current.frozenReason }}
        </p>
      </div>
    </template>
    <p v-if="editor.loading" class="app-empty body-sm" role="status">
      加载资料中
    </p>
    <div
      v-else-if="editor.store === undefined && editor.error"
      class="app-error body-sm"
    >
      {{ editor.error
      }}<Button variant="text" @click="editor.load">重试</Button>
    </div>
    <div v-else class="store-editor">
      <a-menu
        class="store-editor__nav"
        mode="inline"
        :selected-keys="[editor.section]"
        :items="[
          { key: 'base', label: '基础信息' },
          { key: 'business', label: '营业配送' },
          { key: 'qualification', label: '资质信息' },
        ]"
        @click="
          ({ key }: { key: string | number }) =>
            (editor.section = String(key) as typeof editor.section)
        "
      />
      <form
        id="store-editor"
        class="app-card store-editor__form"
        novalidate
        @submit.prevent="save"
      >
        <fieldset :disabled="locked && editor.section !== 'qualification'">
          <section v-if="editor.section === 'base'" class="app-stack">
            <h2 class="title">基础信息</h2>
            <div class="app-row">
              <Thumb
                kind="logo"
                :src="editor.form.logo"
                :name="editor.form.name || '店铺'"
              /><label class="store-editor__upload body-sm"
                >更换 Logo<input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  :disabled="locked"
                  @change="image($event, 'logo')" /></label
              ><span class="caption app-muted"
                >JPG、PNG 或 WebP，单张不超过 5MB</span
              >
            </div>
            <div class="store-editor__fields">
              <Input
                v-model="editor.form.name"
                label="店铺名称"
                maxlength="60"
                required
              /><Select
                v-model="editor.form.categoryId"
                layout="vertical"
                label="平台类目"
                :options="
                  editor.categories.map((c) => ({ value: c.id, label: c.name }))
                "
              /><Input
                v-model="editor.form.city"
                label="城市"
                maxlength="30"
                required
              /><Input
                v-model="editor.form.contactPhone"
                label="联系电话"
                inputmode="tel"
                maxlength="11"
                required
              /><Input
                v-model="editor.form.address"
                class="store-editor__wide"
                label="店铺地址"
                maxlength="200"
                required
              />
            </div>
          </section>
          <section v-else-if="editor.section === 'business'" class="app-stack">
            <h2 class="title">营业配送</h2>
            <a
              v-if="!application"
              class="store-editor__upload body-sm"
              href="/merchant/promotions"
              @click.prevent="router.push('/merchant/promotions')"
              >满减配置</a
            >
            <div v-if="!application && current" class="app-row body-md">
              <span>营业状态</span
              ><Switch
                :model-value="current.status === 'OPEN'"
                :disabled="locked || statusPending"
                aria-label="营业状态"
                @update:model-value="setOpen"
              /><span class="body-sm app-muted">即时生效，不随表单保存</span>
            </div>
            <Input
              v-model="editor.form.openHours"
              label="营业时间"
              maxlength="100"
              hint="用于门店展示，营业状态由开关控制"
              required
            />
            <div class="store-editor__fields">
              <Input
                v-model="editor.form.min"
                label="起送价"
                prefix="¥"
                type="number"
                min="0"
                max="10000"
                step="0.01"
              /><Input
                v-model="editor.form.fee"
                label="配送费"
                prefix="¥"
                type="number"
                min="0"
                max="1000"
                step="0.01"
              />
            </div>
            <Input
              v-model="editor.form.notice"
              label="店铺公告"
              multiline
              maxlength="300"
              hint="最多 300 字"
            />
          </section>
          <section v-else class="app-stack">
            <h2 class="title">资质信息</h2>
            <p v-if="application" class="body-sm app-muted">
              证照为选填，不上传也可提交审核。支持 JPG、PNG、WebP，单张不超过
              5MB。
            </p>
            <p v-if="!application" class="body-sm app-muted">
              已提交的资质仅供查看，暂不提供在线变更
            </p>
            <div class="store-editor__documents">
              <QualificationCard
                v-for="doc in documents"
                :key="doc.key"
                v-model:expires="editor.form[doc.date]"
                :title="doc.title"
                :has-image="!!editor.form[doc.key]"
                :editable="application"
                :disabled="locked"
                :uploading="uploadingKey === doc.key"
                @select="imageFile($event, doc.key)"
                @remove="editor.form[doc.key] = ''"
              >
                <template #preview
                  ><ProtectedImage
                    role="MERCHANT"
                    :src="editor.form[doc.key]"
                    :alt="doc.title"
                /></template>
              </QualificationCard>
            </div>
          </section>
        </fieldset>
      </form>
    </div>
    <template #footer>
      <div class="store-editor__savebar">
        <span class="body-sm app-muted" role="status">{{
          editor.uploading
            ? "上传中"
            : editor.saving
              ? "保存中"
              : editor.dirty
                ? "有未保存修改"
                : notice || "暂无未保存修改"
        }}</span
        ><span
          v-if="editor.error && editor.store !== undefined"
          class="body-sm app-error"
          role="alert"
          >{{ editor.error }}</span
        >
        <div class="app-row">
          <Button
            variant="outline"
            :disabled="locked || !editor.dirty"
            @click="discardOpen = true"
            >取消修改</Button
          ><Button
            type="submit"
            form="store-editor"
            :disabled="
              locked || statusPending || (!application && !editor.dirty)
            "
            >{{
              application ? (current ? "重新提交" : "提交审核") : "保存设置"
            }}</Button
          >
        </div>
      </div>
    </template>
    <template #overlay
      ><Dialog :open="discardOpen" title="放弃修改" @close="keepEditing"
        ><p class="body-md">
          {{ leaving ? "离开将丢失尚未保存的修改" : "将恢复到上次保存的资料" }}
        </p>
        <template #actions
          ><Button variant="outline" @click="keepEditing">保留编辑</Button
          ><Button @click="confirmDiscard">放弃修改</Button></template
        ></Dialog
      ></template
    >
  </BackofficePage>
</template>
<style scoped>
.store-editor__identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.store-editor__identity h2 {
  margin: 0 0 var(--space-1);
}
.store-editor {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}
.store-editor__nav.ant-menu {
  position: sticky;
  top: 0;
  width: 100%;
  padding: var(--space-1);
  border-inline-end: 0 !important;
  border-radius: var(--radius-lg);
}
.store-editor__form {
  min-width: 0;
}
.store-editor fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.store-editor__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}
.store-editor__wide {
  grid-column: 1 / -1;
}
.store-editor__savebar {
  display: flex;
  flex: 1;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}
.store-editor__savebar > .app-row {
  margin-left: auto;
}
.store-editor__upload {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  min-height: var(--size-button-md);
  padding: 0 var(--space-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.store-editor__upload input {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
.store-editor__upload:focus-within {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.store-editor__documents {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--size-cart-panel)), 1fr)
  );
  gap: var(--space-4);
  max-width: calc(var(--size-cart-panel) * 3);
}
@media (max-width: 767px) {
  .store-editor {
    grid-template-columns: minmax(0, 1fr);
  }
  .store-editor__fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
