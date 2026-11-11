<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Button,
  Dialog,
  Input,
  SearchBar,
  Switch,
  Tabs,
  Tag,
  Price,
} from "@waimai/ui";
import {
  money,
  merchantOrderContact,
  merchantOrderQuery,
  orderStatuses,
  time,
  useMerchantOrders,
} from "@waimai/shared";
import BackofficePage from "../../../components/BackofficePage.vue";
import PageHeader from "../../../components/PageHeader.vue";
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
const stream = useOrderStream(orders.refresh);
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
  <BackofficePage
    label="订单列表"
    :reset-key="query.status + ':' + query.keyword + ':' + query.page"
  >
    <template #header>
      <PageHeader title="订单" subtitle="接单、出餐与退款处理"
        ><template #actions
          ><Switch
            label="开启提醒"
            :model-value="stream.enabled.value"
            @update:model-value="stream.toggle"
          /><Button
            variant="outline"
            :disabled="orders.loading || orders.mutating"
            @click="orders.refresh"
            >刷新订单</Button
          ></template
        ></PageHeader
      >
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
    <div class="order-list" :aria-busy="orders.loading">
      <article v-for="order in orders.list" :key="order.id" class="order-row">
        <div class="order-row__identity">
          <span class="title-sm">#{{ order.serialOfDay }}</span
          ><span class="caption app-muted">{{ order.orderNo }}</span
          ><span class="body-sm">{{ merchantOrderContact(order) }}</span>
        </div>
        <div class="order-row__goods">
          <p
            class="title-sm"
            :title="order.items.map((item) => item.nameSnapshot).join('、')"
          >
            {{
              order.items
                .slice(0, 2)
                .map((item) => item.nameSnapshot)
                .join("、")
            }}{{ order.items.length > 2 ? " 等" : "" }}
          </p>
          <span class="body-sm app-muted"
            >共
            {{ order.items.reduce((sum, item) => sum + item.qty, 0) }} 件</span
          >
          <p v-if="order.note" class="body-sm app-muted" :title="order.note">
            备注 {{ order.note }}
          </p>
        </div>
        <time class="body-sm app-muted">{{ time(order.createdAt) }}</time>
        <Price :value="order.payCents / 100" tone="ink" />
        <Tag :tone="orderStatuses[order.status].tone">{{
          orderStatuses[order.status].label
        }}</Tag>
        <div class="order-row__actions">
          <Button
            size="sm"
            variant="text"
            :disabled="orders.mutating"
            @click="orders.openDetail(order.id)"
            >查看</Button
          ><OrderActions
            :order="order"
            :disabled="locked || orders.loading"
            @act="orders.act"
          />
        </div>
      </article>
      <p
        v-if="orders.loading && !orders.list.length"
        class="app-empty body-sm"
        role="status"
      >
        加载中
      </p>
      <p
        v-else-if="!orders.list.length && !orders.error"
        class="app-empty body-sm"
      >
        暂无订单
      </p>
    </div>
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
.order-list {
  min-width: calc(var(--size-sidebar) * 4);
  background: var(--surface-raised);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.order-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 2fr) auto auto auto auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  min-height: var(--size-row);
}
.order-row + .order-row {
  border-top: 1px solid var(--line);
}
.order-row__identity,
.order-row__goods {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.order-row__identity > span,
.order-row__goods p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
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
