import { computed, onScopeDispose, reactive, ref } from "vue";
import { ApiError, type Category, type Store } from "./index";
import { useFormFeedback, type FieldErrors } from "./formFeedback";
import {
  storeDraftErrors,
  storeDraft,
  storeDraftIssue,
  storeDraftPayload,
} from "./storeEditor";
import type { CheckoutRequest } from "./cart";
export type ProvisionImage = "logo" | "licenseImage" | "foodPermitImage";
export interface MerchantProvisionResult {
  account: {
    id: string;
    username: string;
    name: string;
    roles: ["MERCHANT"];
    status: "ACTIVE";
    mustChangePassword: true;
  };
  store: Store;
}
export const provisionSections = [
  { key: "account", label: "商家账号" },
  { key: "base", label: "基础信息" },
  { key: "business", label: "营业配送" },
  { key: "qualification", label: "资质信息" },
];
export function useMerchantProvision(port: {
  request: CheckoutRequest;
  upload(file: File, key: ProvisionImage): Promise<string>;
  identity(): string;
}) {
  const account = reactive({ username: "", password: "", name: "", phone: "" });
  const form = reactive(storeDraft());
  const categories = ref<Category[]>([]),
    loading = ref(false),
    loaded = ref(false),
    saving = ref(false),
    uploading = ref("");
  const error = ref(""),
    loadError = ref(""),
    section = ref("account"),
    uncertain = ref(false),
    created = ref<MerchantProvisionResult>();
  const initial = JSON.stringify([account, form]),
    identity = port.identity();
  let alive = true,
    loadVersion = 0;
  const current = () => alive && identity === port.identity();
  const dirty = computed(
    () => !created.value && JSON.stringify([account, form]) !== initial,
  );
  const locked = computed(
    () => loading.value || saving.value || !!uploading.value || !!created.value,
  );
  const canSubmit = computed(
    () =>
      loaded.value &&
      !loadError.value &&
      categories.value.length > 0 &&
      !locked.value,
  );
  function issue() {
    if (!/^[a-z0-9_-]{3,32}$/.test(account.username.trim().toLowerCase()))
      return {
        section: "account",
        message: "账号须为 3–32 位英文、数字、下划线或连字符",
      };
    const bytes = [...account.password].reduce(
      (n, c) =>
        n +
        ((c.codePointAt(0) ?? 0) <= 127
          ? 1
          : (c.codePointAt(0) ?? 0) <= 2047
            ? 2
            : (c.codePointAt(0) ?? 0) <= 65535
              ? 3
              : 4),
      0,
    );
    if ([...account.password].length < 8 || bytes > 72)
      return {
        section: "account",
        message: "临时密码至少 8 个字符，不超过 72 字节",
      };
    if (!account.name.trim() || account.name.trim().length > 30)
      return { section: "account", message: "负责人姓名需为 1–30 个字" };
    if (account.phone.trim() && !/^1[3-9]\d{9}$/.test(account.phone.trim()))
      return {
        section: "account",
        message: "请填写有效的账号联系手机，或留空",
      };
    if (!categories.value.some((c) => c.id === form.categoryId))
      return { section: "base", message: "请选择有效的平台类目" };
    return storeDraftIssue(form, true);
  }
  const feedback = useFormFeedback(() => {
    const e: FieldErrors = {};
    if (!/^[a-z0-9_-]{3,32}$/.test(account.username.trim().toLowerCase()))
      e["account.username"] = "账号须为 3–32 位英文、数字、下划线或连字符";
    const bytes = [...account.password].reduce(
      (n, c) =>
        n +
        ((c.codePointAt(0) ?? 0) <= 127
          ? 1
          : (c.codePointAt(0) ?? 0) <= 2047
            ? 2
            : (c.codePointAt(0) ?? 0) <= 65535
              ? 3
              : 4),
      0,
    );
    if ([...account.password].length < 8 || bytes > 72)
      e["account.password"] = "临时密码至少 8 个字符，不超过 72 字节";
    if (!account.name.trim() || account.name.trim().length > 30)
      e["account.name"] = "负责人姓名需为 1–30 个字";
    if (account.phone.trim() && !/^1[3-9]\d{9}$/.test(account.phone.trim()))
      e["account.phone"] = "请填写有效的联系手机，或留空";
    for (const [key, message] of Object.entries(storeDraftErrors(form, true)))
      e["store." + key] = message;
    return e;
  });
  function locate() {
    const key = feedback.first.value;
    section.value = key.startsWith("account.")
      ? "account"
      : /\.(openHours|notice|min|fee)$/.test(key)
        ? "business"
        : key.includes("ExpireAt")
          ? "qualification"
          : "base";
  }
  async function load() {
    if (saving.value || uploading.value || !current()) return;
    const version = ++loadVersion;
    loading.value = true;
    loadError.value = "";
    try {
      const rows = await port.request<Category[]>("/public/categories");
      if (!current() || version !== loadVersion) return;
      categories.value = rows;
      loaded.value = true;
    } catch (e) {
      if (current() && version === loadVersion)
        loadError.value = e instanceof Error ? e.message : "类目加载失败";
    } finally {
      if (current() && version === loadVersion) loading.value = false;
    }
  }
  async function upload(file: File | undefined, key: ProvisionImage) {
    if (!file || locked.value || !current()) return;
    error.value = "";
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      error.value = "请选择不超过 5MB 的 JPG、PNG 或 WebP 图片";
      return;
    }
    uploading.value = key;
    try {
      const url = await port.upload(file, key);
      if (current()) form[key] = url;
    } catch (e) {
      if (current())
        error.value = e instanceof Error ? e.message : "上传失败，原图片已保留";
    } finally {
      if (current()) uploading.value = "";
    }
  }
  async function save() {
    if (!canSubmit.value || !current()) return;
    if (!feedback.check()) {
      locate();
      error.value = "请检查标记的字段";
      return;
    }
    const invalid = issue();
    if (invalid) {
      section.value = invalid.section;
      error.value = invalid.message;
      return;
    }
    saving.value = true;
    error.value = "";
    uncertain.value = false;
    const payload = {
      account: {
        username: account.username.trim().toLowerCase(),
        password: account.password,
        name: account.name.trim(),
        phone: account.phone.trim(),
      },
      store: storeDraftPayload(
        {
          ...form,
          city: form.city.trim(),
          address: form.address.trim(),
          contactPhone: form.contactPhone.trim(),
          openHours: form.openHours.trim(),
        },
        true,
      ),
    };
    try {
      const result = await port.request<MerchantProvisionResult>(
        "/admin/merchants",
        { method: "POST", body: payload },
      );
      if (!current()) return;
      account.password = "";
      created.value = result;
      return result;
    } catch (e) {
      if (!current()) return;
      feedback.reject(e, {
        "store.minOrderCents": "store.min",
        "store.deliveryFeeCents": "store.fee",
      });
      if (feedback.first.value) locate();
      error.value = e instanceof Error ? e.message : "创建失败";
      if (e instanceof ApiError && e.details?.reason === "USERNAME_TAKEN")
        section.value = "account";
      else if (
        e instanceof ApiError &&
        ["CATEGORY_UNAVAILABLE", "INVALID_LOGO"].includes(
          e.details?.reason ?? "",
        )
      )
        section.value = "base";
      else if (
        e instanceof ApiError &&
        e.details?.reason === "INVALID_QUALIFICATION"
      )
        section.value = "qualification";
      uncertain.value = !(e instanceof ApiError) || e.code >= 500;
      if (uncertain.value)
        error.value +=
          "。创建结果未确认，请先按账号名在账号管理中核对，不要更换账号名重复创建。";
    } finally {
      if (current()) saving.value = false;
    }
  }
  onScopeDispose(() => {
    alive = false;
    loadVersion++;
    account.password = "";
  });
  void load();
  return {
    account,
    feedback,
    form,
    categories,
    loading,
    loaded,
    saving,
    uploading,
    locked,
    canSubmit,
    dirty,
    section,
    error,
    loadError,
    uncertain,
    created,
    load,
    upload,
    save,
  };
}
