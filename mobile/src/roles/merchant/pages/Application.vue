<script setup lang="ts">
import PageSlot from "../../../components/PageSlot.vue";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import {
  Button,
  Input,
  Select,
  Tag,
  Thumb,
  QualificationCard,
} from "@waimai/ui";
import { onMounted, reactive, ref } from "vue";
import {
  type Store,
  type Category,
  storeStatuses,
  qualificationDocuments,
} from "@waimai/shared";
import { storeDraft } from "@waimai/shared";
import { api, upload } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const application = true;
const uploadingKey = ref("");
const store = ref<Store | null>(null),
  categories = ref<Category[]>([]);
const form = reactive(storeDraft());
onMounted(() =>
  run(async () => {
    categories.value = await api<Category[]>("/public/categories");
    store.value = await api<Store | null>(
      "/merchant/application",
      {},
      "MERCHANT",
    );
    if (store.value) {
      Object.assign(form, store.value, {
        min: String(store.value.minOrderCents / 100),
        fee: String(store.value.deliveryFeeCents / 100),
        licenseExpireAt: store.value.licenseExpireAt?.slice(0, 10) ?? "",
        permitExpireAt: store.value.permitExpireAt?.slice(0, 10) ?? "",
      });
    } else form.categoryId = categories.value[0]?.id ?? "";
  }),
);
async function image(
  event: Event,
  key: "logo" | "licenseImage" | "foodPermitImage",
) {
  const input = event.target as HTMLInputElement;
  await imageFile(input.files?.[0], key);
  input.value = "";
}
async function imageFile(
  file: File | undefined,
  key: "logo" | "licenseImage" | "foodPermitImage",
) {
  if (file && !busy.value) {
    uploadingKey.value = key;
    await run(async () => {
      form[key] = await upload(
        file,
        "MERCHANT",
        key === "logo" ? "image" : "certificate",
      );
    });
    uploadingKey.value = "";
  }
}
async function save() {
  await run(async () => {
    store.value = await api<Store>(
      application ? "/merchant/application" : "/merchant/store",
      {
        method: "PUT",
        body: {
          name: form.name,
          categoryId: form.categoryId,
          city: form.city,
          address: form.address,
          contactPhone: form.contactPhone,
          notice: form.notice,
          openHours: form.openHours,
          minOrderCents: Math.round(Number(form.min) * 100),
          deliveryFeeCents: Math.round(Number(form.fee) * 100),
          logo: form.logo,
          licenseImage: form.licenseImage,
          foodPermitImage: form.foodPermitImage,
          licenseExpireAt:
            form.licenseImage && form.licenseExpireAt
              ? form.licenseExpireAt
              : null,
          permitExpireAt:
            form.foodPermitImage && form.permitExpireAt
              ? form.permitExpireAt
              : null,
        },
      },
      "MERCHANT",
    );
  });
}
</script>
<template>
  <form id="mobile-edit-form" class="app-stack" @submit.prevent="save">
    <div v-if="store" class="app-row">
      <Tag :tone="storeStatuses[store.status].tone">{{
        storeStatuses[store.status].label
      }}</Tag
      ><span class="body-sm">{{
        store.rejectReason || store.frozenReason
      }}</span>
    </div>
    <div class="app-card app-form">
      <Input v-model="form.name" label="店铺名称" required /><Select
        v-model="form.categoryId"
        label="平台类目"
        :options="categories.map((c) => ({ value: c.id, label: c.name }))"
      /><Input v-model="form.city" label="城市" required /><Input
        v-model="form.address"
        label="店铺地址"
        required
      /><Input
        v-model="form.contactPhone"
        label="联系电话"
        required
        inputmode="tel"
      /><Input v-model="form.openHours" label="营业时间" required /><Input
        v-model="form.notice"
        label="店铺公告"
        multiline
      />
      <div class="app-grid">
        <Input
          v-model="form.min"
          label="起送价（元）"
          type="number"
          min="0"
          step="0.01"
        /><Input
          v-model="form.fee"
          label="配送费（元）"
          type="number"
          min="0"
          step="0.01"
        />
      </div>
      <label class="app-upload body-sm"
        >店铺 Logo<input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="image($event, 'logo')" /></label
      ><Thumb v-if="form.logo" kind="logo" :src="form.logo" :name="form.name" />
    </div>
    <section class="app-card app-stack">
      <h2 class="title">资质信息</h2>
      <p
        v-if="!store || ['PENDING', 'REJECTED'].includes(store.status)"
        class="body-sm app-muted"
      >
        证照为选填，不上传也可提交审核。支持 JPG、PNG、WebP，单张不超过 5MB。
      </p>
      <p v-else class="body-sm app-muted">
        已提交的资质仅供查看，暂不提供在线变更
      </p>
      <QualificationCard
        v-for="doc in qualificationDocuments"
        :key="doc.key"
        v-model:expires="form[doc.date]"
        :title="doc.title"
        :has-image="!!form[doc.key]"
        :editable="!store || ['PENDING', 'REJECTED'].includes(store.status)"
        :disabled="busy"
        :uploading="uploadingKey === doc.key"
        @select="imageFile($event, doc.key)"
        @remove="form[doc.key] = ''"
      >
        <template #preview
          ><ProtectedImage
            role="MERCHANT"
            :src="form[doc.key]"
            :alt="doc.title"
        /></template>
      </QualificationCard>
    </section>
    <PageSlot name="actions"
      ><div class="sc-full-actions">
        <Button
          size="lg"
          form="mobile-edit-form"
          type="submit"
          :disabled="
            busy ||
            store?.status === 'FROZEN' ||
            (application &&
              !!store &&
              !['PENDING', 'REJECTED'].includes(store.status))
          "
          >{{ application ? "提交审核" : "保存设置" }}</Button
        >
      </div></PageSlot
    >
  </form>
</template>
