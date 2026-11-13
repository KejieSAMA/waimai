import { onMounted, onScopeDispose, reactive, ref, watch } from "vue";
import type { Category, Page, Product, Store } from "./index";
type Request = <T>(
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<T>;
export function useMerchantProducts(request: Request, initialStock = "") {
  const list = ref<Product[]>([]),
    categories = ref<Category[]>([]),
    store = ref<Store>();
  const status = ref("ON"),
    page = ref(1),
    total = ref(0),
    counts = ref<Record<string, number>>({});
  const selected = ref<string[]>([]),
    loading = ref(true),
    mutating = ref(false),
    error = ref(""),
    loaded = ref(false);
  const filters = reactive({ keyword: "", category: "", stock: initialStock });
  const applied = reactive({ ...filters });
  let version = 0,
    active = true;
  let retryAppend: number | undefined,
    committedPage = 1;
  async function load(append = false, target = page.value): Promise<boolean> {
    if (!append) retryAppend = undefined;
    const current = ++version;
    loading.value = true;
    error.value = "";
    try {
      const query = new URLSearchParams({
        group:
          status.value === "REVIEW"
            ? "review"
            : status.value === "OFF"
              ? "off"
              : "on",
        keyword: applied.keyword,
        categoryId: applied.category,
        stock: applied.stock,
        page: String(target),
      });
      const result = await request<Page<Product>>(
        "/merchant/products?" + query,
      );
      if (!active || current !== version) return false;
      list.value = append
        ? [
            ...list.value.filter(
              (old) => !result.list.some((next) => next.id === old.id),
            ),
            ...result.list,
          ]
        : result.list;
      page.value = committedPage = target;
      retryAppend = undefined;
      loaded.value = true;
      total.value = result.total;
      counts.value = result.counts ?? {};
      if (!append) selected.value = [];
      return true;
    } catch (cause) {
      if (active && current === version) {
        if (append) retryAppend = target;
        page.value = committedPage;
        error.value = cause instanceof Error ? cause.message : "商品加载失败";
      }
      return false;
    } finally {
      if (active && current === version) loading.value = false;
    }
  }
  async function apply(reset = false) {
    if (reset) Object.assign(filters, { keyword: "", category: "", stock: "" });
    Object.assign(applied, filters);
    page.value = 1;
    selected.value = [];
    return load();
  }
  watch(status, () => {
    page.value = 1;
    selected.value = [];
    void load();
  });
  async function initialize() {
    loading.value = true;
    error.value = "";
    try {
      const [groups, own] = await Promise.all([
        request<Category[]>("/merchant/dish-categories"),
        request<Store>("/merchant/store"),
      ]);
      if (!active) return;
      categories.value = groups;
      store.value = own;
      await load();
    } catch (cause) {
      if (active) {
        error.value = cause instanceof Error ? cause.message : "商品加载失败";
        loading.value = false;
      }
    }
  }
  onMounted(initialize);
  const retry = () =>
    store.value
      ? retryAppend
        ? load(true, retryAppend)
        : load()
      : initialize();
  onScopeDispose(() => {
    active = false;
    ++version;
  });
  async function batch(
    action: "on" | "off" | "stock",
    ids = selected.value,
    stock?: number,
  ) {
    if (mutating.value || !ids.length || store.value?.status === "FROZEN")
      return false;
    mutating.value = true;
    error.value = "";
    try {
      await request("/merchant/products/batch", {
        method: "POST",
        body: { ids: [...ids], action, ...(stock == null ? {} : { stock }) },
      });
      if (!active) return false;
      page.value = 1;
      selected.value = [];
      await load();
      return true;
    } catch (cause) {
      if (active)
        error.value = cause instanceof Error ? cause.message : "商品操作失败";
      return false;
    } finally {
      if (active) mutating.value = false;
    }
  }
  return {
    list,
    categories,
    store,
    status,
    page,
    total,
    counts,
    selected,
    loading,
    loaded,
    mutating,
    error,
    filters,
    applied,
    load,
    retry,
    apply,
    batch,
  };
}
