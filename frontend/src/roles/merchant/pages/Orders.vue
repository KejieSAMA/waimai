<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Price } from "@waimai/ui";
import {
  Button,
  Dialog,
  Input,
  SearchBar,
  Tabs,
  Tag,
} from "../../../components/pc";
import {
  money,
  merchantOrderContact,
  merchantOrderQuery,
  orderStatuses,
  time,
  useMerchantOrders,
  useMerchantOrderBatch,
  merchantActionsForStatus,
  merchantOrderActions,
  merchantActionNeedsReason,
  canApplyMerchantAction,
} from "@waimai/shared";
import BackofficePage from "../../../components/BackofficePage.vue";
import DataTable from "../../../components/DataTable.vue";
import Pagination from "../../../components/Pagination.vue";
import InfoList from "../../../components/InfoList.vue";
import OrderActions from "../components/OrderActions.vue";
import { api } from "../../../common/api";
import { useOrderStream } from "../../../common/events";
import {
  merchantStore,
  loadMerchantStore,
} from "../../../common/merchantStatus";
import { useAuth } from "../../../common/auth";
const route = useRoute(),
  router = useRouter();
const query = computed(() => merchantOrderQuery(route.query));
const ownerId = useAuth().account?.id;
const orders = reactive(
  useMerchantOrders(
    (path, options) => api(path, options, "MERCHANT"),
    query,
    (value, replace) =>
      router[replace ? "replace" : "push"]({
        path: "/merchant/orders",
        query: {
          ...route.query,
          status: value.status || undefined,
          keyword: value.keyword || undefined,
          page: String(value.page),
        },
      }),
  ),
);
const arrival = reactive(
  useMerchantOrderBatch((path, options) => api(path, options, "MERCHANT"), {
    rows: () => orders.list,
    scope: () => JSON.stringify(query.value),
    locked: () =>
      orders.mutating ||
      orders.loading ||
      !merchantStore.value ||
      !["OPEN", "CLOSED"].includes(merchantStore.value.status),
    refresh: refreshOrders,
  }),
);
const batchActions = computed(() =>
  merchantActionsForStatus(query.value.status),
);
const batchLabel = computed(() =>
  arrival.action ? merchantOrderActions[arrival.action].label : "",
);
const confirmAction = computed(() =>
  arrival.target ? merchantOrderActions[arrival.target.action] : undefined,
);
const rowSelectable = (row: Parameters<typeof canApplyMerchantAction>[0]) =>
  !!arrival.action && canApplyMerchantAction(row, arrival.action);
const arrivalResultsOpen = ref(false);
const arrivalDialog = ref<InstanceType<typeof Dialog>>();
async function refreshOrders() {
  await Promise.all([
    orders.refresh(),
    ownerId ? loadMerchantStore(ownerId, true) : Promise.resolve(),
  ]);
}
function act(id: string, action: string) {
  if (action === "arrive") {
    const order =
      orders.list.find((row) => row.id === id) ??
      (orders.detail?.id === id ? orders.detail : undefined);
    if (order) arrival.open({ order, action: "arrive" });
  } else if (!arrival.pending) orders.act(id, action);
}
useOrderStream(
  async () => {
    if (!arrival.pending) await refreshOrders();
  },
  { autoConnect: true },
);
const columns = [
  {
    key: "index",
    title: "序号",
    width: "calc(var(--space-4) * 4)",
    num: true,
    align: "right" as const,
  },
  { key: "goods", title: "商品与备注" },
  { key: "createdAt", title: "下单时间", width: "calc(var(--space-6) * 5)" },
  {
    key: "payCents",
    title: "实付",
    num: true,
    align: "right" as const,
    width: "calc(var(--space-4) * 5)",
  },
  { key: "status", title: "状态", width: "calc(var(--space-6) * 4)" },
  {
    key: "actions",
    title: "操作",
    align: "right" as const,
    width: "calc(var(--space-6) * 8)",
  },
];
const locked = computed(() => arrival.pending || orders.mutating);
const operationLocked = computed(
  () =>
    locked.value ||
    !merchantStore.value ||
    !["OPEN", "CLOSED"].includes(merchantStore.value.status),
);
watch(
  () => [merchantStore.value?.status, arrival.pending],
  () => {
    if (
      !arrival.pending &&
      !["OPEN", "CLOSED"].includes(merchantStore.value?.status ?? "")
    )
      arrival.choose();
  },
);
const detailAddress = computed(() => {
  try {
    return JSON.parse(orders.detail?.addressSnapshot || "{}");
  } catch {
    return {};
  }
});
</script>
<template>
  <BackofficePage label="订单列表" :body-scroll="false">
    <template #header>
      <Tabs
        :disabled="locked"
        :model-value="query.status"
        :items="orders.tabs"
        @update:model-value="orders.changeStatus"
      />
      <div class="order-tools">
        <div class="order-search">
          <SearchBar
            v-model="orders.keyword"
            placeholder="搜索订单编号"
            action="查询"
            @action="!locked && orders.search()"
          />
        </div>
        <template v-if="batchActions.length">
          <Button
            v-for="action in batchActions"
            :key="action"
            size="sm"
            :variant="arrival.action === action ? 'primary' : 'outline'"
            :disabled="arrival.locked"
            @click="arrival.choose(action)"
            >批量{{ merchantOrderActions[action].label }}</Button
          >
          <Button
            v-if="arrival.action"
            variant="text"
            size="sm"
            :disabled="locked"
            @click="arrival.choose()"
            >退出批量</Button
          >
        </template>
      </div>
      <p v-if="orders.error" class="app-error body-sm" role="alert">
        {{ orders.error
        }}<Button variant="text" :disabled="orders.loading" @click="orders.load"
          >重试</Button
        >
      </p>
      <p
        v-if="orders.actionError && !orders.detailId && !orders.reasonTarget"
        class="app-error body-sm"
        role="alert"
      >
        {{ orders.actionError }}
      </p>
      <div
        v-if="arrival.results.length"
        class="arrival-result body-sm"
        role="status"
      >
        {{
          arrival.resultAction
            ? merchantOrderActions[arrival.resultAction].label
            : ""
        }}：成功 {{ arrival.summary.applied }} 单，已处理
        {{ arrival.summary.alreadyApplied }} 单，失败
        {{ arrival.summary.failed.length }} 单
        <Button
          v-if="arrival.summary.failed.length"
          variant="text"
          size="sm"
          @click="arrivalResultsOpen = true"
          >查看失败</Button
        >
        <Button
          variant="text"
          size="sm"
          :disabled="arrival.pending"
          @click="arrival.results = []"
          >收起结果</Button
        >
      </div>
      <p
        v-if="arrival.error && !arrival.target"
        class="app-error body-sm"
        role="alert"
      >
        {{ arrival.error }}
      </p>
    </template>
    <DataTable
      fill
      class="merchant-order-table"
      :rows="orders.list"
      :columns="columns"
      :reset-key="JSON.stringify(query)"
      :aria-busy="orders.loading"
      :selectable="!!arrival.action"
      :row-selectable="rowSelectable"
      :selection-disabled="arrival.locked"
      :selected="arrival.selected"
      @select="arrival.select"
    >
      <template #batchActions
        ><Button
          size="sm"
          :disabled="arrival.locked || !arrival.selected.length"
          @click="arrival.open()"
          >批量{{ batchLabel }}</Button
        ></template
      >
      <template #index="{ row }">{{
        (query.page - 1) * DEFAULT_PAGE_SIZE + orders.list.indexOf(row) + 1
      }}</template>
      <template #goods="{ row }"
        ><div class="order-row__goods">
          <span
            class="title-sm order-row__names"
            :title="row.items.map((item) => item.nameSnapshot).join('、')"
            >{{
              row.items
                .slice(0, 2)
                .map((item) => item.nameSnapshot)
                .join("、")
            }}{{ row.items.length > 2 ? " 等" : "" }}</span
          ><span class="body-sm app-muted order-row__count"
            >共
            {{ row.items.reduce((sum, item) => sum + item.qty, 0) }} 件</span
          ><span
            v-if="row.note"
            class="body-sm app-muted order-row__note"
            :title="row.note"
            >备注 {{ row.note }}</span
          >
        </div></template
      >
      <template #createdAt="{ row }"
        ><time class="body-sm app-muted">{{
          time(row.createdAt)
        }}</time></template
      >
      <template #payCents="{ row }"
        ><Price :value="row.payCents / 100" tone="ink" size="sm"
      /></template>
      <template #status="{ row }"
        ><Tag :tone="orderStatuses[row.status].tone">{{
          orderStatuses[row.status].label
        }}</Tag></template
      >
      <template #actions="{ row }"
        ><div class="order-row__actions">
          <Button
            size="sm"
            variant="text"
            :disabled="locked"
            @click="orders.openDetail(row.id)"
            >查看</Button
          ><OrderActions
            :order="row"
            :disabled="operationLocked || orders.loading"
            @act="act"
          /></div
      ></template>
      <template #empty>{{
        orders.loading ? "加载中" : orders.error ? "订单加载失败" : "暂无订单"
      }}</template>
    </DataTable>
    <template #footer
      ><Pagination
        :model-value="query.page"
        :total="orders.total"
        @update:model-value="!locked && orders.changePage($event)"
    /></template>
    <template #overlay>
      <Dialog
        :open="arrivalResultsOpen"
        title="失败明细"
        variant="modal"
        @close="arrivalResultsOpen = false"
        ><p
          v-for="row in arrival.summary.failed"
          :key="row.id"
          class="arrival-failure body-md"
        >
          订单 {{ row.orderNo || row.id }}：{{ row.message }}
        </p>
        <template #actions
          ><Button @click="arrivalResultsOpen = false">关闭</Button></template
        ></Dialog
      >
      <Dialog
        :open="!!arrival.target"
        ref="arrivalDialog"
        :title="'确认' + (confirmAction?.label ?? '')"
        variant="modal"
        :close-disabled="arrival.pending"
        :confirm-discard="
          !!arrival.target && merchantActionNeedsReason(arrival.target.action)
        "
        :dirty="!!arrival.reason.trim()"
        @close="arrival.close"
      >
        <p class="body-md">
          {{ arrival.target?.orders[0]?.storeName }} · 共
          {{ arrival.target?.orders.length }} 单
        </p>
        <p class="body-md">
          {{ confirmAction?.notice }}
        </p>
        <Input
          v-if="
            arrival.target && merchantActionNeedsReason(arrival.target.action)
          "
          v-model="arrival.reason"
          label="统一处理原因"
          multiline
          :maxlength="500"
          :disabled="arrival.pending"
        />
        <p v-if="arrival.error" class="app-error body-sm" role="alert">
          {{ arrival.error }}
        </p>
        <template #actions
          ><Button
            variant="outline"
            :disabled="arrival.pending"
            @click="arrivalDialog?.close()"
            >返回</Button
          ><Button :disabled="arrival.locked" @click="arrival.confirm"
            >确认{{ confirmAction?.label }}</Button
          ></template
        >
      </Dialog>
      <Dialog
        :open="!!orders.detailId"
        title="订单详情"
        variant="modal"
        :close-disabled="locked"
        @close="orders.closeDetail"
      >
        <p v-if="orders.detailLoading" class="body-sm app-muted" role="status">
          核对订单信息中
        </p>
        <p v-if="orders.detailError" class="app-error body-sm" role="alert">
          {{ orders.detailError
          }}<Button
            variant="text"
            :disabled="orders.detailLoading"
            @click="orders.loadDetail"
            >重试</Button
          >
        </p>
        <div v-if="orders.detail" class="app-stack">
          <div class="app-row">
            <span class="title">#{{ orders.detail.serialOfDay }}</span
            ><Tag :tone="orderStatuses[orders.detail.status].tone">{{
              orderStatuses[orders.detail.status].label
            }}</Tag>
          </div>
          <InfoList
            :items="[
              { label: '订单编号', value: orders.detail.orderNo },
              { label: '配送方式', value: merchantOrderContact(orders.detail) },
              { label: '联系人', value: detailAddress.contact || '—' },
              {
                label: '收货地址',
                value:
                  detailAddress.detail ||
                  (orders.detail.type === 'PICKUP' ? '到店自提' : '—'),
              },
              { label: '下单时间', value: time(orders.detail.createdAt) },
            ]"
          />
          <div class="order-detail__items">
            <div
              v-for="item in orders.detail.items"
              :key="item.id"
              class="order-detail__item body-md"
            >
              <span>{{ item.nameSnapshot }} × {{ item.qty }}</span
              ><Price
                v-if="item.lineTotalCents != null"
                :value="item.lineTotalCents / 100"
                size="sm"
                tone="ink"
              />
            </div>
          </div>
          <InfoList
            :items="[
              { label: '商品小计', value: money(orders.detail.itemsCents) },
              {
                label: '配送费',
                value: orders.detail.deliveryFeeCents
                  ? money(orders.detail.deliveryFeeCents)
                  : '免配送费',
              },
              ...(orders.detail.discountCents
                ? [
                    {
                      label: '满减优惠',
                      value: '−' + money(orders.detail.discountCents),
                    },
                  ]
                : []),
              { label: '实付', value: money(orders.detail.payCents) },
              { label: '备注', value: orders.detail.note || '无' },
              ...(orders.detail.refundReason
                ? [{ label: '退款原因', value: orders.detail.refundReason }]
                : []),
            ]"
          />
        </div>
        <p v-if="orders.actionError" class="app-error body-sm" role="alert">
          {{ orders.actionError }}
        </p>
        <template #actions
          ><Button
            variant="outline"
            :disabled="locked"
            @click="orders.closeDetail"
            >关闭</Button
          ><OrderActions
            v-if="orders.detail"
            :order="orders.detail"
            :disabled="
              operationLocked || orders.detailLoading || !!orders.detailError
            "
            @act="act"
        /></template>
      </Dialog>
      <Dialog
        :open="!!orders.reasonTarget"
        title="填写原因"
        variant="modal"
        @close="!orders.mutating && (orders.reasonTarget = undefined)"
        ><Input
          v-model="orders.reason"
          label="处理原因"
          multiline
          maxlength="500"
          :disabled="orders.mutating"
        />
        <p v-if="orders.actionError" class="app-error body-sm">
          {{ orders.actionError }}
        </p>
        <template #actions
          ><Button
            variant="outline"
            :disabled="orders.mutating"
            @click="orders.reasonTarget = undefined"
            >取消</Button
          ><Button
            :disabled="orders.mutating || !orders.reason.trim()"
            @click="
              orders.reasonTarget &&
              orders.send(orders.reasonTarget.id, orders.reasonTarget.action)
            "
            >提交处理</Button
          ></template
        ></Dialog
      >
    </template>
  </BackofficePage>
</template>
<style scoped>
.order-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.order-search {
  flex: 1 1 calc(var(--size-sidebar) * 2);
}
.arrival-result {
  padding: var(--space-3);
  background: var(--surface-raised);
  border-radius: var(--radius-md);
}
.arrival-result p {
  margin: var(--space-2) 0 0;
  overflow-wrap: anywhere;
}
.arrival-failure {
  overflow-wrap: anywhere;
}
.order-search {
  max-width: calc(var(--size-sidebar) * 2);
}
.order-search :deep(.xz-search) {
  padding: 0;
}
.merchant-order-table :deep(table) {
  table-layout: fixed;
  min-width: calc(var(--size-sidebar) * 4.5);
}
.merchant-order-table :deep(td) {
  padding-top: var(--space-2);
  padding-bottom: var(--space-2);
}
.order-row__goods {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.order-row__names,
.order-row__note {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-row__names {
  flex: 1 1 auto;
}
.order-row__count {
  flex: none;
  white-space: nowrap;
}
.order-row__note {
  flex: 0 1 40%;
}
.order-row__actions {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  justify-content: flex-end;
}
.order-detail__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.order-detail__item {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
}
.order-detail__item > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
