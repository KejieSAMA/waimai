<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Button,
  Input,
  Select,
  Tag,
  Thumb,
  Dialog,
  QualificationCard,
} from "@waimai/ui";
import {
  useStoreEditor,
  qualificationDocuments,
  storeStatuses,
  merchantStoreRedirect,
} from "@waimai/shared";
import PageSlot from "../../../components/PageSlot.vue";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import { api, upload } from "../../../common/api";
import { useDraftLeave } from "../../../common/draftLeave";
import { useFormFocus } from "../../../common/formFocus";
const props = defineProps<{ application: boolean }>(),
  router = useRouter();
const editor = useStoreEditor(
  (path, options) => api(path, options, "MERCHANT"),
  props.application,
  () => api("/merchant/application", {}, "MERCHANT"),
  () => {},
);
const {
  form,
  store,
  categories,
  loading,
  loaded,
  saving,
  uploading,
  error,
  dirty,
  readonly,
  feedback,
} = editor;
let alive = true;
onScopeDispose(() => {
  alive = false;
});
const resetOpen = ref(false);
const root = ref<HTMLElement>(),
  notice = ref(""),
  uploadingKey = ref("");
useFormFocus(root, feedback);
const locked = computed(
  () =>
    loading.value ||
    !loaded.value ||
    saving.value ||
    uploading.value ||
    readonly.value,
);
const { open, choose } = useDraftLeave(
  () => dirty.value,
  () => saving.value || uploading.value,
);
watch(store, (s) => {
  const target = merchantStoreRedirect(
    s,
    props.application ? "/merchant/apply" : "/merchant/store",
  );
  if (target) void router.replace(target);
});
async function save() {
  notice.value = "";
  if (await editor.save())
    notice.value = props.application ? "资料已提交审核" : "设置已保存";
}
async function image(
  file: File | undefined,
  key: "logo" | "licenseImage" | "foodPermitImage",
) {
  if (!file || locked.value) return;
  uploading.value = true;
  uploadingKey.value = key;
  error.value = "";
  try {
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new Error("请选择不超过 5MB 的 JPG、PNG 或 WebP 图片");
    const url = await upload(
      file,
      "MERCHANT",
      key === "logo" ? "image" : "certificate",
    );
    if (alive) form[key] = url;
  } catch (e) {
    if (alive)
      error.value = e instanceof Error ? e.message : "上传失败，原图片已保留";
  } finally {
    if (alive) {
      uploading.value = false;
      uploadingKey.value = "";
    }
  }
}
function remove(
  key: "licenseImage" | "foodPermitImage",
  date: "licenseExpireAt" | "permitExpireAt",
) {
  if (!locked.value) {
    form[key] = "";
    form[date] = "";
  }
}
</script>
<template>
  <form
    ref="root"
    id="mobile-edit-form"
    class="app-stack"
    novalidate
    @submit.prevent="save"
  >
    <p v-if="loading" class="body-sm app-muted" role="status">
      正在读取店铺资料
    </p>
    <p v-if="error" class="app-error body-sm" role="alert">
      {{ error }}
      <Button v-if="!loaded" variant="text" @click="editor.load">重试</Button>
    </p>
    <div v-if="store" class="app-row">
      <Tag :tone="storeStatuses[store.status].tone">{{
        storeStatuses[store.status].label
      }}</Tag
      ><span class="body-sm">{{
        store.rejectReason || store.frozenReason
      }}</span>
    </div>
    <section class="app-card app-stack">
      <h2 class="title">基础信息</h2>
      <Input
        name="name"
        :error="feedback.field('name')"
        @blur="feedback.blur('name')"
        :disabled="locked"
        v-model="form.name"
        label="店铺名称"
        required
        maxlength="60"
      />
      <Select
        name="categoryId"
        :error="feedback.field('categoryId')"
        @blur="feedback.blur('categoryId')"
        :disabled="locked"
        v-model="form.categoryId"
        label="平台类目"
        :options="categories.map((c) => ({ value: c.id, label: c.name }))"
      />
      <Input
        name="city"
        :error="feedback.field('city')"
        @blur="feedback.blur('city')"
        :disabled="locked"
        v-model="form.city"
        label="城市"
        required
        maxlength="30"
      />
      <Input
        name="address"
        :error="feedback.field('address')"
        @blur="feedback.blur('address')"
        :disabled="locked"
        v-model="form.address"
        label="店铺地址"
        required
        maxlength="200"
      />
      <Input
        name="contactPhone"
        :error="feedback.field('contactPhone')"
        @blur="feedback.blur('contactPhone')"
        :disabled="locked"
        v-model="form.contactPhone"
        label="联系电话"
        required
        type="tel"
        inputmode="tel"
        maxlength="11"
      />
      <label class="app-upload body-sm"
        >店铺 Logo<input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          :disabled="locked"
          @change="
            image(($event.target as HTMLInputElement).files?.[0], 'logo')
          "
      /></label>
      <Thumb v-if="form.logo" kind="logo" :src="form.logo" :name="form.name" />
    </section>
    <section class="app-card app-stack">
      <h2 class="title">营业配送</h2>
      <Button
        v-if="!application"
        variant="outline"
        @click="router.push('/merchant/promotions')"
        >满减配置</Button
      >
      <Input
        name="openHours"
        :error="feedback.field('openHours')"
        @blur="feedback.blur('openHours')"
        :disabled="locked"
        v-model="form.openHours"
        label="营业时间"
        required
        maxlength="100"
      />
      <Input
        name="notice"
        :error="feedback.field('notice')"
        @blur="feedback.blur('notice')"
        :disabled="locked"
        v-model="form.notice"
        label="店铺公告"
        multiline
        maxlength="300"
      />
      <div class="app-grid">
        <Input
          name="min"
          :error="feedback.field('min')"
          @blur="feedback.blur('min')"
          :disabled="locked"
          v-model="form.min"
          label="起送价（元）"
          inputmode="decimal"
        /><Input
          name="fee"
          :error="feedback.field('fee')"
          @blur="feedback.blur('fee')"
          :disabled="locked"
          v-model="form.fee"
          label="配送费（元）"
          inputmode="decimal"
        />
      </div>
    </section>
    <section class="app-card app-stack">
      <h2 class="title">资质信息</h2>
      <p class="body-sm app-muted">
        {{
          application
            ? "证照为选填，不上传也可提交审核。支持 JPG、PNG、WebP，单张不超过 5MB。"
            : "已提交的资质仅供查看"
        }}
      </p>
      <QualificationCard
        v-for="doc in qualificationDocuments"
        :key="doc.key"
        :field-name="doc.date"
        :field-error="feedback.field(doc.date)"
        v-model:expires="form[doc.date]"
        :title="doc.title"
        :has-image="!!form[doc.key]"
        :editable="application && !readonly"
        :disabled="locked"
        :uploading="uploadingKey === doc.key"
        @select="image($event, doc.key)"
        @remove="remove(doc.key, doc.date)"
        ><template #preview
          ><ProtectedImage
            role="MERCHANT"
            :src="form[doc.key]"
            :alt="doc.title" /></template
      ></QualificationCard>
    </section>
    <PageSlot name="actions"
      ><div class="store-form-actions">
        <span class="caption" role="status">{{
          saving ? "正在保存" : notice || (dirty ? "有未保存修改" : "")
        }}</span>
        <div class="sc-full-actions">
          <Button
            variant="outline"
            :disabled="locked || !dirty"
            @click="resetOpen = true"
            >取消修改</Button
          ><Button
            form="mobile-edit-form"
            type="submit"
            :disabled="locked || !dirty"
            >{{ application ? "提交审核" : "保存设置" }}</Button
          >
        </div>
      </div></PageSlot
    >
  </form>
  <Dialog :open="resetOpen" title="取消修改" @close="resetOpen = false"
    ><p>是否放弃当前未保存的修改？</p>
    <template #actions
      ><Button variant="outline" @click="resetOpen = false">继续编辑</Button
      ><Button
        variant="danger"
        @click="
          editor.reset();
          resetOpen = false;
        "
        >放弃修改</Button
      ></template
    ></Dialog
  >
  <Dialog :open="open" title="放弃修改" @close="choose(false)"
    ><p>离开后将放弃尚未保存的店铺修改。</p>
    <template #actions
      ><Button variant="outline" @click="choose(false)">继续编辑</Button
      ><Button variant="danger" @click="choose(true)"
        >放弃修改</Button
      ></template
    ></Dialog
  >
</template>
<style scoped>
.store-form-actions {
  width: 100%;
}
.store-form-actions > span {
  display: block;
  padding: 0 var(--space-3);
  color: var(--ink-muted);
}
</style>
