<script setup lang="ts">
import { Button, Dialog, Input, SearchBar, Tabs, Tag, Thumb } from "@waimai/ui";
import { onMounted, ref, watch } from "vue";
import {
  type Product,
  type Page,
  productStatuses,
  firstImage,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const list = ref<Product[]>([]),
  keyword = ref(""),
  status = ref(new URLSearchParams(location.search).get("status") || ""),
  page = ref(1),
  total = ref(0),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
async function load() {
  await run(async () => {
    const result = await api<Page<Product>>(
      `/admin/products?status=${status.value}&keyword=${encodeURIComponent(keyword.value)}&page=${page.value}`,
      {},
      "ADMIN",
    );
    list.value = result.list;
    total.value = result.total;
  });
}
onMounted(load);
watch(status, () => {
  page.value = 1;
  void load();
});
function act(id: string, action: string) {
  if (action !== "approve") {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  void send(id, action);
}
async function send(id: string, action: string) {
  await run(async () => {
    await api(
      `/admin/products/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "ADMIN",
    );
    pending.value = null;
    await load();
  });
}
</script>
<template>
  <div class="app-stack">
    <Tabs
      v-model="status"
      :items="[
        { key: '', label: '全部商品' },
        ...Object.entries(productStatuses).map(([key, s]) => ({
          key,
          label: s.label,
        })),
      ]"
    /><SearchBar
      v-model="keyword"
      placeholder="搜索商品"
      action="查询"
      @action="
        page = 1;
        load();
      "
    />
    <div v-for="p in list" :key="p.id" class="app-card app-stack">
      <div class="app-row">
        <Thumb :src="firstImage(p.images)" :name="p.name" /><span
          class="title-sm"
          >{{ p.name }}</span
        ><Tag :tone="productStatuses[p.displayStatus].tone">{{
          productStatuses[p.displayStatus].label
        }}</Tag
        ><span>{{ money(p.priceCents) }}</span>
      </div>
      <div class="app-row">
        <template v-if="p.status === 'REVIEW'"
          ><Button @click="act(p.id, 'approve')">通过</Button
          ><Button variant="danger-outline" @click="act(p.id, 'reject')"
            >驳回</Button
          ></template
        ><Button
          v-if="!p.forcedOff"
          variant="danger-outline"
          @click="act(p.id, 'force-off')"
          >强制下架</Button
        >
      </div>
    </div>
    <div class="app-row">
      <Button
        :disabled="page <= 1"
        @click="
          page--;
          load();
        "
        >上一页</Button
      ><Button
        :disabled="page * 20 >= total"
        @click="
          page++;
          load();
        "
        >下一页</Button
      >
    </div>
    <Dialog
      :open="!!pending"
      title="填写原因"
      variant="modal"
      @close="pending = null"
      ><Input v-model="reason" label="处理原因" multiline /><template #actions
        ><Button
          :disabled="busy || !reason.trim()"
          @click="pending && send(pending.id, pending.action)"
          >提交处理</Button
        ></template
      ></Dialog
    >
  </div>
</template>
