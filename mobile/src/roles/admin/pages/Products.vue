<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import {
  Button,
  ListStatus,
  Dialog,
  Input,
  SearchBar,
  Tabs,
  Tag,
  Thumb,
} from "@waimai/ui";
import { onMounted, ref, watch, onScopeDispose } from "vue";
import {
  type Product,
  usePagedList,
  productStatuses,
  firstImage,
  money,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { useListScroll } from "../../../common/pageScroll";
const keyword = ref(""),
  status = ref(new URLSearchParams(location.search).get("status") || ""),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const listStart = ref<HTMLElement>();
const scroll = useListScroll(listStart);
let appliedKeyword = "";
const pages = usePagedList<Product>(
  (target) =>
    api(
      `/admin/products?status=${status.value}&keyword=${encodeURIComponent(appliedKeyword)}&page=${target}`,
      {},
      "ADMIN",
    ),
  { scroll },
);
const { list, page, total, loading, loaded, error } = pages;
const load = () => pages.refresh();
function query() {
  appliedKeyword = keyword.value;
  void pages.query();
}
onMounted(pages.load);
watch(status, () => void pages.query());
const busy = ref(false),
  actionError = ref("");
let alive = true;
onScopeDispose(() => {
  alive = false;
});
function act(id: string, action: string) {
  if (busy.value) return;
  if (action !== "approve") {
    actionError.value = "";
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  void send(id, action);
}
async function send(id: string, action: string) {
  if (busy.value) return;
  busy.value = true;
  actionError.value = "";
  try {
    await api(
      `/admin/products/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "ADMIN",
    );
    if (!alive) return;
    pending.value = null;
    await load();
  } catch (cause) {
    if (alive)
      actionError.value = cause instanceof Error ? cause.message : "处理失败";
  } finally {
    if (alive) busy.value = false;
  }
}
</script>
<template>
  <div class="app-stack" :aria-busy="loading">
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
      @action="query"
    />
    <div ref="listStart" />
    <ListStatus
      :loading="loading"
      :loaded="loaded"
      :error="error || (!pending ? actionError : '')"
      :count="list.length"
      @retry="pages.retry"
    />
    <div v-for="p in list" :key="p.id" class="app-card app-stack">
      <div class="app-row">
        <Thumb :src="firstImage(p.images)" :name="p.name" /><span
          class="title-sm"
          :title="p.name"
          >{{ p.name }}</span
        ><Tag :tone="productStatuses[p.displayStatus].tone">{{
          productStatuses[p.displayStatus].label
        }}</Tag
        ><span>{{ money(p.priceCents) }}</span>
      </div>
      <p class="body-sm app-muted">{{ p.store?.name || "店铺资料不可用" }}</p>
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
        :disabled="loading || page <= 1"
        @click="pages.changePage(page - 1)"
        >上一页</Button
      ><Button
        :disabled="loading || page * DEFAULT_PAGE_SIZE >= total"
        @click="pages.changePage(page + 1)"
        >下一页</Button
      >
    </div>
    <Dialog
      :open="!!pending"
      title="填写原因"
      variant="sheet"
      :close-disabled="busy"
      :confirm-discard="true"
      @close="pending = null"
      ><Input v-model="reason" label="处理原因" multiline :disabled="busy" />
      <p v-if="actionError" role="alert" class="app-error body-sm">
        {{ actionError }}
      </p>
      <template #actions
        ><Button
          :disabled="busy || !reason.trim()"
          @click="pending && send(pending.id, pending.action)"
          >提交处理</Button
        ></template
      ></Dialog
    >
  </div>
</template>
