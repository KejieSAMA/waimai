<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import { computed, reactive } from "vue";
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
} from "@waimai/shared";
import BackofficePage from "../../../components/BackofficePage.vue";
import DataTable from "../../../components/DataTable.vue";
import Pagination from "../../../components/Pagination.vue";
import InfoList from "../../../components/InfoList.vue";
import OrderActions from "../components/OrderActions.vue";
import { api } from "../../../common/api";
import { useOrderStream } from "../../../common/events";
import { merchantStore } from "../../../common/merchantStatus";
const route = useRoute(),
  router = useRouter();
const query = computed(() => merchantOrderQuery(route.query));
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
useOrderStream(orders.refresh, { autoConnect: true });
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
const locked = computed(
  () => orders.mutating || merchantStore.value?.status === "FROZEN",
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
        :model-value="query.status"
        :items="orders.tabs"
        @update:model-value="orders.changeStatus"
      />
      <div class="order-search">
        <SearchBar
          v-model="orders.keyword"
          placeholder="搜索订单编号"
          action="查询"
          @action="orders.search"
        />
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
    </template>
    <DataTable
      fill
      class="merchant-order-table"
      :rows="orders.list"
      :columns="columns"
      :reset-key="JSON.stringify(query)"
      :aria-busy="orders.loading"
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
            :disabled="orders.mutating"
            @click="orders.openDetail(row.id)"
            >查看</Button
          ><OrderActions
            :order="row"
            :disabled="locked || orders.loading"
            @act="orders.act"
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
        @update:model-value="orders.changePage"
    /></template>
    <template #overlay>
      <Dialog
        :open="!!orders.detailId"
        title="订单详情"
        variant="modal"
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
            :disabled="orders.mutating"
            @click="orders.closeDetail"
            >关闭</Button
          ><OrderActions
            v-if="orders.detail"
            :order="orders.detail"
            :disabled="locked || orders.detailLoading || !!orders.detailError"
            @act="orders.act"
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
