import { computed, onMounted, onScopeDispose, reactive, ref } from "vue";
import type { Category, Store } from "./index";
import type { CheckoutRequest } from "./cart";
export const qualificationDocuments = [
  { key: "licenseImage", date: "licenseExpireAt", title: "营业执照" },
  { key: "foodPermitImage", date: "permitExpireAt", title: "食品经营许可证" },
] as const;
export function merchantStoreEntry(store: Store | null | undefined) {
  if (store === undefined) return null;
  return !store || ["PENDING", "REJECTED"].includes(store.status)
    ? { key: "/merchant/apply", label: "入驻申请", icon: "shield" as const }
    : { key: "/merchant/store", label: "店铺设置", icon: "store" as const };
}
export function merchantStoreRedirect(
  store: Store | null | undefined,
  path: string,
) {
  if (!["/merchant/apply", "/merchant/store"].includes(path)) return null;
  const entry = merchantStoreEntry(store);
  return entry && entry.key !== path ? entry.key : null;
}
export interface StoreDraft {
  name: string;
  categoryId: string;
  city: string;
  address: string;
  contactPhone: string;
  notice: string;
  openHours: string;
  min: string;
  fee: string;
  logo: string;
  licenseImage: string;
  foodPermitImage: string;
  licenseExpireAt: string;
  permitExpireAt: string;
}
export function storeDraft(store?: Store | null): StoreDraft {
  return {
    name: store?.name ?? "",
    categoryId: store?.categoryId ?? "",
    city: store?.city ?? "",
    address: store?.address ?? "",
    contactPhone: store?.contactPhone ?? "",
    notice: store?.notice ?? "",
    openHours: store?.openHours ?? "09:00-22:00",
    min: String((store?.minOrderCents ?? 2000) / 100),
    fee: String((store?.deliveryFeeCents ?? 300) / 100),
    logo: store?.logo ?? "",
    licenseImage: store?.licenseImage ?? "",
    foodPermitImage: store?.foodPermitImage ?? "",
    licenseExpireAt: store?.licenseExpireAt?.slice(0, 10) ?? "",
    permitExpireAt: store?.permitExpireAt?.slice(0, 10) ?? "",
  };
}
export function storeDraftIssue(form: StoreDraft, application: boolean) {
  if (form.name.trim().length < 2 || form.name.trim().length > 60)
    return { section: "base", message: "店铺名称需为 2–60 个字" };
  if (
    !form.categoryId ||
    !form.city.trim() ||
    form.city.length > 30 ||
    form.address.trim().length < 2 ||
    form.address.length > 200
  )
    return { section: "base", message: "请完整填写类目、城市与店铺地址" };
  if (!/^1[3-9]\d{9}$/.test(form.contactPhone))
    return { section: "base", message: "请填写有效的联系电话" };
  if (
    !form.openHours.trim() ||
    form.openHours.length > 100 ||
    form.notice.length > 300
  )
    return { section: "business", message: "请检查营业时间与公告长度" };
  if (
    !/^\d+(\.\d{1,2})?$/.test(form.min) ||
    !/^\d+(\.\d{1,2})?$/.test(form.fee) ||
    Number(form.min) > 10000 ||
    Number(form.fee) > 1000
  )
    return {
      section: "business",
      message: "起送价应在 0–10000 元，配送费应在 0–1000 元，最多两位小数",
    };
  if (application)
    for (const doc of qualificationDocuments) {
      const date = form[doc.date];
      if (
        form[doc.key] &&
        date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      )
        return {
          section: "qualification",
          message: `请填写有效的${doc.title}有效期`,
        };
    }
  return null;
}
export function storeDraftPayload(form: StoreDraft, application: boolean) {
  const {
    min,
    fee,
    licenseImage,
    foodPermitImage,
    licenseExpireAt,
    permitExpireAt,
    ...base
  } = form;
  return {
    ...base,
    minOrderCents: Math.round(Number(min) * 100),
    deliveryFeeCents: Math.round(Number(fee) * 100),
    ...(application
      ? {
          licenseImage,
          foodPermitImage,
          licenseExpireAt:
            licenseImage && licenseExpireAt ? licenseExpireAt : null,
          permitExpireAt:
            foodPermitImage && permitExpireAt ? permitExpireAt : null,
        }
      : {}),
  };
}
export function useStoreEditor(
  request: CheckoutRequest,
  application: boolean,
  loadStore: () => Promise<Store | null | undefined>,
  saved: (store: Store) => void,
) {
  const form = reactive(storeDraft()),
    store = ref<Store | null>(),
    categories = ref<Category[]>([]),
    section = ref("base"),
    loading = ref(true),
    saving = ref(false),
    uploading = ref(false),
    error = ref(""),
    baseline = ref("");
  let active = true,
    version = 0;
  const dirty = computed(
    () => !!baseline.value && JSON.stringify(form) !== baseline.value,
  );
  const readonly = computed(() => store.value?.status === "FROZEN");
  function reset() {
    if (!saving.value && !uploading.value && baseline.value) {
      Object.assign(form, JSON.parse(baseline.value));
      error.value = "";
    }
  }
  async function load() {
    const current = ++version;
    loading.value = true;
    error.value = "";
    try {
      const [value, options] = await Promise.all([
        loadStore(),
        request<Category[]>("/public/categories"),
      ]);
      if (!active || current !== version) return;
      if (value === undefined) throw new Error("店铺信息加载失败，请重试");
      store.value = value;
      categories.value = options;
      Object.assign(form, storeDraft(value));
      if (!form.categoryId) form.categoryId = options[0]?.id ?? "";
      baseline.value = JSON.stringify(form);
    } catch (cause) {
      if (active && current === version)
        error.value = cause instanceof Error ? cause.message : "资料加载失败";
    } finally {
      if (active && current === version) loading.value = false;
    }
  }
  async function save() {
    if (loading.value || saving.value || uploading.value || readonly.value)
      return false;
    const issue = storeDraftIssue(form, application);
    if (issue) {
      section.value = issue.section;
      error.value = issue.message;
      return false;
    }
    saving.value = true;
    error.value = "";
    try {
      const value = await request<Store>(
        application ? "/merchant/application" : "/merchant/store",
        { method: "PUT", body: storeDraftPayload(form, application) },
      );
      if (!active) return false;
      saved(value);
      store.value = value;
      Object.assign(form, storeDraft(value));
      baseline.value = JSON.stringify(form);
      return true;
    } catch (cause) {
      if (active)
        error.value =
          cause instanceof Error ? cause.message : "保存失败，请重试";
      return false;
    } finally {
      if (active) saving.value = false;
    }
  }
  onMounted(load);
  onScopeDispose(() => {
    active = false;
    ++version;
  });
  return {
    form,
    store,
    categories,
    section,
    loading,
    saving,
    uploading,
    error,
    dirty,
    readonly,
    load,
    save,
    reset,
  };
}
