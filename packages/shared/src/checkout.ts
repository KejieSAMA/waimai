import { computed, onMounted, onScopeDispose, ref, watch } from "vue";
import type { Address, Order, Product, Quote, Store } from "./index";
import type {
  CartLine,
  CartPayload,
  CheckoutCart,
  CheckoutRequest,
} from "./cart";

export type AddressDraft = Pick<
  Address,
  "contact" | "phone" | "detail" | "isDefault"
>;
export function chooseCheckoutAddress(
  addresses: Address[],
  preferred?: string,
): string {
  return (
    addresses.find((address) => address.id === preferred)?.id ??
    addresses.find((address) => address.isDefault)?.id ??
    addresses[0]?.id ??
    ""
  );
}
function quoteSignature(quote: Quote): string {
  return JSON.stringify([
    quote.itemsCents,
    quote.deliveryFeeCents,
    quote.discountCents,
    quote.payCents,
    quote.items
      .map((line) => [
        line.productId,
        line.qty,
        line.priceCents,
        line.lineTotalCents,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ]);
}
function cartSignature(payload: CartPayload, note: string): string {
  return JSON.stringify({ ...payload, note });
}

export function useCheckout(
  request: CheckoutRequest,
  cart: CheckoutCart,
  navigate: (path: string) => Promise<unknown>,
) {
  const store = ref<Store>(),
    storeLoading = ref(false),
    storeError = ref("");
  const addresses = ref<Address[]>([]),
    addressesLoading = ref(false),
    addressError = ref("");
  const selectorOpen = ref(false),
    editorOpen = ref(false),
    editingAddress = ref<Address>(),
    addressSaving = ref(false),
    addressSaveError = ref("");
  const initializing = ref(true),
    submitting = ref(false),
    submitError = ref(""),
    notice = ref(""),
    createdOrderId = ref("");
  const targetStoreId = ref(cart.lines[0]?.product.storeId ?? cart.lastStoreId);
  let active = true,
    storeVersion = 0,
    addressVersion = 0,
    ready = false;
  const selectedAddress = computed(() =>
    addresses.value.find((address) => address.id === cart.addressId),
  );
  const shopPath = computed(() =>
    targetStoreId.value
      ? `/store/${encodeURIComponent(targetStoreId.value)}`
      : "/",
  );
  const locked = computed(
    () => submitting.value || addressSaving.value || !!createdOrderId.value,
  );
  const productFor = (line: CartLine): Product =>
    store.value?.products?.find((product) => product.id === line.product.id) ??
    line.product;
  function itemIssue(line: CartLine): string {
    if (!store.value) return "";
    const product = store.value.products?.find(
      (item) => item.id === line.product.id,
    );
    if (!product) return "商品暂不可购买，可移除或返回店铺调整";
    if (product.stock < line.qty) return `库存不足，剩余 ${product.stock} 份`;
    if (product.limitPerOrder && line.qty > product.limitPerOrder)
      return `每单限购 ${product.limitPerOrder} 份`;
    return "";
  }
  const storeIssue = computed(
    () =>
      storeError.value ||
      (store.value && store.value.status !== "OPEN"
        ? "店铺休息中，暂时无法下单"
        : ""),
  );
  const canSubmit = computed(
    () =>
      !initializing.value &&
      !locked.value &&
      !storeLoading.value &&
      !!store.value &&
      !storeIssue.value &&
      cart.lines.length > 0 &&
      !cart.lines.some(itemIssue) &&
      !!cart.quote &&
      cart.quote.checkoutAllowed !== false &&
      !cart.quotePending &&
      !cart.quoteError &&
      (cart.type === "PICKUP" ||
        (!addressesLoading.value &&
          !addressError.value &&
          !!selectedAddress.value)),
  );
  async function loadStore() {
    const current = ++storeVersion,
      id = targetStoreId.value;
    if (!id) return;
    storeLoading.value = true;
    storeError.value = "";
    try {
      const result = await request<Store>(
        `/public/stores/${encodeURIComponent(id)}`,
      );
      if (!active || current !== storeVersion) return;
      store.value = result;
      cart.storeOpen = result.status === "OPEN";
    } catch (cause) {
      if (active && current === storeVersion) {
        store.value = undefined;
        storeError.value =
          cause instanceof Error ? cause.message : "店铺信息加载失败";
      }
    } finally {
      if (active && current === storeVersion) storeLoading.value = false;
    }
  }
  async function loadAddresses(preferred?: string) {
    const current = ++addressVersion;
    addressesLoading.value = true;
    addressError.value = "";
    try {
      const result = await request<Address[]>("/user/addresses");
      if (!active || current !== addressVersion) return false;
      addresses.value = result;
      cart.addressId = chooseCheckoutAddress(
        result,
        preferred ?? cart.addressId,
      );
      return true;
    } catch (cause) {
      if (active && current === addressVersion)
        addressError.value =
          cause instanceof Error ? cause.message : "地址加载失败";
      return false;
    } finally {
      if (active && current === addressVersion) addressesLoading.value = false;
    }
  }
  function selectAddress(id: string) {
    if (!locked.value && addresses.value.some((address) => address.id === id)) {
      cart.addressId = id;
      selectorOpen.value = false;
    }
  }
  function editAddress(address?: Address) {
    if (locked.value) return;
    editingAddress.value = address ? { ...address } : undefined;
    addressSaveError.value = "";
    editorOpen.value = true;
  }
  async function saveAddress(draft: AddressDraft) {
    if (locked.value) return;
    addressSaving.value = true;
    addressSaveError.value = "";
    try {
      const id = editingAddress.value?.id;
      const result = await request<Address>(
        "/user/addresses" + (id ? "/" + id : ""),
        { method: id ? "PUT" : "POST", body: { ...draft } },
      );
      if (!active) return;
      // Apply the successful save even if a following list refresh is unavailable.
      ++addressVersion;
      addressesLoading.value = false;
      addressError.value = "";
      addresses.value = [
        ...addresses.value
          .filter((address) => address.id !== result.id)
          .map((address) =>
            result.isDefault ? { ...address, isDefault: false } : address,
          ),
        result,
      ];
      cart.addressId = result.id;
      editorOpen.value = false;
      selectorOpen.value = false;
    } catch (cause) {
      if (active)
        addressSaveError.value =
          cause instanceof Error ? cause.message : "地址保存失败";
    } finally {
      if (active) addressSaving.value = false;
    }
  }
  function quantity(line: CartLine, qty: number) {
    if (!locked.value) {
      notice.value = "";
      submitError.value = "";
      cart.set(productFor(line), qty);
    }
  }
  async function refreshQuote() {
    if (!submitting.value && !createdOrderId.value) await cart.refresh();
  }
  watch(
    () => cart.payload,
    () => {
      if (ready && !submitting.value && !createdOrderId.value) {
        notice.value = "";
        void refreshQuote();
      }
    },
    { deep: true },
  );
  watch(
    () => cart.lines[0]?.product.storeId,
    (id) => {
      if (id && id !== targetStoreId.value) {
        targetStoreId.value = id;
        store.value = undefined;
        if (ready) void loadStore();
      }
    },
  );
  async function initialize() {
    if (cart.lines.length) await Promise.all([loadStore(), loadAddresses()]);
    if (!active) return;
    ready = true;
    initializing.value = false;
    if (cart.lines.length) await cart.refresh();
  }
  onMounted(initialize);
  onScopeDispose(() => {
    active = false;
    ++storeVersion;
    ++addressVersion;
  });
  async function viewOrder() {
    if (!createdOrderId.value) return;
    try {
      await navigate(`/orders/${createdOrderId.value}`);
    } catch {
      if (active) submitError.value = "订单已创建，请点击查看订单继续";
    }
  }
  async function submit() {
    if (!canSubmit.value || !cart.quote) return;
    const displayed = quoteSignature(cart.quote);
    submitting.value = true;
    submitError.value = "";
    notice.value = "";
    try {
      await loadStore();
      if (!active) return;
      if (storeIssue.value || cart.lines.some(itemIssue)) {
        cart.invalidateQuote(
          storeIssue.value || "部分商品需要调整，请检查商品清单",
        );
        return;
      }
      const fresh = await cart.refresh();
      if (!active || !fresh) return;
      if (!fresh.checkoutAllowed) {
        notice.value = "未达到起送金额，请继续选购或选择自提";
        return;
      }
      if (quoteSignature(fresh) !== displayed) {
        notice.value = "金额已更新，请核对后再次提交";
        return;
      }
      const body = { ...cart.payload, note: cart.note };
      const snapshot = cartSignature(cart.payload, cart.note);
      const order = await request<Order>("/user/orders", {
        method: "POST",
        body,
      });
      createdOrderId.value = order.id;
      if (cartSignature(cart.payload, cart.note) === snapshot) cart.clear();
      if (active) await viewOrder();
    } catch (cause) {
      if (active)
        submitError.value =
          cause instanceof Error ? cause.message : "订单提交失败，请重试";
    } finally {
      if (active) submitting.value = false;
    }
  }
  return {
    initialize,
    store,
    storeLoading,
    storeError,
    storeIssue,
    targetStoreId,
    addresses,
    addressesLoading,
    addressError,
    selectedAddress,
    selectorOpen,
    editorOpen,
    editingAddress,
    addressSaving,
    addressSaveError,
    initializing,
    submitting,
    submitError,
    notice,
    createdOrderId,
    locked,
    canSubmit,
    shopPath,
    productFor,
    itemIssue,
    loadStore,
    loadAddresses,
    selectAddress,
    editAddress,
    saveAddress,
    quantity,
    refreshQuote,
    submit,
    viewOrder,
  };
}
