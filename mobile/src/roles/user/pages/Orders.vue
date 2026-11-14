<script setup lang="ts">
import { Button, Dialog, Tabs } from "@waimai/ui";
import PurchaseOrderCard from "../components/PurchaseOrderCard.vue";
import { useRouter } from "vue-router";
import {
  userOrderTabs,
  useUserOrders,
  type Order,
  type OrderUiAction,
} from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
const router = useRouter();

const {
  tab,
  list,
  more,
  loaded,
  total,
  pending,
  error,
  replacement,
  reordering,
  load,
  reorder,
  actions,
} = useUserOrders(api, useCart(), (path) => router.push(path), true);
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
  <section class="app-user-orders" aria-label="订单">
    <Tabs v-model="tab" :items="userOrderTabs" />
    <div class="xz-list app-user-orders__list" :aria-busy="pending">
      <div v-if="error" class="app-error body-sm" role="alert">
        {{ error
        }}<Button variant="text" size="sm" :disabled="pending" @click="load"
          >重试</Button
        >
      </div>
      <PurchaseOrderCard
        v-for="order in list"
        :key="order.id"
        :order="order"
        :disabled="reordering"
        @open="router.push('/orders/' + order.id)"
        @action="onAction(order, $event)"
      />
      <p v-if="pending" class="app-empty body-sm" role="status">加载中</p>
      <p v-else-if="loaded && !list.length && !error" class="app-empty body">
        暂无订单
      </p>
      <Button
        v-if="list.length < total && !error"
        variant="text"
        :disabled="pending"
        @click="more"
        >加载更多</Button
      >
    </div>
    <Dialog
      :open="!!replacement"
      title="重新选购"
      :close-disabled="reordering"
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
.app-user-orders__list {
  padding-top: var(--space-3);
  padding-bottom: var(--space-3);
}
</style>
