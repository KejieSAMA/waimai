<script setup lang="ts">
import {
  Button,
  Dialog,
  Icon,
  Input,
  ListCell,
  ListCellGroup,
  Tag,
  Thumb,
} from "@waimai/ui";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  type Store,
  storeStatuses,
  phoneTail,
  money,
  time,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import PageSlot from "../../../components/PageSlot.vue";
import { usePageChrome } from "../../../common/pageChrome";
const chrome = usePageChrome();
const route = useRoute(),
  router = useRouter(),
  detail = ref<Store>(),
  reason = ref(""),
  rejecting = ref(false);
watch(
  () => detail.value,
  (value) => {
    chrome.title = "入驻审核";
    chrome.subtitle = value?.createdAt ? "创建于 " + time(value.createdAt) : "";
  },
);
watch(
  () => route.params.id,
  (id, _old, cleanup) => {
    let active = true;
    cleanup(() => {
      active = false;
    });
    detail.value = undefined;
    reason.value = "";
    rejecting.value = false;
    void run(async () => {
      const value = await api<Store>("/admin/merchants/" + id, {}, "ADMIN");
      if (active) detail.value = value;
    });
  },
  { immediate: true },
);

async function send(action: "approve" | "reject") {
  await run(async () => {
    await api(
      `/admin/merchants/${detail.value!.id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "ADMIN",
    );
    await router.push(
      route.query.from === "merchants" ? "/admin/merchants" : "/admin/audit",
    );
  });
}
</script>
<template>
  <div v-if="detail" class="xz-list sc-page-list">
    <div class="xz-store app-audit-heading">
      <Thumb kind="logo" :src="detail.logo" :name="detail.name" />
      <div class="xz-store__main">
        <div class="xz-merchant__top">
          <span class="title-sm">{{ detail.name }}</span
          ><Tag :tone="storeStatuses[detail.status].tone">{{
            storeStatuses[detail.status].label
          }}</Tag>
        </div>
        <span class="body-sm app-muted"
          >{{ detail.category?.name }} · {{ detail.city }} · 第
          {{ detail.submitCount || 1 }} 次提交</span
        >
      </div>
    </div>
    <ListCellGroup title="店铺信息"
      ><ListCell title="门店地址" :value="detail.address" /><ListCell
        title="营业时间"
        :value="detail.openHours" /><ListCell
        title="负责人"
        :value="
          (detail.owner?.name || '') + ' · ' + phoneTail(detail.contactPhone)
        " /><ListCell
        title="起送 / 配送"
        :value="
          money(detail.minOrderCents) + ' / ' + money(detail.deliveryFeeCents)
        "
    /></ListCellGroup>
    <div class="app-card">
      <p class="body-sm app-muted">资质证照</p>
      <div class="sc-docs">
        <div
          v-for="doc in [
            {
              title: '营业执照',
              src: detail.licenseImage,
              expires: detail.licenseExpireAt,
            },
            {
              title: '食品经营许可证',
              src: detail.foodPermitImage,
              expires: detail.permitExpireAt,
            },
          ]"
          :key="doc.title"
          class="sc-doc"
        >
          <ProtectedImage
            v-if="doc.src"
            role="ADMIN"
            :src="doc.src"
            :alt="doc.title"
            class="app-image"
          /><Icon v-else name="shield" /><b class="body-sm">{{ doc.title }}</b
          ><span class="caption">{{
            doc.expires
              ? "有效期至 " + doc.expires.slice(0, 10)
              : "未提供到期日期"
          }}</span>
        </div>
      </div>
    </div>
    <p class="body-sm app-muted">
      通过后商家可上架商品并开始营业；驳回需填写原因，商家修改后可重新提交。
    </p>
    <PageSlot name="actions"
      ><div v-if="detail.status === 'PENDING'" class="sc-actions">
        <Button
          size="lg"
          variant="danger-outline"
          :disabled="busy"
          @click="rejecting = true"
          >驳回</Button
        ><Button size="lg" :disabled="busy" @click="send('approve')"
          >审核通过</Button
        >
      </div>
      <div v-else class="sc-full-actions">
        <Button
          size="lg"
          variant="outline"
          @click="
            router.push(
              route.query.from === 'merchants'
                ? '/admin/merchants'
                : '/admin/audit',
            )
          "
          >返回列表</Button
        >
      </div></PageSlot
    >
    <Dialog
      :open="rejecting"
      title="驳回申请"
      variant="sheet"
      @close="rejecting = false"
      ><Input v-model="reason" label="驳回原因" multiline /><template #actions
        ><Button
          variant="danger"
          :disabled="busy || !reason.trim()"
          @click="send('reject')"
          >确认驳回</Button
        ></template
      ></Dialog
    >
  </div>
</template>
<style scoped>
.app-audit-heading {
  align-items: center;
}
</style>
