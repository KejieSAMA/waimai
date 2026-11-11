<script setup lang="ts">
import { Button, Input, Price, Select, Tabs } from "@waimai/ui";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { Address, Order } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import { run, busy } from "../../../common/feedback";
const cart = useCart(),
  router = useRouter(),
  addresses = ref<Address[]>([]),
  note = ref("");
const contact = ref(""),
  phone = ref(""),
  detail = ref("");
async function loadAddresses() {
  addresses.value = await api<Address[]>("/user/addresses");
  cart.addressId =
    addresses.value.find((a) => a.isDefault)?.id ??
    addresses.value[0]?.id ??
    "";
}
onMounted(() =>
  run(async () => {
    await loadAddresses();
    await cart.refresh();
  }),
);
watch(
  () => cart.type,
  () => cart.refresh(),
);
async function addAddress() {
  await run(async () => {
    await api("/user/addresses", {
      method: "POST",
      body: {
        contact: contact.value,
        phone: phone.value,
        detail: detail.value,
        isDefault: true,
      },
    });
    await loadAddresses();
  });
}
async function submit() {
  await run(async () => {
    const order = await api<Order>("/user/orders", {
      method: "POST",
      body: { ...cart.payload, note: note.value },
    });
    cart.clear();
    await router.push("/orders/" + order.id);
  });
}
</script>
<template>
  <div class="app-stack">
    <h1 class="title-lg">确认订单</h1>
    <template v-if="cart.lines.length"
      ><Tabs
        v-model="cart.type"
        :items="[
          { key: 'DELIVERY', label: '外卖配送' },
          { key: 'PICKUP', label: '到店自提' },
        ]"
      />
      <div v-if="cart.type === 'DELIVERY'" class="app-card app-stack">
        <Select
          v-model="cart.addressId"
          label="收货地址"
          placeholder="选择地址"
          :options="
            addresses.map((a) => ({
              value: a.id,
              label:
                a.contact + ' · 尾号 ' + a.phone.slice(-4) + ' · ' + a.detail,
            }))
          "
        />
        <form class="app-form" @submit.prevent="addAddress">
          <h2 class="title-sm">新增地址</h2>
          <Input v-model="contact" label="收货人" required /><Input
            v-model="phone"
            label="手机号"
            required
            inputmode="tel"
          /><Input v-model="detail" label="详细地址" required /><Button
            type="submit"
            variant="outline"
            :disabled="busy"
            >保存地址</Button
          >
        </form>
      </div>
      <div class="app-card app-stack">
        <div v-for="it in cart.lines" :key="it.product.id" class="app-row body">
          <span>{{ it.product.name }} ×{{ it.qty }}</span
          ><Price :value="it.product.priceCents / 100" />
        </div>
        <Input
          v-model="note"
          label="订单备注"
          multiline
          maxlength="300"
        /><template v-if="cart.quote"
          ><div class="app-row body-sm">
            商品小计 <Price :value="cart.quote.itemsCents / 100" />配送费
            <Price :value="cart.quote.deliveryFeeCents / 100" />满减优惠 -¥{{
              cart.quote.discountCents / 100
            }}
          </div>
          <div class="app-row">
            <span class="title-sm">实付金额</span
            ><Price :value="cart.quote.payCents / 100" size="lg" /></div
        ></template>
        <p v-if="cart.quoteError" class="app-error body-sm">
          {{ cart.quoteError }}
        </p>
        <Button
          :disabled="
            busy ||
            cart.quotePending ||
            !cart.quote ||
            (cart.type === 'DELIVERY' && !cart.addressId)
          "
          @click="submit"
          >提交订单</Button
        >
      </div></template
    >
    <p v-else class="app-empty body">购物车为空</p>
  </div>
</template>
