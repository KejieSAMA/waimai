<script setup lang="ts">
import ProtectedImage from "../../../common/ProtectedImage.vue";
import {
  Button,
  Dialog,
  Input,
  ListCell,
  ListCellGroup,
  SearchBar,
  Select,
  Tabs,
  Tag,
} from "@waimai/ui";
import MerchantRow from "../../../components/MerchantRow.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  type Store,
  type Category,
  type Page,
  storeStatuses,
  phoneTail,
  time,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const route = useRoute(),
  router = useRouter();
const auditOnly = computed(() => route.path.startsWith("/admin/audit"));
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
async function load() {
  await run(async () => {
    const result = await api<Page<Store>>(
      `/admin/merchants?status=${auditOnly.value ? "PENDING" : status.value}&keyword=${encodeURIComponent(keyword.value)}&categoryId=${category.value}&city=${encodeURIComponent(city.value)}&page=${page.value}`,
      {},
      "ADMIN",
    );
    list.value = result.list;
    total.value = result.total;
  });
}
async function open(id: string) {
  await run(async () => {
    detail.value = await api<Store>("/admin/merchants/" + id, {}, "ADMIN");
    logs.value = await api(
      "/admin/audit-logs?targetType=Store&targetId=" + id,
      {},
      "ADMIN",
    );
  });
}
function close() {
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
    if (detail.value?.id === id) detail.value = null;
    await load();
  });
}
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">{{ auditOnly ? "入驻审核" : "商家管理" }}</h1>
    <Tabs
      v-if="!auditOnly"
      v-model="status"
      :items="[
        { key: '', label: '全部商家' },
        ...Object.entries(storeStatuses).map(([key, s]) => ({
          key,
          label: s.label,
        })),
      ]"
    />
    <div class="app-row">
      <SearchBar
        v-model="keyword"
        placeholder="搜索商家"
        action="查询"
        @action="
          page = 1;
          load();
        "
      /><Select
        v-model="category"
        label="类目"
        :options="[
          { value: '', label: '全部类目' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]"
        @update:model-value="
          page = 1;
          load();
        "
      /><Input v-model="city" label="城市" /><Button
        variant="outline"
        @click="
          page = 1;
          load();
        "
        >查询商家</Button
      >
    </div>
    <div class="xz-list">
      <MerchantRow
        v-for="s in list"
        :key="s.id"
        :name="s.name"
        :logo="s.logo"
        :status="s.status"
        :category="s.category?.name"
        :city="s.city"
        :reason="s.rejectReason || s.frozenReason || undefined"
        :actions="[
          {
            label: s.status === 'PENDING' ? '查看审核' : '查看商家',
            onClick: () => open(s.id),
          },
        ]"
      />
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
      :open="!!detail"
      :title="detail?.name"
      variant="sheet"
      @close="close"
      ><div v-if="detail" class="app-stack">
        <Tag :tone="storeStatuses[detail.status].tone">{{
          storeStatuses[detail.status].label
        }}</Tag
        ><ListCellGroup title="店铺信息"
          ><ListCell title="经营类目" :value="detail.category?.name" /><ListCell
            title="所在城市"
            :value="detail.city" /><ListCell
            title="店铺地址"
            :value="detail.address" /><ListCell
            title="联系电话"
            :value="phoneTail(detail.contactPhone)" /><ListCell
            title="营业时间"
            :value="detail.openHours"
        /></ListCellGroup>
        <div class="app-grid">
          <div>
            <h3 class="title-sm">营业执照</h3>
            <ProtectedImage
              v-if="detail.licenseImage"
              role="ADMIN"
              :src="detail.licenseImage"
              alt="营业执照"
              class="app-image"
            />
            <p v-else class="body-sm app-muted">尚未上传</p>
            <p class="body-sm">{{ detail.licenseExpireAt?.slice(0, 10) }}</p>
          </div>
          <div>
            <h3 class="title-sm">食品经营许可证</h3>
            <ProtectedImage
              v-if="detail.foodPermitImage"
              role="ADMIN"
              :src="detail.foodPermitImage"
              alt="食品经营许可证"
              class="app-image"
            />
            <p v-else class="body-sm app-muted">尚未上传</p>
            <p class="body-sm">{{ detail.permitExpireAt?.slice(0, 10) }}</p>
          </div>
        </div>
        <h3 class="title-sm">审核记录</h3>
        <p v-for="log in logs" :key="log.id" class="body-sm app-muted">
          {{ time(log.createdAt) }} · {{ log.action }} {{ log.reason }}
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
            >通过</Button
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
  </div>
</template>
