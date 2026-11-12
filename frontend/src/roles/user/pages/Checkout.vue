<script setup lang="ts">
import { reactive, watch, onMounted, ref } from "vue";
import { useRouter, useRoute, isNavigationFailure } from "vue-router";
import {
  Button,
  Input,
  Tabs,
  CartSelector,
  CheckoutAddress,
  CartItems,
  CheckoutFees,
  CheckoutTotal,
  ScrollArea,
} from "@waimai/ui";
import { useCheckout, money } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import PageHeader from "../../../components/PageHeader.vue";
const carts = useCart(),
  router = useRouter(),
  route = useRoute();
const goodsList = ref<InstanceType<typeof ScrollArea>>();
const storeId = carts.resolveStoreId(route.query.storeId) ?? "";
const cart = carts.forStore(storeId);
if (storeId) carts.selectStore(storeId);
cart.invalidateQuote("");
function chooseStore(id: string) {
  if (!checkout.locked)
    void router.push({
      path: "/checkout",
      query: { ...route.query, storeId: id },
    });
}
const checkout = reactive(
  useCheckout(api, cart, async (path) => {
    const failure = await router.push(path);
    if (isNavigationFailure(failure)) throw new Error("暂时无法打开订单");
  }),
);
watch(
  () => checkout.store,
  (store) => {
    if (store) carts.rememberStore(store);
  },
);
watch(
  () => [cart.quoteError, checkout.notice, checkout.submitError],
  (messages) => {
    if (messages.some(Boolean)) goodsList.value?.scrollTo({ top: 0 });
  },
  { flush: "post" },
);
onMounted(() => {
  if (!route.query.storeId && storeId)
    void router.replace({
      path: "/checkout",
      query: { ...route.query, storeId },
    });
});
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
      <div class="app-stack checkout-main">
        <section class="app-card checkout-delivery" aria-label="配送信息">
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
          <ScrollArea
            ref="goodsList"
            class="checkout-goods__list"
            label="订单商品"
            scrollbar-placement="outside"
            contain
            ><div
              v-if="
                cart.quote?.shortfallCents ||
                cart.quoteError ||
                checkout.notice ||
                checkout.submitError ||
                (cart.type === 'DELIVERY' &&
                  !checkout.selectedAddress &&
                  !checkout.initializing)
              "
              class="checkout-goods__feedback"
            >
              <p v-if="cart.quote?.shortfallCents" class="body-sm app-muted">
                差
                {{ money(cart.quote.shortfallCents) }}
                起送，可继续选购或选择自提
              </p>

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
            </div>
            <CartItems
              :lines="cart.lines"
              :quote="cart.quote"
              :product-for="checkout.productFor"
              :item-issue="checkout.itemIssue"
              :disabled="checkout.locked"
              @quantity="
                checkout.quantity(
                  { product: $event.product, qty: $event.qty },
                  $event.qty,
                )
              "
          /></ScrollArea>
        </section>
        <section class="app-card checkout-note" aria-label="订单备注">
          <div class="checkout-note__head">
            <h2 class="title">
              订单备注 <span class="body-sm app-muted">选填</span>
            </h2>
            <p class="caption app-muted">{{ cart.note.length }} / 300</p>
          </div>
          <Input
            v-model="cart.note"
            multiline
            maxlength="300"
            placeholder="口味、忌口等要求，最多 300 字"
            :disabled="checkout.locked"
          />
        </section>
      </div>
      <aside class="app-stack checkout-side" aria-label="店铺与结算">
        <section class="app-card checkout-store" aria-label="店铺信息">
          <div class="checkout-store__head">
            <CartSelector
              :carts="carts.carts"
              :selected="storeId"
              :name="
                checkout.store?.name ||
                carts.carts.find((c) => c.storeId === storeId)?.name
              "
              :logo="checkout.store?.logo"
              :count="cart.count"
              :disabled="checkout.locked"
              variant="modal"
              @select="chooseStore"
            />
            <Button
              size="sm"
              variant="text"
              :disabled="checkout.locked"
              @click="router.push(checkout.shopPath)"
              >继续选购</Button
            >
          </div>
        </section>
        <section class="app-card checkout-summary" aria-label="结算摘要">
          <h2 class="title">费用明细</h2>
          <div class="checkout-summary__details">
            <CheckoutFees
              compact
              :quote="cart.quote"
              :updating="checkout.initializing || cart.quotePending"
            />
          </div>
          <div class="checkout-summary__footer">
            <CheckoutTotal
              :quote="cart.quote"
              :updating="checkout.initializing || cart.quotePending"
              :disabled="!checkout.canSubmit"
              :submitting="checkout.submitting"
              @submit="checkout.submit"
            />
          </div>
        </section>
      </aside>
    </div>
    <section v-else class="app-card app-empty">
      <h2 class="title">
        {{ carts.totalCount ? "本店购物车为空" : "购物车为空" }}
      </h2>
      <CartSelector
        v-if="carts.totalCount"
        :carts="carts.carts"
        :selected="storeId"
        :count="0"
        variant="modal"
        @select="chooseStore"
      />
      <p class="body-sm">去店铺挑选喜欢的商品</p>
      <Button variant="outline" @click="router.push(checkout.shopPath)"
        >继续选购</Button
      >
    </section>
  </div>
</template>
<style scoped>
.checkout-page {
  flex: 1;
  min-height: 0;
}
.checkout-page > .xz-pagehead {
  flex: none;
}
.checkout-delivery {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: none;
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
.checkout-side {
  min-width: 0;
  min-height: 0;
  align-self: start;
}
.checkout-store__head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
}
.checkout-store__head > .xz-btn {
  align-self: flex-end;
}
.checkout-store__head :deep(.xz-cart-selector) {
  width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
}
.checkout-store__head p {
  margin: var(--space-1) 0 0;
}
.checkout-goods {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
}
.checkout-goods > :not(.checkout-goods__list) {
  flex: none;
}
.checkout-goods__list {
  flex: 1 1 0%;
  min-height: 0;
}
.checkout-goods :deep(.xz-checkout-item) {
  grid-template-columns: var(--size-thumb-sm) minmax(0, 1fr) auto auto;
  align-items: center;
  padding: var(--space-3) 0;
}
.checkout-goods :deep(.xz-checkout-item > .xz-thumb) {
  grid-row: 1;
}
.checkout-goods :deep(.xz-checkout-item__quantity) {
  grid-column: 3;
  grid-row: 1;
  flex-wrap: nowrap;
}
.checkout-goods :deep(.xz-checkout-item__amount) {
  grid-column: 4;
  grid-row: 1;
}
.checkout-goods :deep(.xz-checkout-item__issue) {
  grid-row: 2;
}
.checkout-note {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: none;
}
.checkout-note__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.checkout-note__head > p {
  margin: 0;
}
.checkout-note :deep(textarea) {
  height: calc(var(--size-button-lg) * 1.6);
}
.checkout-notice {
  margin: 0;
  color: var(--warning);
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--size-cart-panel);
  gap: var(--space-6);
  flex: 1;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
}
.checkout-main {
  min-width: 0;
  min-height: 0;
}
.checkout-summary {
  display: flex;
  flex-direction: column;
  align-self: start;
  padding: 0;
  max-height: 100%;
  min-height: 0;
}
.checkout-summary > h2 {
  margin: 0;
  padding: var(--space-5);
  flex: none;
}
.checkout-summary__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0 var(--space-5) var(--space-5);
}
.checkout-goods__feedback {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.checkout-goods__feedback > p {
  margin: 0;
}
.checkout-summary__footer {
  flex: none;
  padding: var(--space-5);
  border-top: 1px solid var(--line);
}
@media (max-height: 760px) {
  .checkout-delivery,
  .checkout-goods,
  .checkout-note,
  .checkout-store,
  .checkout-summary > h2,
  .checkout-summary__footer {
    padding: var(--space-3);
  }
  .checkout-summary__details {
    padding: 0 var(--space-3) var(--space-3);
  }
  .checkout-main,
  .checkout-side {
    gap: var(--space-3);
  }
}
@media (max-width: 767px) {
  .checkout-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: var(--space-3);
  }
  .checkout-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .checkout-summary > h2 {
    grid-column: 1 / -1;
    padding: var(--space-3);
  }
  .checkout-summary__details {
    padding: var(--space-3);
  }
  .checkout-summary__footer {
    padding: var(--space-3);
    border-top: 0;
    border-left: 1px solid var(--line);
  }
  .checkout-main {
    gap: var(--space-3);
  }
  .checkout-delivery,
  .checkout-goods,
  .checkout-note {
    padding: var(--space-3);
  }
}
</style>
