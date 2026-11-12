import { computed, onScopeDispose, ref } from "vue";
import { merchantStoreEntry, type Store } from "@waimai/shared";
export function useMerchantProfile(request: () => Promise<Store | null>) {
  const store = ref<Store | null>(),
    pending = ref(true),
    error = ref("");
  let generation = 0,
    alive = true;
  async function load() {
    const version = ++generation;
    pending.value = true;
    error.value = "";
    try {
      const result = await request();
      if (alive && version === generation) store.value = result;
    } catch (e) {
      if (alive && version === generation) {
        store.value = undefined;
        error.value = e instanceof Error ? e.message : "店铺加载失败";
      }
    } finally {
      if (alive && version === generation) pending.value = false;
    }
  }
  onScopeDispose(() => {
    alive = false;
    generation++;
  });
  const entry = computed(() =>
    pending.value || error.value ? null : merchantStoreEntry(store.value),
  );
  void load();
  return { store, pending, error, entry, load };
}
