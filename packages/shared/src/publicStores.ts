import { onMounted, onScopeDispose, ref, watch } from "vue";
import type { Category, Page, Store } from "./index";
import type { CheckoutRequest } from "./cart";
export function usePublicStores(
  request: CheckoutRequest,
  append = false,
  initialKeyword = "",
) {
  const categories = ref<Category[]>([]),
    stores = ref<Store[]>([]),
    category = ref(""),
    sort = ref("default"),
    keyword = ref(initialKeyword),
    appliedKeyword = ref(initialKeyword),
    page = ref(1),
    total = ref(0),
    pending = ref(true),
    error = ref(""),
    categoryError = ref("");
  let version = 0,
    active = true,
    categoriesVersion = 0;
  let retryPage: number | undefined;
  async function load(target = retryPage ?? page.value) {
    const current = ++version;
    pending.value = true;
    error.value = "";
    try {
      const result = await request<Page<Store>>(
        `/public/stores?categoryId=${encodeURIComponent(category.value)}&sort=${sort.value}&keyword=${encodeURIComponent(appliedKeyword.value)}&page=${target}`,
      );
      if (!active || current !== version) return;
      stores.value =
        append && target > 1
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
    } catch (cause) {
      if (active && current === version) {
        retryPage = target;
        error.value = cause instanceof Error ? cause.message : "店铺加载失败";
      }
    } finally {
      if (active && current === version) pending.value = false;
    }
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
    page.value = 1;
    stores.value = [];
    total.value = 0;
    void load(1);
  }
  function more() {
    if (!pending.value) void load(page.value + 1);
  }
  watch([category, sort], search);
  onMounted(() => {
    void loadCategories();
    void load();
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
  };
}
