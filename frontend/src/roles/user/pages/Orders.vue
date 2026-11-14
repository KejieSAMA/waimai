<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import { Button, Dialog, Tabs } from "../../../components/pc";
import { useRouter } from "vue-router";
import { userOrderTabs, useUserOrders } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import PageHeader from "../../../components/PageHeader.vue";
import Pagination from "../../../components/Pagination.vue";
import UserOrderRow from "../components/UserOrderRow.vue";
import type { Order } from "@waimai/shared";
import type { OrderUiAction } from "../orderPresentation";
const router = useRouter();
const {
  tab,
  list,
  page,
  changePage,
  total,
  pending,
  error,
  replacement,
  reordering,
  load,
  reorder,
  actions,
  loaded,
} = useUserOrders(api, useCart(), (path) => router.push(path));
function onAction(order: Order, key: OrderUiAction) {
  if (key === "reorder")
    actions(order)
      .find((a) => a.label === "再来一单")
      ?.onClick?.();
  else
    void router.push(
      "/orders/" + order.id + (key === "evaluate" ? "#review" : ""),
    );
}
</script>
<template>
  <section class="user-orders" aria-label="我的订单">
    <PageHeader
      title="我的订单"
      :subtitle="loaded ? '共 ' + total + ' 单' : undefined"
    />
    <Tabs v-model="tab" :items="userOrderTabs" class="ds-tabs" />
    <div v-if="error && !replacement" class="app-error body-sm" role="alert">
      {{ error
      }}<Button variant="text" size="sm" :disabled="pending" @click="load"
        >重试</Button
      >
    </div>
    <p v-if="pending" class="body-sm app-muted" role="status">
      {{ loaded ? "正在更新订单" : "正在加载订单" }}
    </p>
    <div class="user-orders__list" :aria-busy="pending">
      <UserOrderRow
        v-for="order in list"
        :key="order.id"
        :order="order"
        :disabled="pending || reordering"
        @action="onAction(order, $event)"
      />
    </div>
    <a-empty
      v-if="loaded && !pending && !error && !list.length"
      description="暂无订单"
    />
    <Pagination
      v-if="total > DEFAULT_PAGE_SIZE"
      :model-value="page"
      @update:model-value="changePage"
      :total="total"
    />
    <Dialog
      variant="modal"
      :open="!!replacement"
      :close-disabled="reordering"
      title="重新选购"
      @close="replacement = undefined"
    >
      再来一单将替换
      {{ replacement?.store?.name || "该店铺" }}
      的已选商品，其他店铺购物车不受影响。
      <p v-if="error" class="app-error body-sm" role="alert">{{ error }}</p>
      <template #actions
        ><Button
          variant="outline"
          :disabled="reordering"
          @click="replacement = undefined"
          >保留购物车</Button
        ><Button
          :disabled="reordering"
          @click="replacement && reorder(replacement)"
          >重新选购</Button
        ></template
      >
    </Dialog>
  </section>
</template>

<style scoped>
.user-orders__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: var(--space-4) 0;
}
</style>
