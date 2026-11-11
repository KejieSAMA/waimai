<script setup lang="ts">
import BackofficePage from "../../../components/BackofficePage.vue";
import FilterBar from "../../../components/FilterBar.vue";
import InfoList from "../../../components/InfoList.vue";
import ProtectedImage from "../../../common/ProtectedImage.vue";
import {
  Button,
  Dialog,
  Input,
  Thumb,
  SearchBar,
  Select,
  Tabs,
  Tag,
} from "@waimai/ui";
import DataTable from "../../../components/DataTable.vue";
import DataTableMedia from "../../../components/DataTableMedia.vue";
import PageHeader from "../../../components/PageHeader.vue";
import Pagination from "../../../components/Pagination.vue";
import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  type Store,
  type Category,
  type Page,
  storeStatuses,
  phoneTail,
  time,
  money,
  auditActionLabel,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const route = useRoute(),
  router = useRouter();
const auditOnly = computed(() => route.path.startsWith("/admin/audit"));
const counts = ref<Record<string, number>>({});
const cities = ref<string[]>([]),
  loading = ref(true),
  loadError = ref("");
const applied = ref({ keyword: "", category: "", city: "" });
let listVersion = 0,
  detailVersion = 0;
onScopeDispose(() => {
  ++listVersion;
  ++detailVersion;
});
async function applyFilters(reset = false) {
  if (reset) keyword.value = category.value = city.value = "";
  applied.value = {
    keyword: keyword.value,
    category: category.value,
    city: city.value,
  };
  page.value = 1;
  return load();
}
const list = ref<Store[]>([]),
  categories = ref<Category[]>([]),
  status = ref(auditOnly.value ? "PENDING" : ""),
  keyword = ref(""),
  category = ref(""),
  city = ref(""),
  page = ref(1),
  total = ref(0),
  detail = ref<Store | null>(null),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const logs = ref<
  { id: string; action: string; reason?: string; createdAt: string }[]
>([]);
const columns = [
  { key: "name", title: "商家" },
  { key: "category", title: "类目" },
  { key: "city", title: "城市" },
  { key: "owner", title: "负责人" },
  { key: "createdAt", title: "创建时间" },
  { key: "rating", title: "评分", num: true, align: "right" as const },
  { key: "status", title: "状态" },
  { key: "monthlySales", title: "月订单", num: true, align: "right" as const },
  { key: "actions", title: "操作" },
];
async function load() {
  const current = ++listVersion;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await api<Page<Store>>(
      `/admin/merchants?status=${auditOnly.value ? "PENDING" : status.value}&keyword=${encodeURIComponent(applied.value.keyword)}&categoryId=${applied.value.category}&city=${encodeURIComponent(applied.value.city)}&page=${page.value}`,
      {},
      "ADMIN",
    );
    if (current !== listVersion) return false;
    list.value = result.list;
    total.value = result.total;
    counts.value = result.counts ?? {};
    cities.value = result.filterOptions?.cities ?? [];
    return true;
  } catch (cause) {
    if (current === listVersion)
      loadError.value = cause instanceof Error ? cause.message : "商家加载失败";
    return false;
  } finally {
    if (current === listVersion) loading.value = false;
  }
}
async function open(id: string) {
  const current = ++detailVersion;
  await run(async () => {
    const [store, history] = await Promise.all([
      api<Store>("/admin/merchants/" + id, {}, "ADMIN"),
      api<typeof logs.value>(
        "/admin/audit-logs?targetType=Store&targetId=" + id,
        {},
        "ADMIN",
      ),
    ]);
    if (current !== detailVersion) return;
    detail.value = store;
    logs.value = history;
  });
}
function close() {
  ++detailVersion;
  detail.value = null;
  if (route.params.id) void router.push("/admin/audit");
}
onMounted(async () => {
  await run(async () => {
    categories.value = await api<Category[]>("/public/categories");
  });
  await load();
  if (typeof route.params.id === "string") await open(route.params.id);
});
watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") void open(id);
    else {
      ++detailVersion;
      detail.value = null;
      pending.value = null;
    }
  },
);
watch(status, () => {
  page.value = 1;
  void load();
});
function act(id: string, action: string) {
  if (["reject", "freeze"].includes(action)) {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  void send(id, action);
}
async function send(id: string, action: string) {
  await run(async () => {
    await api(
      `/admin/merchants/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "ADMIN",
    );
    pending.value = null;
    if (detail.value?.id === id) close();
    await load();
  });
}
</script>
<template>
  <BackofficePage :body-scroll="false">
    <template #header>
      <PageHeader
        :title="auditOnly ? '入驻审核' : '商家管理'"
        :subtitle="auditOnly ? '核验入驻资料与证照' : '管理平台商家与经营状态'"
      /><Tabs
        v-if="!auditOnly"
        v-model="status"
        :items="[
          { key: '', label: '全部', count: counts.all },
          {
            key: 'PENDING',
            label: '待审核',
            count: counts.PENDING,
            alert: true,
          },
          { key: 'OPEN', label: '营业中', count: counts.OPEN },
          { key: 'CLOSED', label: '休息中', count: counts.CLOSED },
          { key: 'FROZEN', label: '已冻结', count: counts.FROZEN },
        ]"
      />
      <FilterBar @search="applyFilters()" @reset="applyFilters(true)">
        <SearchBar
          v-model="keyword"
          placeholder="搜索商家名称"
          @action="applyFilters()"
        />
        <Select
          v-model="category"
          label="类目"
          :options="[
            { value: '', label: '全部类目' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]"
        />
        <Select
          v-model="city"
          label="城市"
          :options="[
            { value: '', label: '全部城市' },
            ...cities.map((value) => ({ value, label: value })),
          ]"
        />
      </FilterBar>
      <div v-if="loadError" class="app-error body-sm" role="alert">
        {{ loadError
        }}<Button variant="text" size="sm" :disabled="loading" @click="load"
          >重试</Button
        >
      </div>
    </template>
    <DataTable
      fill
      :reset-key="JSON.stringify([page, status, applied])"
      :rows="list"
      :columns="columns"
      :active-key="detail?.id"
      :aria-busy="loading"
      ><template #name="{ row }"
        ><DataTableMedia
          :name="row.name"
          :src="row.logo"
          kind="logo"
          :sub="row.rejectReason || row.frozenReason || undefined" /></template
      ><template #owner="{ row }">{{ row.owner?.name || "未提供" }}</template
      ><template #createdAt="{ row }">{{
        row.createdAt ? time(row.createdAt) : "未提供"
      }}</template
      ><template #category="{ row }">{{ row.category?.name }}</template
      ><template #status="{ row }"
        ><Tag :tone="storeStatuses[row.status].tone">{{
          storeStatuses[row.status].label
        }}</Tag></template
      ><template #actions="{ row }"
        ><div class="app-table-actions">
          <Button size="sm" variant="text" @click="open(row.id)">{{
            row.status === "PENDING" ? "审核" : "查看"
          }}</Button
          ><Button
            v-if="['OPEN', 'CLOSED'].includes(row.status)"
            size="sm"
            variant="danger-text"
            @click="act(row.id, 'freeze')"
            >冻结</Button
          ><Button
            v-if="row.status === 'FROZEN'"
            size="sm"
            variant="text"
            @click="act(row.id, 'unfreeze')"
            >解冻</Button
          >
        </div></template
      ><template #empty>{{
        loading ? "加载中" : loadError ? "商家加载失败" : "暂无商家"
      }}</template></DataTable
    >
    <Dialog
      :open="!!detail"
      :title="auditOnly ? '入驻审核' : '商家详情'"
      variant="drawer"
      @close="close"
      ><div v-if="detail" class="app-stack">
        <div class="ds-head">
          <Thumb kind="logo" size="lg" :src="detail.logo" :name="detail.name" />
          <div class="ds-head__main">
            <div class="ds-head__top">
              <span class="title">{{ detail.name }}</span
              ><Tag :tone="storeStatuses[detail.status].tone">{{
                storeStatuses[detail.status].label
              }}</Tag>
            </div>
            <span class="body-md app-muted"
              >{{ detail.category?.name }} · {{ detail.city }} · 第
              {{ detail.submitCount || 1 }} 次提交</span
            >
          </div>
        </div>
        <h3 class="ds-block title-sm">店铺信息</h3>
        <InfoList
          :items="[
            { label: '门店地址', value: detail.address },
            { label: '营业时间', value: detail.openHours },
            {
              label: '起送 / 配送',
              value:
                money(detail.minOrderCents) +
                ' / ' +
                money(detail.deliveryFeeCents),
            },
            {
              label: '负责人',
              value:
                (detail.owner?.name || '') +
                ' · ' +
                phoneTail(detail.contactPhone),
            },
            {
              label: '提交时间',
              value: detail.createdAt ? time(detail.createdAt) : '未提供',
            },
          ]"
        />
        <h3 class="ds-block title-sm">资质证照</h3>
        <div class="ds-docs">
          <div class="ds-doc">
            <h3 class="title-sm">营业执照</h3>
            <ProtectedImage
              v-if="detail.licenseImage"
              role="ADMIN"
              :src="detail.licenseImage"
              alt="营业执照"
              class="app-image"
            />
            <p v-else class="body-sm app-muted">尚未上传</p>
            <p class="body-sm">
              {{
                detail.licenseExpireAt
                  ? "有效期至 " + detail.licenseExpireAt.slice(0, 10)
                  : "未提供到期日期"
              }}
            </p>
          </div>
          <div class="ds-doc">
            <h3 class="title-sm">食品经营许可证</h3>
            <ProtectedImage
              v-if="detail.foodPermitImage"
              role="ADMIN"
              :src="detail.foodPermitImage"
              alt="食品经营许可证"
              class="app-image"
            />
            <p v-else class="body-sm app-muted">尚未上传</p>
            <p class="body-sm">
              {{
                detail.permitExpireAt
                  ? "有效期至 " + detail.permitExpireAt.slice(0, 10)
                  : "未提供到期日期"
              }}
            </p>
          </div>
        </div>
        <h3 class="title-sm">审核记录</h3>
        <p v-for="log in logs" :key="log.id" class="body-sm app-muted">
          {{ time(log.createdAt) }} · {{ auditActionLabel(log.action) }}
          {{ log.reason }}
        </p>
        <p v-if="!logs.length" class="body-sm app-muted">暂无审核记录</p>
      </div>
      <template #actions
        ><template v-if="detail?.status === 'PENDING'"
          ><Button
            variant="danger-outline"
            :disabled="busy"
            @click="act(detail.id, 'reject')"
            >驳回</Button
          ><Button :disabled="busy" @click="act(detail.id, 'approve')"
            >审核通过</Button
          ></template
        ><Button
          v-if="detail && ['OPEN', 'CLOSED'].includes(detail.status)"
          variant="danger-outline"
          @click="act(detail.id, 'freeze')"
          >冻结</Button
        ><Button
          v-if="detail?.status === 'FROZEN'"
          @click="act(detail.id, 'unfreeze')"
          >解冻</Button
        ><Button variant="outline" @click="close">关闭</Button></template
      ></Dialog
    ><Dialog
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
    <template #footer
      ><Pagination v-model="page" :total="total" @update:model-value="load"
    /></template>
  </BackofficePage>
</template>
