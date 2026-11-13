<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "@waimai/shared";
import { Button, Dialog, OrderCard, Tabs } from "../../../components/pc";
import { useRouter } from "vue-router";
import { orderTime, userOrderTabs, useUserOrders } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import PageHeader from "../../../components/PageHeader.vue";
import Pagination from "../../../components/Pagination.vue";
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
} = useUserOrders(api, useCart(), (path) => router.push(path));
</script>
<template>
  <section aria-label="我的订单">
    <PageHeader title="我的订单" :subtitle="'共 ' + total + ' 单'" />
    <Tabs v-model="tab" :items="userOrderTabs" class="ds-tabs" />
    <div v-if="error" class="app-error body-sm" role="alert">
      {{ error
      }}<Button variant="text" size="sm" :disabled="pending" @click="load"
        >重试</Button
      >
    </div>
    <div class="ds-orders" :aria-busy="pending">
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
    </div>
    <p v-if="pending" class="app-empty body-sm" role="status">加载中</p>
    <p v-else-if="!list.length && !error" class="app-empty body">暂无订单</p>
    <Pagination
      v-if="total > DEFAULT_PAGE_SIZE"
      v-model="page"
      :total="total"
    />
    <Dialog
      variant="modal"
      :open="!!replacement"
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
