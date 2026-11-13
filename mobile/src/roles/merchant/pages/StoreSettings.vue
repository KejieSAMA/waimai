<script setup lang="ts">
import { useRouter } from "vue-router";
import PageSlot from "../../../components/PageSlot.vue";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import { Button, Input, Select, Tag, Thumb } from "@waimai/ui";
import { onMounted, reactive, ref } from "vue";
import { type Store, type Category, storeStatuses } from "@waimai/shared";
import { api, upload } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const application = false;
const router = useRouter();
const store = ref<Store | null>(null),
  categories = ref<Category[]>([]);
const form = reactive({
  name: "",
  categoryId: "",
  city: "",
  address: "",
  contactPhone: "",
  notice: "",
  openHours: "09:00-22:00",
  min: "20",
  fee: "3",
  logo: "",
  licenseImage: "",
  foodPermitImage: "",
  licenseExpireAt: "",
  permitExpireAt: "",
});
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
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file)
    await run(async () => {
      form[key] = await upload(
        file,
        "MERCHANT",
        key === "logo" ? "image" : "certificate",
      );
    });
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
          ...(form.licenseExpireAt
            ? { licenseExpireAt: form.licenseExpireAt }
            : {}),
          ...(form.permitExpireAt
            ? { permitExpireAt: form.permitExpireAt }
            : {}),
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
    <Button variant="outline" @click="router.push('/merchant/promotions')"
      >满减配置</Button
    >
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
      ><Thumb
        v-if="form.logo"
        kind="logo"
        :src="form.logo"
        :name="form.name"
      /><template v-if="application"
        ><label class="app-upload body-sm"
          >营业执照<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="image($event, 'licenseImage')" /></label
        ><ProtectedImage
          v-if="form.licenseImage"
          role="MERCHANT"
          :src="form.licenseImage"
          alt="营业执照"
          class="app-image" /><Input
          v-model="form.licenseExpireAt"
          type="date"
          label="营业执照到期日" /><label class="app-upload body-sm"
          >食品经营许可证<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="image($event, 'foodPermitImage')" /></label
        ><ProtectedImage
          v-if="form.foodPermitImage"
          role="MERCHANT"
          :src="form.foodPermitImage"
          alt="食品经营许可证"
          class="app-image" /><Input
          v-model="form.permitExpireAt"
          type="date"
          label="许可证到期日" /></template
      ><PageSlot name="actions"
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
    </div>
  </form>
</template>
