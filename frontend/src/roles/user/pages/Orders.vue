<script setup lang="ts">
import { Button, Dialog, OrderCard, Tabs } from "@waimai/ui";
import { useRouter } from "vue-router";
import { orderTime, userOrderTabs, useUserOrders } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import SideNav from "../../../components/SideNav.vue";
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
const groups = [
  {
    items: [
      { key: "/orders", label: "我的订单", icon: "order" as const },
      { key: "/addresses", label: "收货地址", icon: "location" as const },
      {
        key: "reviews",
        label: "我的评价",
        icon: "star" as const,
        disabled: true,
      },
      {
        key: "coupons",
        label: "优惠券",
        icon: "wallet" as const,
        disabled: true,
      },
      { key: "/me", label: "账号设置", icon: "settings" as const },
    ],
  },
];
</script>
<template>
  <div class="ds-account">
    <SideNav
      :brand="false"
      :groups="groups"
      model-value="/orders"
      aria-label="我的"
      @update:model-value="router.push($event)"
    />
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
      <Pagination v-if="total > 20" v-model="page" :total="total" />
    </section>
    <Dialog
      variant="modal"
      :open="!!replacement"
      title="重新选购"
      @close="replacement = undefined"
    >
      再来一单将替换当前购物车中的商品，是否继续？
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
  </div>
</template>
