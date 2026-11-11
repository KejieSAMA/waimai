<script setup lang="ts">
import PageSlot from "../../../components/PageSlot.vue";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import { Button, Dialog, Input, SearchBar, Select, Tabs } from "@waimai/ui";
import MerchantRow from "../../../components/MerchantRow.vue";
import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { type Store, type Category, type Page } from "@waimai/shared";
import { api } from "../../../common/api";
import { run, busy } from "../../../common/feedback";
const route = useRoute(),
  router = useRouter();
const auditOnly = computed(() => route.path.startsWith("/admin/audit"));
const filters = ref(false);
const counts = ref<Record<string, number>>({});
const cities = ref<string[]>([]),
  loading = ref(true),
  loadError = ref("");
const applied = ref({ keyword: "", category: "", city: "" });
let listVersion = 0;
onScopeDispose(() => {
  ++listVersion;
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
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
async function load(append = false) {
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
    list.value = append
      ? [
          ...list.value.filter(
            (old) => !result.list.some((item) => item.id === old.id),
          ),
          ...result.list,
        ]
      : result.list;
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
async function more() {
  if (loading.value) return;
  const requested = ++page.value;
  if (!(await load(true)) && page.value === requested)
    page.value = Math.max(1, requested - 1);
}

async function open(id: string) {
  await router.push(
    "/admin/audit/" + id + (auditOnly.value ? "" : "?from=merchants"),
  );
}
onMounted(async () => {
  await run(async () => {
    categories.value = await api<Category[]>("/public/categories");
  });
  await load();
});
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
    page.value = 1;
    await load();
  });
}
</script>
<template>
  <div class="app-merchant-list">
    <PageSlot name="right"
      ><NavBarIcon name="filter" label="筛选商家" @click="filters = true"
    /></PageSlot>
    <div class="sc-strip app-merchant-search">
      <SearchBar
        v-model="keyword"
        placeholder="搜索商家名称"
        @action="applyFilters()"
      />
    </div>
    <Tabs
      v-if="!auditOnly"
      v-model="status"
      :items="[
        { key: '', label: '全部', count: counts.all },
        { key: 'PENDING', label: '待审核', count: counts.PENDING },
        { key: 'OPEN', label: '营业中', count: counts.OPEN },
        { key: 'FROZEN', label: '已冻结', count: counts.FROZEN },
      ]"
    />
    <Dialog
      :open="filters"
      title="筛选商家"
      variant="sheet"
      @close="filters = false"
      ><div class="app-stack">
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
        <p v-if="loadError" class="app-error body-sm" role="alert">
          {{ loadError }}
        </p>
      </div>
      <template #actions
        ><Button
          size="lg"
          variant="outline"
          :disabled="loading"
          @click="
            applyFilters(true).then((ok) => {
              if (ok) filters = false;
            })
          "
          >重置</Button
        ><Button
          size="lg"
          :disabled="loading"
          @click="
            applyFilters().then((ok) => {
              if (ok) filters = false;
            })
          "
          >查询</Button
        ></template
      >
    </Dialog>
    <div v-if="loadError" class="app-error body-sm" role="alert">
      {{ loadError
      }}<Button variant="text" size="sm" :disabled="loading" @click="load()"
        >重试</Button
      >
    </div>
    <p v-if="loading && !list.length" class="app-empty body-sm" role="status">
      加载中
    </p>
    <p v-else-if="!list.length && !loadError" class="app-empty body-sm">
      暂无商家
    </p>
    <div class="xz-list sc-page-list">
      <MerchantRow
        v-for="s in list"
        :key="s.id"
        :name="s.name"
        :logo="s.logo"
        :status="s.status"
        :category="s.category?.name"
        :city="s.city"
        :owner="s.owner?.name"
        :joined="s.createdAt?.slice(0, 10)"
        :orders="s.monthlySales"
        :rating="s.rating"
        :reason="s.rejectReason || s.frozenReason || undefined"
        :actions="
          s.status === 'PENDING'
            ? [
                {
                  label: '驳回',
                  variant: 'danger-outline',
                  onClick: () => act(s.id, 'reject'),
                },
                {
                  label: '查看并审核',
                  variant: 'primary',
                  onClick: () => open(s.id),
                },
              ]
            : [
                { label: '查看', onClick: () => open(s.id) },
                ...(['OPEN', 'CLOSED'].includes(s.status)
                  ? [
                      {
                        label: '冻结',
                        variant: 'danger-outline' as const,
                        onClick: () => act(s.id, 'freeze'),
                      },
                    ]
                  : s.status === 'FROZEN'
                    ? [
                        {
                          label: '解冻',
                          variant: 'secondary' as const,
                          onClick: () => act(s.id, 'unfreeze'),
                        },
                      ]
                    : []),
              ]
        "
      />
    </div>
    <div v-if="list.length < total" class="sc-full-actions">
      <Button variant="text" :disabled="busy || loading" @click="more"
        >加载更多</Button
      >
    </div>
    <Dialog
      :open="!!pending"
      title="填写原因"
      variant="sheet"
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

<style scoped>
.app-merchant-search {
  padding: var(--space-2) var(--space-3);
}
</style>
