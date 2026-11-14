import { onMounted, onScopeDispose, ref, watch } from "vue";
import type { Category, Page, Store } from "./index";
import type { CheckoutRequest } from "./cart";
export interface PublicStoresSnapshot {
  stores: Store[];
  category: string;
  sort: string;
  keyword: string;
  appliedKeyword: string;
  page: number;
  total: number;
}
export function usePublicStores(
  request: CheckoutRequest,
  append = false,
  initialKeyword = "",
  options: { snapshot?: PublicStoresSnapshot; preserveOnSearch?: boolean } = {},
) {
  const saved = options.snapshot;
  const categories = ref<Category[]>([]),
    stores = ref<Store[]>(saved?.stores ?? []),
    category = ref(saved?.category ?? ""),
    sort = ref(saved?.sort ?? "default"),
    keyword = ref(saved?.keyword ?? initialKeyword),
    appliedKeyword = ref(saved?.appliedKeyword ?? initialKeyword),
    page = ref(saved?.page ?? 1),
    total = ref(saved?.total ?? 0),
    pending = ref(!saved),
    filterRevision = ref(0),
    error = ref(""),
    categoryError = ref("");
  let version = 0,
    active = true,
    categoriesVersion = 0;
  let retryPage: number | undefined;
  let committedFilter = saved
    ? JSON.stringify([saved.category, saved.sort, saved.appliedKeyword])
    : "";
  const filter = () =>
    JSON.stringify([category.value, sort.value, appliedKeyword.value]);
  async function load(target = retryPage ?? page.value) {
    const current = ++version;
    const requestedFilter = filter();
    pending.value = true;
    error.value = "";
    try {
      const result = await request<Page<Store>>(
        `/public/stores?categoryId=${encodeURIComponent(category.value)}&sort=${sort.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${target}`,
      );
      if (!active || current !== version) return;
      stores.value =
        append && target > 1 && committedFilter === requestedFilter
          ? [
              ...stores.value,
              ...result.list.filter(
                (item) => !stores.value.some((old) => old.id === item.id),
              ),
            ]
          : result.list;
      total.value = result.total;
      page.value = target;
      retryPage = undefined;
      if (target === 1) filterRevision.value++;
      committedFilter = requestedFilter;
      return true;
    } catch (cause) {
      if (active && current === version) {
        retryPage = target;
        error.value = cause instanceof Error ? cause.message : "店铺加载失败";
      }
    } finally {
      if (active && current === version) pending.value = false;
    }
    return false;
  }
  async function loadCategories() {
    const current = ++categoriesVersion;
    categoryError.value = "";
    try {
      const result = await request<Category[]>("/public/categories");
      if (active && current === categoriesVersion) categories.value = result;
    } catch (cause) {
      if (active && current === categoriesVersion)
        categoryError.value =
          cause instanceof Error ? cause.message : "分类加载失败";
    }
  }
  function search() {
    appliedKeyword.value = keyword.value.trim();
    if (!options.preserveOnSearch) {
      page.value = 1;
      stores.value = [];
      total.value = 0;
    }
    void load(1);
  }
  function more() {
    if (!pending.value) void load(retryPage ?? page.value + 1);
  }
  watch([category, sort], search);
  onMounted(() => {
    void loadCategories();
    if (!saved) void load();
  });
  onScopeDispose(() => {
    active = false;
    ++version;
    ++categoriesVersion;
  });
  return {
    categories,
    stores,
    category,
    sort,
    keyword,
    page,
    total,
    pending,
    error,
    categoryError,
    load,
    loadCategories,
    search,
    more,
    filterRevision,
    snapshot: (): PublicStoresSnapshot | undefined => {
      if (error.value || pending.value || committedFilter !== filter())
        return undefined;
      return {
        stores: stores.value,
        category: category.value,
        sort: sort.value,
        keyword: keyword.value,
        appliedKeyword: appliedKeyword.value,
        page: page.value,
        total: total.value,
      };
    },
  };
}
