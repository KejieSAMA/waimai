<script setup lang="ts">
import { reactive } from "vue";
import { useRouter, isNavigationFailure } from "vue-router";
import {
  Button,
  Input,
  Tabs,
  Thumb,
  CheckoutAddress,
  CheckoutItem,
  CheckoutFees,
  CheckoutTotal,
  ScrollArea,
} from "@waimai/ui";
import { useCheckout } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import PageHeader from "../../../components/PageHeader.vue";
const cart = useCart(),
  router = useRouter();
const checkout = reactive(
  useCheckout(api, cart, async (path) => {
    const failure = await router.push(path);
    if (isNavigationFailure(failure)) throw new Error("暂时无法打开订单");
  }),
);
const maxQty = (product: ReturnType<typeof checkout.productFor>) =>
  Math.min(999, product.stock, product.limitPerOrder ?? 999);
</script>
<template>
  <div class="app-stack checkout-page">
    <PageHeader title="确认订单" back @back="router.push(checkout.shopPath)" />
    <section
      v-if="checkout.createdOrderId"
      class="app-card app-stack"
      role="status"
    >
      <h2 class="title">订单已创建</h2>
      <p class="body-md">可前往订单详情核对并支付</p>
      <p v-if="checkout.submitError" class="app-error body-sm">
        {{ checkout.submitError }}
      </p>
      <div><Button @click="checkout.viewOrder">查看订单</Button></div>
    </section>
    <div v-else-if="cart.lines.length" class="checkout-grid">
      <div class="app-stack">
        <section class="app-card checkout-delivery" aria-label="配送信息">
          <h2 class="title">配送信息</h2>
          <Tabs
            v-model="cart.type"
            :disabled="checkout.locked"
            :items="[
              { key: 'DELIVERY', label: '外卖配送' },
              { key: 'PICKUP', label: '到店自提' },
            ]"
          />
          <CheckoutAddress
            v-if="cart.type === 'DELIVERY'"
            :addresses="checkout.addresses"
            :selected="checkout.selectedAddress"
            :loading="checkout.initializing || checkout.addressesLoading"
            :error="checkout.addressError"
            :disabled="checkout.locked"
            :selector-open="checkout.selectorOpen"
            :editor-open="checkout.editorOpen"
            :editing="checkout.editingAddress"
            :saving="checkout.addressSaving"
            :save-error="checkout.addressSaveError"
            variant="modal"
            @open-selector="checkout.selectorOpen = true"
            @close-selector="checkout.selectorOpen = false"
            @close-editor="checkout.editorOpen = false"
            @select="checkout.selectAddress"
            @add="checkout.editAddress()"
            @edit="checkout.editAddress"
            @save="checkout.saveAddress"
            @retry="checkout.loadAddresses()"
          />
          <div v-else class="checkout-pickup">
            <p class="title-sm">{{ checkout.store?.name ?? "到店自提" }}</p>
            <p class="body-md">
              {{ checkout.store?.address ?? "正在加载门店地址" }}
            </p>
            <p class="body-sm app-muted">
              营业时间 {{ checkout.store?.openHours ?? "—" }}
            </p>
          </div>
        </section>
        <section class="app-card checkout-goods" aria-label="商品清单">
          <div class="checkout-goods__head">
            <Thumb
              kind="logo"
              :name="checkout.store?.name ?? ''"
              :src="checkout.store?.logo"
            />
            <div>
              <h2 class="title">{{ checkout.store?.name ?? "已选商品" }}</h2>
              <p class="body-sm app-muted">共 {{ cart.count }} 件商品</p>
            </div>
            <Button
              size="sm"
              variant="text"
              :disabled="checkout.locked"
              @click="router.push(checkout.shopPath)"
              >继续选购</Button
            >
          </div>
          <p
            v-if="checkout.storeLoading"
            class="body-sm app-muted"
            role="status"
          >
            核对店铺与商品信息中
          </p>
          <div
            v-if="checkout.storeIssue"
            class="app-error body-sm"
            role="alert"
          >
            {{ checkout.storeIssue
            }}<Button
              v-if="checkout.storeError"
              size="sm"
              variant="text"
              :disabled="checkout.locked || checkout.storeLoading"
              @click="checkout.loadStore().then(checkout.refreshQuote)"
              >重试</Button
            >
          </div>
          <CheckoutItem
            v-for="line in cart.lines"
            :key="line.product.id"
            :product="checkout.productFor(line)"
            :qty="line.qty"
            :quoted="
              cart.quote?.items.find(
                (item) => item.productId === line.product.id,
              )
            "
            :max="maxQty(checkout.productFor(line))"
            :issue="checkout.itemIssue(line)"
            :disabled="checkout.locked"
            @quantity="checkout.quantity(line, $event)"
          />
        </section>
        <section class="app-card checkout-note" aria-label="订单备注">
          <h2 class="title">
            订单备注 <span class="body-sm app-muted">选填</span>
          </h2>
          <Input
            v-model="cart.note"
            multiline
            maxlength="300"
            placeholder="口味、忌口等要求，最多 300 字"
            :disabled="checkout.locked"
          />
          <p class="caption app-muted">{{ cart.note.length }} / 300</p>
        </section>
      </div>
      <aside class="app-card checkout-summary" aria-label="结算摘要">
        <h2 class="title">费用明细</h2>
        <ScrollArea class="checkout-summary__body" label="结算明细"
          ><div class="checkout-summary__details">
            <CheckoutFees
              compact
              :quote="cart.quote"
              :updating="checkout.initializing || cart.quotePending"
            />
            <p v-if="cart.quoteError" class="app-error body-sm" role="alert">
              {{ cart.quoteError
              }}<Button
                variant="text"
                size="sm"
                :disabled="checkout.locked || cart.quotePending"
                @click="checkout.refreshQuote"
                >重新计算</Button
              >
            </p>
            <p
              v-if="checkout.notice"
              class="checkout-notice body-sm"
              role="status"
            >
              {{ checkout.notice }}
            </p>
            <p
              v-if="checkout.submitError"
              class="app-error body-sm"
              role="alert"
            >
              {{ checkout.submitError }}
            </p>
            <p
              v-if="
                cart.type === 'DELIVERY' &&
                !checkout.selectedAddress &&
                !checkout.initializing
              "
              class="body-sm app-muted"
            >
              请选择收货地址后提交订单
            </p>
          </div></ScrollArea
        >
        <div class="checkout-summary__footer">
          <CheckoutTotal
            :quote="cart.quote"
            :updating="checkout.initializing || cart.quotePending"
            :disabled="!checkout.canSubmit"
            :submitting="checkout.submitting"
            @submit="checkout.submit"
          />
        </div>
      </aside>
    </div>
    <section v-else class="app-card app-empty">
      <h2 class="title">购物车为空</h2>
      <p class="body-sm">去店铺挑选喜欢的商品</p>
      <Button variant="outline" @click="router.push(checkout.shopPath)"
        >继续选购</Button
      >
    </section>
  </div>
</template>
<style scoped>
.checkout-delivery {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.checkout-delivery h2,
.checkout-goods h2,
.checkout-note h2,
.checkout-pickup p {
  margin: 0;
}
.checkout-pickup {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.checkout-goods__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.checkout-goods__head > div {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.checkout-goods__head p {
  margin: var(--space-1) 0 0;
}
.checkout-note {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.checkout-note > p {
  margin: 0;
  text-align: right;
}
.checkout-notice {
  margin: 0;
  color: var(--warning);
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--size-cart-panel);
  gap: var(--space-6);
  align-items: start;
}
.checkout-grid > .app-stack {
  min-width: 0;
}
.checkout-summary {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  padding: 0;
  max-height: calc(
    100dvh - var(--size-topbar) - var(--space-2) - var(--space-6) * 2
  );
  min-height: 0;
}
.checkout-summary > h2 {
  margin: 0;
  padding: var(--space-5);
  flex: none;
}
.checkout-summary__body {
  min-height: 0;
  flex: 1 1 auto;
}
.checkout-summary__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0 var(--space-5) var(--space-5);
}
.checkout-summary__details > p {
  margin: 0;
}
.checkout-summary__footer {
  flex: none;
  padding: var(--space-5);
  border-top: 1px solid var(--line);
}
@media (max-width: 767px) {
  .checkout-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .checkout-summary {
    position: static;
    max-height: none;
  }
}
</style>
