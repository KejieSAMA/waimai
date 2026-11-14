<script setup lang="ts">
import PageSlot from "../../../components/PageSlot.vue";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  OrderCard,
  Switch,
  Tabs,
} from "@waimai/ui";
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from "vue";
import {
  type Order,
  type Page,
  type Store,
  orderStatuses,
  time,
  canArrive,
  useMerchantArrival,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { usePageChrome } from "../../../common/pageChrome";
import { useMerchantProfile } from "../../../common/merchantProfile";
const chrome = usePageChrome();
const profile = useMerchantProfile(() =>
  api<Store | null>("/merchant/application", {}, "MERCHANT"),
);
const batchMode = ref(false);
const arrivalResultsOpen = ref(false);
const busy = ref(false),
  actionError = ref("");
import { useOrderStream } from "../../../common/events";
const toolsOpen = ref(false),
  keyword = ref(""),
  appliedKeyword = ref("");
const loading = ref(true),
  loadError = ref("");
let version = 0,
  active = true,
  retryPage: number | undefined;
onScopeDispose(() => {
  active = false;
  ++version;
});
async function search(reset = false) {
  if (arrival.pending || busy.value) return;
  batchMode.value = false;
  if (reset) keyword.value = "";
  appliedKeyword.value = keyword.value;
  page.value = 1;
  if (await load()) toolsOpen.value = false;
}
async function more() {
  if (loading.value || busy.value || arrival.pending) return;
  const requested = ++page.value;
  if (!(await load(true)) && page.value === requested)
    page.value = Math.max(1, requested - 1);
}
const counts = ref<Record<string, number>>({});
const list = ref<Order[]>([]),
  status = ref(
    ["PENDING", "PREPARING", "DELIVERING", "REFUNDING", "DONE"].includes(
      new URLSearchParams(location.search).get("status") ?? "",
    )
      ? new URLSearchParams(location.search).get("status")!
      : "PENDING",
  ),
  page = ref(1),
  total = ref(0),
  reason = ref(""),
  pending = ref<{ id: string; action: string } | null>(null);
const filtered = computed(() => list.value);
const arrival = reactive(
  useMerchantArrival((path, options) => api(path, options, "MERCHANT"), {
    rows: () => list.value,
    scope: () => JSON.stringify([status.value, appliedKeyword.value]),
    locked: () =>
      busy.value ||
      loading.value ||
      profile.pending.value ||
      !profile.store.value ||
      !["OPEN", "CLOSED"].includes(profile.store.value.status),
    refresh: async () => {
      await Promise.all([load(), profile.load()]);
    },
  }),
);
const locked = computed(() => arrival.locked);
watch(
  batchMode,
  (value) => {
    chrome.actions = value;
    if (!value) arrival.clearSelection();
  },
  { immediate: true },
);
watch(status, () => {
  batchMode.value = false;
});
watch(
  () => [profile.store.value?.status, arrival.pending],
  () => {
    if (
      !arrival.pending &&
      !["OPEN", "CLOSED"].includes(profile.store.value?.status ?? "")
    ) {
      batchMode.value = false;
      arrival.clearSelection();
    }
  },
);
async function load(append = false, target = page.value) {
  if (!append) retryPage = undefined;
  const current = ++version;
  loading.value = true;
  loadError.value = "";
  try {
    const targets =
      !append && target > 1
        ? Array.from({ length: target }, (_, i) => i + 1)
        : [target];
    const results = await Promise.all(
      targets.map((page) =>
        api<Page<Order>>(
          `/merchant/orders?${status.value === "DONE" ? "status" : "stage"}=${status.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${page}`,
          {},
          "MERCHANT",
        ),
      ),
    );
    if (!active || current !== version) return false;
    const rows = results.flatMap((r) => r.list),
      result = results[0];
    list.value = append
      ? [
          ...list.value.filter(
            (old) => !rows.some((next) => old.id === next.id),
          ),
          ...rows,
        ]
      : [...new Map(rows.map((row) => [row.id, row])).values()];
    page.value = target;
    total.value = result.total;
    const all = result.counts ?? {};
    counts.value = {
      ...all,
      DELIVERING: (all.DELIVERING ?? 0) + (all.PICKUP ?? 0),
    };
    return true;
  } catch (cause) {
    if (current === version) {
      if (append) retryPage = target;
      loadError.value = cause instanceof Error ? cause.message : "订单加载失败";
    }
    return false;
  } finally {
    if (current === version) loading.value = false;
  }
}
const retry = () => (retryPage ? load(true, retryPage) : load());
const stream = useOrderStream(
  async () => {
    if (!arrival.pending) await Promise.all([load(), profile.load()]);
  },
  { autoConnect: true },
);
onMounted(load);
watch(status, () => {
  page.value = 1;
  void load();
});
async function act(id: string, action: string) {
  if (locked.value) return;
  if (action === "arrive") {
    const order = list.value.find((row) => row.id === id);
    if (order) arrival.open([order]);
    return;
  }
  actionError.value = "";
  if (["reject", "refund-reject"].includes(action)) {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  await send(id, action);
}
async function send(id: string, action: string) {
  if (busy.value || arrival.pending) return;
  busy.value = true;
  actionError.value = "";
  try {
    await api(
      `/merchant/orders/${id}/${action}`,
      { method: "POST", body: { reason: reason.value } },
      "MERCHANT",
    );
    if (!active) return;
    pending.value = null;
    await load();
  } catch (e) {
    if (active) actionError.value = e instanceof Error ? e.message : "操作失败";
  } finally {
    if (active) busy.value = false;
  }
}
</script>
<template>
  <div class="app-merchant-orders">
    <PageSlot name="right"
      ><div class="merchant-order-tools">
        <Button
          v-if="status === 'DELIVERING'"
          size="sm"
          variant="text"
          :disabled="arrival.pending || busy || (!batchMode && locked)"
          @click="batchMode = !batchMode"
          >{{ batchMode ? "退出批量" : "批量" }}</Button
        ><NavBarIcon
          name="search"
          label="搜索订单"
          :disabled="arrival.pending || busy"
          @click="toolsOpen = true"
        /></div
    ></PageSlot>
    <Dialog
      :open="toolsOpen"
      title="搜索订单"
      variant="sheet"
      @close="toolsOpen = false"
      ><Input v-model="keyword" label="订单号" /><Switch
        label="开启新订单提醒"
        :model-value="stream.enabled.value"
        @update:model-value="stream.toggle"
      /><template #actions
        ><Button
          size="lg"
          variant="outline"
          :disabled="loading"
          @click="search(true)"
          >重置</Button
        ><Button size="lg" :disabled="loading" @click="search()">查询</Button>
        ></template
      ></Dialog
    >
    <Tabs
      v-model="status"
      :disabled="arrival.pending || busy"
      :items="[
        { key: 'PENDING', label: '新订单', count: counts.PENDING, alert: true },
        {
          key: 'PREPARING',
          label: '备餐中',
          count: counts.PREPARING,
          alert: false,
        },
        {
          key: 'DELIVERING',
          label: '配送中',
          count: counts.DELIVERING,
          alert: false,
        },
        { key: 'DONE', label: '已完成', count: counts.DONE, alert: false },
        {
          key: 'REFUNDING',
          label: '退款',
          count: counts.REFUNDING,
          alert: false,
        },
      ]"
    />
    <p v-if="actionError && !pending" role="alert" class="app-error body-sm">
      {{ actionError }}
    </p>
    <div v-if="profile.error.value" class="app-error body-sm" role="alert">
      {{ profile.error.value
      }}<Button
        variant="text"
        :disabled="profile.pending.value"
        @click="profile.load"
        >重试店铺</Button
      >
    </div>
    <p
      v-if="arrival.error && !arrival.target"
      class="app-error body-sm"
      role="alert"
    >
      {{ arrival.error }}
    </p>
    <div v-if="arrival.results.length" class="app-card body-sm" role="status">
      本次完成 {{ arrival.summary.completed }} 单，已完成
      {{ arrival.summary.alreadyCompleted }} 单，失败
      {{ arrival.summary.failed.length }} 单
      <Button
        v-if="arrival.summary.failed.length"
        variant="text"
        size="sm"
        @click="arrivalResultsOpen = true"
        >查看失败</Button
      >
      <Button
        size="sm"
        variant="text"
        :disabled="arrival.pending"
        @click="arrival.results = []"
        >收起结果</Button
      >
    </div>
    <div v-if="loadError" class="app-error body-sm" role="alert">
      {{ loadError
      }}<Button size="sm" variant="text" :disabled="loading" @click="retry"
        >重试</Button
      >
    </div>
    <div class="xz-list sc-page-list" :aria-busy="loading">
      <section
        v-for="column in [
          {
            key: status,
            label: status
              ? orderStatuses[status as keyof typeof orderStatuses].label
              : '全部订单',
          },
        ]"
        :key="column.key"
        class="app-order-column"
      >
        <div
          v-for="o in filtered"
          :key="o.id"
          :class="{ 'merchant-order-select': batchMode }"
        >
          <Checkbox
            v-if="batchMode"
            :model-value="arrival.selected.includes(o.id)"
            :disabled="locked || !canArrive(o)"
            :aria-label="'选择订单 ' + o.orderNo"
            @update:model-value="
              arrival.select(
                $event
                  ? [...arrival.selected, o.id]
                  : arrival.selected.filter((id) => id !== o.id),
              )
            "
          />
          <OrderCard
            view="merchant"
            :title="
              (o.type === 'PICKUP' ? '到店自提' : '外卖') +
              (JSON.parse(o.addressSnapshot).phone
                ? ' · ' + JSON.parse(o.addressSnapshot).phone
                : '')
            "
            :serial="o.serialOfDay"
            :status="o.status"
            :items="
              o.items.map((i) => ({
                name: i.nameSnapshot,
                qty: i.qty,
                price:
                  i.lineTotalCents == null ? undefined : i.lineTotalCents / 100,
              }))
            "
            :total="o.payCents / 100"
            :time="time(o.createdAt)"
            :note="o.note"
            ><template #actions
              ><template v-if="!batchMode"
                ><Button
                  v-if="canArrive(o)"
                  size="sm"
                  :disabled="locked"
                  @click="act(o.id, 'arrive')"
                  >到达</Button
                ><template v-if="o.status === 'PENDING'"
                  ><Button
                    size="sm"
                    variant="danger-outline"
                    :disabled="locked"
                    @click="act(o.id, 'reject')"
                    >拒单</Button
                  ><Button
                    size="sm"
                    :disabled="locked"
                    @click="act(o.id, 'accept')"
                    >接单</Button
                  ></template
                ><Button
                  v-if="o.status === 'PREPARING'"
                  size="sm"
                  :disabled="locked"
                  @click="act(o.id, 'ready')"
                  >出餐</Button
                ><template v-if="o.status === 'REFUNDING'"
                  ><p v-if="o.disputed" class="body-sm">平台处理中</p>
                  <template v-else
                    ><Button
                      size="sm"
                      variant="danger-outline"
                      :disabled="locked"
                      @click="act(o.id, 'refund-reject')"
                      >拒绝退款</Button
                    ><Button
                      size="sm"
                      :disabled="locked"
                      @click="act(o.id, 'refund-approve')"
                      >同意退款</Button
                    ></template
                  ></template
                ></template
              ></template
            ></OrderCard
          >
        </div>
      </section>
    </div>
    <p v-if="!list.length && !loadError" class="app-empty body">
      {{ loading ? "加载中" : "暂无订单" }}
    </p>
    <div v-if="list.length < total" class="sc-full-actions">
      <Button
        variant="text"
        :disabled="busy || loading || arrival.pending"
        @click="more"
        >加载更多</Button
      >
    </div>
    <PageSlot v-if="batchMode" name="actions"
      ><div class="merchant-arrival-bottom">
        <div class="app-row">
          <Checkbox
            :model-value="
              arrival.selected.length > 0 &&
              arrival.selected.length === arrival.eligible.length
            "
            :indeterminate="
              arrival.selected.length > 0 &&
              arrival.selected.length < arrival.eligible.length
            "
            :disabled="!arrival.canSelectAll"
            label="全选已加载"
            @update:model-value="
              arrival.select(
                $event ? arrival.eligible.map((row) => row.id) : [],
              )
            "
          /><span class="body-sm">已选 {{ arrival.selected.length }} 单</span>
        </div>
        <p class="caption app-muted">每批最多 100 单，仅选择已加载的配送订单</p>
        <Button
          block
          size="lg"
          :disabled="locked || !arrival.selected.length"
          @click="arrival.open()"
          >批量到达</Button
        >
      </div></PageSlot
    >
    <Dialog
      :open="arrivalResultsOpen"
      title="失败明细"
      variant="sheet"
      @close="arrivalResultsOpen = false"
      ><p
        v-for="row in arrival.summary.failed"
        :key="row.id"
        class="arrival-failure body-sm"
      >
        订单 {{ row.orderNo || row.id }}：{{ row.message }}
      </p>
      <template #actions
        ><Button size="lg" @click="arrivalResultsOpen = false"
          >关闭</Button
        ></template
      ></Dialog
    >
    <Dialog
      :open="!!arrival.target"
      title="确认已送达"
      :close-disabled="arrival.pending"
      @close="arrival.close"
      ><p class="body">
        {{ arrival.target?.orders[0]?.storeName }} · 共
        {{ arrival.target?.orders.length }} 单
      </p>
      <p class="body">确认所选外卖订单均已实际送达？提交后将直接变为已完成。</p>
      <p v-if="arrival.error" class="app-error body-sm" role="alert">
        {{ arrival.error }}
      </p>
      <template #actions
        ><Button
          variant="outline"
          :disabled="arrival.pending"
          @click="arrival.close"
          >返回</Button
        ><Button :disabled="arrival.locked" @click="arrival.confirm"
          >确认已送达</Button
        ></template
      ></Dialog
    >
    <Dialog
      :open="!!pending"
      :close-disabled="busy"
      :confirm-discard="true"
      :dirty="!!reason.trim()"
      title="填写原因"
      variant="sheet"
      @close="pending = null"
      ><Input v-model="reason" label="处理原因" multiline :disabled="locked" />
      <p v-if="actionError" class="app-error body-sm" role="alert">
        {{ actionError }}
      </p>
      <template #actions
        ><Button
          :disabled="locked || !reason.trim()"
          @click="pending && send(pending.id, pending.action)"
          >提交处理</Button
        ></template
      ></Dialog
    >
  </div>
</template>

<style scoped>
.arrival-failure {
  overflow-wrap: anywhere;
}
.merchant-order-tools {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.merchant-order-select {
  display: grid;
  grid-template-columns: var(--size-tap) minmax(0, 1fr);
  gap: var(--space-1);
  align-items: start;
}
.merchant-order-select > .xz-check {
  min-height: var(--size-tap);
  justify-content: center;
}
.merchant-arrival-bottom {
  padding: var(--space-2) var(--space-3);
}
.merchant-arrival-bottom p {
  margin: var(--space-2) 0;
}

.app-order-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.app-merchant-orders > .app-row {
  padding: var(--space-2) var(--space-3);
}
</style>
