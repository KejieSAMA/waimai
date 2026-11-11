import { ref } from "vue";
import type { Store } from "@waimai/shared";
import { api } from "./api";
export const merchantStore = ref<Store | null>();
export const merchantStoreBusy = ref(false);
export const merchantStoreLoading = ref(false),
  merchantStoreError = ref("");
let owner = "",
  version = 0,
  pending: Promise<Store | null | undefined> | undefined;
export function resetMerchantStore() {
  merchantStoreBusy.value = false;
  owner = "";
  ++version;
  pending = undefined;
  merchantStore.value = undefined;
  merchantStoreError.value = "";
  merchantStoreLoading.value = false;
}
export function updateMerchantStore(store: Store) {
  ++version;
  pending = undefined;
  merchantStoreLoading.value = false;
  merchantStoreError.value = "";
  merchantStore.value = store;
}
export async function loadMerchantStore(
  accountId: string,
  force = false,
): Promise<Store | null | undefined> {
  if (owner !== accountId) {
    resetMerchantStore();
    owner = accountId;
  }
  if (!force && pending) return pending;
  if (!force && merchantStore.value !== undefined) return merchantStore.value;
  const current = ++version;
  merchantStoreLoading.value = true;
  merchantStoreError.value = "";
  const task = (async () => {
    try {
      const result = await api<Store | null>(
        "/merchant/application",
        {},
        "MERCHANT",
      );
      if (current === version) merchantStore.value = result;
      return current === version ? result : undefined;
    } catch (cause) {
      if (current === version)
        merchantStoreError.value =
          cause instanceof Error ? cause.message : "店铺信息加载失败";
      return undefined;
    } finally {
      if (current === version) {
        merchantStoreLoading.value = false;
        pending = undefined;
      }
    }
  })();
  pending = task;
  return task;
}
