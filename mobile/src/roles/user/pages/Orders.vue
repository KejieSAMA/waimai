<script setup lang="ts">
import { Button, Dialog, OrderCard, Tabs } from "@waimai/ui";
import { useRouter } from "vue-router";
import { orderTime, userOrderTabs, useUserOrders } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
const router = useRouter();

const {
  tab,
  list,
  page,
  total,
  pending,
  error,
  replacement,
  reordering,
  load,
  reorder,
  actions,
} = useUserOrders(api, useCart(), (path) => router.push(path), true);
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
      <OrderCard
        v-for="order in list"
        :key="order.id"
        :title="order.store.name"
        title-clickable
        @open="router.push('/orders/' + order.id)"
        :status="order.status"
        :items="
          order.items.map((it) => ({ name: it.nameSnapshot, qty: it.qty }))
        "
        :total="order.payCents / 100"
        :time="orderTime(order.createdAt)"
        :actions="actions(order)"
      />
      <p v-if="pending" class="app-empty body-sm" role="status">加载中</p>
      <p v-else-if="!list.length && !error" class="app-empty body">暂无订单</p>
      <Button
        v-if="list.length < total && !error"
        variant="text"
        :disabled="pending"
        @click="page++"
        >加载更多</Button
      >
    </div>
    <Dialog
      :open="!!replacement"
      title="重新选购"
      @close="replacement = undefined"
    >
      再来一单将替换
      {{
        replacement?.store?.name || "该店铺"
      }}
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
