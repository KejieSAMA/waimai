<script setup lang="ts">
import PageSlot from "../../../components/PageSlot.vue";
import NavBarIcon from "../../../components/NavBarIcon.vue";
import { Button, Dialog, Input, OrderCard, Switch, Tabs } from "@waimai/ui";
import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import { type Order, type Page, orderStatuses, time } from "@waimai/shared";
import { api } from "../../../common/api";
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
  if (reset) keyword.value = "";
  appliedKeyword.value = keyword.value;
  page.value = 1;
  if (await load()) toolsOpen.value = false;
}
async function more() {
  if (loading.value || busy.value) return;
  const requested = ++page.value;
  if (!(await load(true)) && page.value === requested)
    page.value = Math.max(1, requested - 1);
}
const counts = ref<Record<string, number>>({});
const list = ref<Order[]>([]),
  status = ref(
    ["PENDING", "PREPARING", "DELIVERING", "REFUNDING"].includes(
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
          `/merchant/orders?stage=${status.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${page}`,
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
const stream = useOrderStream(load);
onMounted(load);
watch(status, () => {
  page.value = 1;
  void load();
});
async function act(id: string, action: string) {
  if (busy.value) return;
  actionError.value = "";
  if (["reject", "refund-reject"].includes(action)) {
    pending.value = { id, action };
    reason.value = "";
    return;
  }
  await send(id, action);
}
async function send(id: string, action: string) {
  if (busy.value) return;
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
      ><NavBarIcon name="search" label="搜索订单" @click="toolsOpen = true"
    /></PageSlot>
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
        <OrderCard
          v-for="o in filtered"
          :key="o.id"
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
            ><template v-if="o.status === 'PENDING'"
              ><Button
                size="sm"
                variant="danger-outline"
                :disabled="busy"
                @click="act(o.id, 'reject')"
                >拒单</Button
              ><Button size="sm" :disabled="busy" @click="act(o.id, 'accept')"
                >接单</Button
              ></template
            ><Button
              v-if="o.status === 'PREPARING'"
              size="sm"
              :disabled="busy"
              @click="act(o.id, 'ready')"
              >出餐</Button
            ><template v-if="o.status === 'REFUNDING'"
              ><p v-if="o.disputed" class="body-sm">平台处理中</p>
              <template v-else
                ><Button
                  size="sm"
                  variant="danger-outline"
                  :disabled="busy"
                  @click="act(o.id, 'refund-reject')"
                  >拒绝退款</Button
                ><Button
                  size="sm"
                  :disabled="busy"
                  @click="act(o.id, 'refund-approve')"
                  >同意退款</Button
                ></template
              ></template
            ></template
          ></OrderCard
        >
      </section>
    </div>
    <p v-if="!list.length && !loadError" class="app-empty body">
      {{ loading ? "加载中" : "暂无订单" }}
    </p>
    <div v-if="list.length < total" class="sc-full-actions">
      <Button variant="text" :disabled="busy || loading" @click="more"
        >加载更多</Button
      >
    </div>
    <Dialog
      :open="!!pending"
      :close-disabled="busy"
      :confirm-discard="true"
      :dirty="!!reason.trim()"
      title="填写原因"
      variant="sheet"
      @close="pending = null"
      ><Input v-model="reason" label="处理原因" multiline :disabled="busy" />
      <p v-if="actionError" class="app-error body-sm" role="alert">
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

<style scoped>
.app-order-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.app-merchant-orders > .app-row {
  padding: var(--space-2) var(--space-3);
}
</style>
