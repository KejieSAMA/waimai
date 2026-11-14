<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted } from "vue";
import { useRouter, useRoute, isNavigationFailure } from "vue-router";
import {
  Button,
  Input,
  Dialog,
  Icon,
  Tabs,
  CartSelector,
  CheckoutAddress,
  CartItems,
  CheckoutFees,
  CheckoutTotal,
} from "@waimai/ui";
import { useCheckout, money } from "@waimai/shared";
import { api } from "../../../common/api";
import { useCart } from "../../../common/cart";
import PageSlot from "../../../components/PageSlot.vue";
import { useGoodsDisclosure, useNoteDraft } from "../purchaseUi";
import { useDraftLeave } from "../../../common/draftLeave";
import DiscardDraft from "../components/DiscardDraft.vue";
const carts = useCart(),
  router = useRouter(),
  route = useRoute();
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
const goods = useGoodsDisclosure(
  computed(() => storeId),
  computed(() => cart.lines),
  () => cart.lines.some(checkout.itemIssue),
);
const note = useNoteDraft(
  () => cart.note,
  (value) => {
    cart.note = value;
  },
  () => checkout.locked,
);
const {
  open: noteOpen,
  draft: noteDraft,
  begin: editNote,
  save: saveNote,
} = note;
const noteDialog = ref<InstanceType<typeof Dialog>>();
const leave = useDraftLeave(
  () => noteOpen.value && noteDraft.value !== cart.note,
  () => checkout.locked && !checkout.createdOrderId,
);
watch(
  () => checkout.store,
  (store) => {
    if (store) carts.rememberStore(store);
  },
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
    <section
      v-if="checkout.createdOrderId"
      class="app-card app-stack"
      role="status"
    >
      <h2 class="title">订单已创建</h2>
      <p class="body">可前往订单详情核对并支付</p>
      <p v-if="checkout.submitError" class="app-error body-sm">
        {{ checkout.submitError }}
      </p>
      <div><Button @click="checkout.viewOrder">查看订单</Button></div>
    </section>
    <template v-else-if="cart.lines.length"
      ><section class="app-card checkout-delivery" aria-label="配送信息">
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
          variant="sheet"
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
          <p class="body">
            {{ checkout.store?.address ?? "正在加载门店地址" }}
          </p>
          <p class="body-sm app-muted">
            营业时间 {{ checkout.store?.openHours ?? "—" }}
          </p>
        </div>
      </section>
      <section class="app-card checkout-goods" aria-label="商品清单">
        <div class="checkout-goods__head">
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
            variant="sheet"
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
        <p v-if="checkout.storeLoading" class="body-sm app-muted" role="status">
          核对店铺与商品信息中
        </p>
        <div v-if="checkout.storeIssue" class="app-error body-sm" role="alert">
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
        <CartItems
          :lines="goods.visible.value"
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
        />
        <Button
          v-if="goods.canToggle.value"
          block
          variant="text"
          :aria-expanded="goods.showAll.value"
          @click="goods.toggle"
          >{{ goods.label.value }}</Button
        >
      </section>
      <section class="app-card checkout-note" aria-label="订单备注">
        <button
          type="button"
          class="checkout-note__entry"
          :disabled="checkout.locked"
          @click="editNote"
        >
          <span class="title-sm">订单备注</span
          ><span class="body-sm app-muted">{{ cart.note || "添加备注" }}</span
          ><Icon name="chevron-right" :size="18" />
        </button>
      </section>
      <section class="app-card app-stack" aria-label="费用明细">
        <h2 class="title checkout-fees-title">费用明细</h2>
        <p v-if="cart.quote?.shortfallCents" class="body-sm app-muted">
          差 {{ money(cart.quote.shortfallCents) }} 起送，可继续选购或选择自提
        </p>
        <CheckoutFees
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
        <p v-if="checkout.notice" class="checkout-notice body-sm" role="status">
          {{ checkout.notice }}
        </p>
        <p v-if="checkout.submitError" class="app-error body-sm" role="alert">
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
      </section></template
    >
    <section v-else class="app-card app-empty">
      <h2 class="title">
        {{ carts.totalCount ? "本店购物车为空" : "购物车为空" }}
      </h2>
      <CartSelector
        v-if="carts.totalCount"
        :carts="carts.carts"
        :selected="storeId"
        :count="0"
        variant="sheet"
        @select="chooseStore"
      />
      <p class="body-sm">去店铺挑选喜欢的商品</p>
      <Button variant="outline" @click="router.push(checkout.shopPath)"
        >继续选购</Button
      >
    </section>
    <PageSlot name="actions"
      ><div
        v-if="cart.lines.length && !checkout.createdOrderId"
        class="checkout-bottom"
      >
        <CheckoutTotal
          inline
          :quote="cart.quote"
          :updating="checkout.initializing || cart.quotePending"
          :disabled="!checkout.canSubmit"
          :submitting="checkout.submitting"
          @submit="checkout.submit"
        /></div
    ></PageSlot>
  </div>
  <Dialog
    ref="noteDialog"
    :open="noteOpen"
    title="订单备注"
    variant="sheet"
    confirm-discard
    :dirty="noteDraft !== cart.note"
    :close-disabled="checkout.locked"
    @close="note.cancel"
  >
    <Input
      v-model="noteDraft"
      label="口味、忌口等要求"
      multiline
      maxlength="300"
      :disabled="checkout.locked"
    />
    <p class="caption app-muted">{{ noteDraft.length }} / 300</p>
    <template #actions
      ><Button
        size="lg"
        variant="outline"
        :disabled="checkout.locked"
        @click="noteDialog?.close()"
        >取消</Button
      ><Button size="lg" :disabled="checkout.locked" @click="saveNote"
        >保存备注</Button
      ></template
    >
  </Dialog>
  <DiscardDraft :open="leave.open.value" @choose="leave.choose" />
</template>
<style scoped>
.checkout-note__entry {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--size-tap);
  border: 0;
  padding: 0;
  background: none;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}
.checkout-note__entry > .body-sm {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
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
.checkout-goods__head :deep(.xz-cart-selector) {
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

.checkout-fees-title {
  margin: 0;
}
.checkout-bottom {
  padding: var(--space-2) var(--space-3);
}
.checkout-page {
  padding-bottom: var(--space-3);
}
</style>
