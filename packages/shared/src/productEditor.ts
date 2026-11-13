import { computed, onScopeDispose, reactive, ref, watch, type Ref } from "vue";
import type { Category, Product, Store } from "./index";
import type { CheckoutRequest } from "./cart";
import { useFormFeedback, type FieldErrors } from "./formFeedback";
export interface ProductDraft {
  name: string;
  dishCategoryId: string;
  description: string;
  images: string;
  price: string;
  original: string;
  stock: string;
  lowStock: string;
  limit: string;
  listed: boolean;
}
const defaults = (): ProductDraft => ({
  name: "",
  dishCategoryId: "",
  description: "",
  images: "[]",
  price: "28",
  original: "",
  stock: "100",
  lowStock: "5",
  limit: "",
  listed: true,
});
export function productDraftErrors(f: ProductDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.name.trim() || f.name.trim().length > 30)
    errors.name = "请填写 1–30 个字的商品名称";
  if (!f.dishCategoryId) errors.dishCategoryId = "请选择所属分类";
  const money = (v: string) =>
    /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 100000;
  if (!money(f.price)) errors.price = "售价需大于 0，最多两位小数";
  if (
    f.original &&
    (!money(f.original) || Number(f.original) <= Number(f.price))
  )
    errors.original = "划线价需高于售价，最多两位小数";
  for (const [key, max] of [
    ["stock", 1000000],
    ["lowStock", Number.MAX_SAFE_INTEGER],
    ["limit", 999],
  ] as const)
    if (
      !(key === "limit" && !f[key]) &&
      (!/^\d+$/.test(f[key]) ||
        Number(f[key]) > max ||
        (key === "limit" && Number(f[key]) < 1))
    )
      errors[key] =
        key === "limit"
          ? "限购填写 1–999，或留空不限"
          : `请填写 0–${max} 的整数`;
  if (f.description.length > 1000) errors.description = "商品描述最多 1000 字";
  return errors;
}
export function useProductEditor(
  request: CheckoutRequest,
  upload: (file: File) => Promise<string>,
  id: Readonly<Ref<string>>,
) {
  const form = reactive(defaults()),
    categories = ref<Category[]>([]),
    store = ref<Store>();
  const loading = ref(true),
    loaded = ref(false),
    saving = ref(false),
    uploading = ref(false),
    error = ref(""),
    baseline = ref("");
  let alive = true,
    version = 0;
  const feedback = useFormFeedback(() => productDraftErrors(form));
  const editing = computed(() => !!id.value),
    dirty = computed(
      () => loaded.value && JSON.stringify(form) !== baseline.value,
    );
  const locked = computed(
    () =>
      !loaded.value ||
      loading.value ||
      saving.value ||
      uploading.value ||
      !store.value ||
      !["OPEN", "CLOSED"].includes(store.value.status),
  );
  const images = computed<string[]>(() => JSON.parse(form.images));
  async function load() {
    const current = ++version,
      target = id.value;
    loading.value = true;
    loaded.value = false;
    error.value = "";
    feedback.reset();
    try {
      const [groups, own, p] = await Promise.all([
        request<Category[]>("/merchant/dish-categories"),
        request<Store>("/merchant/store"),
        target
          ? request<Product>("/merchant/products/" + encodeURIComponent(target))
          : Promise.resolve(undefined),
      ]);
      if (!alive || current !== version) return;
      Object.assign(
        form,
        defaults(),
        p
          ? {
              ...p,
              price: String(p.priceCents / 100),
              original:
                p.originalPriceCents == null
                  ? ""
                  : String(p.originalPriceCents / 100),
              stock: String(p.stock),
              lowStock: String(p.lowStock),
              limit: p.limitPerOrder ? String(p.limitPerOrder) : "",
              listed: p.status === "ON",
            }
          : { dishCategoryId: groups[0]?.id ?? "" },
      );
      categories.value = groups;
      store.value = own;
      baseline.value = JSON.stringify(form);
      loaded.value = true;
    } catch (e) {
      if (alive && current === version)
        error.value = e instanceof Error ? e.message : "商品读取失败";
    } finally {
      if (alive && current === version) loading.value = false;
    }
  }
  async function save(listed = form.listed) {
    if (locked.value || !dirty.value || !feedback.check()) return false;
    const current = version,
      target = id.value;
    saving.value = true;
    error.value = "";
    try {
      await request(
        "/merchant/products" + (target ? "/" + encodeURIComponent(target) : ""),
        {
          method: target ? "PUT" : "POST",
          body: {
            name: form.name,
            dishCategoryId: form.dishCategoryId,
            description: form.description,
            images: form.images,
            priceCents: Math.round(Number(form.price) * 100),
            originalPriceCents: form.original
              ? Math.round(Number(form.original) * 100)
              : null,
            stock: Number(form.stock),
            lowStock: Number(form.lowStock),
            limitPerOrder: form.limit ? Number(form.limit) : null,
            listed,
          },
        },
      );
      if (!alive || current !== version) return false;
      baseline.value = JSON.stringify(form);
      feedback.reset();
      return true;
    } catch (e) {
      if (alive && current === version) {
        feedback.reject(e, {
          priceCents: "price",
          originalPriceCents: "original",
          limitPerOrder: "limit",
        });
        error.value = e instanceof Error ? e.message : "保存失败";
      }
      return false;
    } finally {
      if (alive && current === version) saving.value = false;
    }
  }
  async function image(files: File[]) {
    if (locked.value) return;
    const current = version;
    uploading.value = true;
    error.value = "";
    try {
      if (
        files.length + images.value.length > 5 ||
        files.some(
          (f) =>
            f.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(f.type),
        )
      )
        throw new Error(
          "请选择最多 5 张、每张不超过 5MB 的 JPG、PNG 或 WebP 图片",
        );
      const urls = await Promise.all(files.map(upload));
      if (alive && current === version)
        form.images = JSON.stringify([...images.value, ...urls]);
    } catch (e) {
      if (alive && current === version)
        error.value = e instanceof Error ? e.message : "上传失败，原图片已保留";
    } finally {
      if (alive && current === version) uploading.value = false;
    }
  }
  watch(id, () => void load(), { immediate: true });
  onScopeDispose(() => {
    alive = false;
    version++;
  });
  return {
    form,
    categories,
    store,
    loading,
    loaded,
    saving,
    uploading,
    error,
    editing,
    dirty,
    locked,
    images,
    feedback,
    load,
    save,
    image,
  };
}
