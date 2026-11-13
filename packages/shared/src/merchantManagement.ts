import { computed, onScopeDispose, onMounted, ref, watch } from "vue";
import type { Page, StoreStatus } from "./index";
import type { CheckoutRequest } from "./cart";
export interface MerchantReview {
  id: string;
  rating: number;
  content: string;
  reply: string | null;
  order: { id: string; orderNo: string; doneAt: string | null };
}
export function useMerchantReviews(
  request: CheckoutRequest,
  initial: { rating?: string; reply?: string } = {},
) {
  const rating = ref(initial.rating === "bad" ? "bad" : "all"),
    reply = ref(initial.reply === "pending" ? "pending" : "all"),
    page = ref(1),
    total = ref(0),
    list = ref<MerchantReview[]>([]);
  const loading = ref(true),
    saving = ref(false),
    error = ref(""),
    replyError = ref(""),
    status = ref<StoreStatus>(),
    editing = ref<MerchantReview>(),
    content = ref("");
  let active = true,
    version = 0;
  const readonly = computed(
    () => !status.value || !["OPEN", "CLOSED"].includes(status.value),
  );
  async function load() {
    const current = ++version;
    loading.value = true;
    error.value = "";
    try {
      const result = await request<
        Page<MerchantReview> & { storeStatus: StoreStatus }
      >(
        `/merchant/reviews?rating=${rating.value}&reply=${reply.value}&page=${page.value}`,
      );
      if (!active || current !== version) return;
      list.value = result.list;
      total.value = result.total;
      status.value = result.storeStatus;
      if (page.value > 1 && !result.list.length) {
        page.value = Math.max(1, Math.ceil(result.total / 20));
        await load();
      }
    } catch (e) {
      if (active && current === version)
        error.value = e instanceof Error ? e.message : "评价读取失败";
    } finally {
      if (active && current === version) loading.value = false;
    }
  }
  function edit(row: MerchantReview) {
    if (!saving.value && !readonly.value) {
      editing.value = row;
      content.value = row.reply ?? "";
      replyError.value = "";
    }
  }
  async function save() {
    if (
      saving.value ||
      readonly.value ||
      !editing.value ||
      !content.value.trim() ||
      content.value.trim().length > 500
    )
      return false;
    const row = editing.value;
    saving.value = true;
    replyError.value = "";
    try {
      await request(`/merchant/reviews/${row.id}/reply`, {
        method: "PUT",
        body: { content: content.value.trim() },
      });
      if (!active) return false;
      editing.value = undefined;
      await load();
      return true;
    } catch (e) {
      if (active)
        replyError.value = e instanceof Error ? e.message : "回复保存失败";
      return false;
    } finally {
      if (active) saving.value = false;
    }
  }
  watch([rating, reply], () => {
    page.value = 1;
    void load();
  });
  onMounted(load);
  onScopeDispose(() => {
    active = false;
    version++;
  });
  return {
    rating,
    reply,
    page,
    total,
    list,
    loading,
    saving,
    error,
    replyError,
    status,
    readonly,
    editing,
    content,
    load,
    edit,
    save,
  };
}
export interface PromotionRule {
  thresholdCents: number;
  discountCents: number;
}
export interface PromotionConfig {
  version: number;
  storeStatus: StoreStatus;
  rules: PromotionRule[];
}
const moneyInput = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : NaN;
export function usePromotionsEditor(request: CheckoutRequest) {
  const rules = ref<{ threshold: string; discount: string }[]>([]),
    baseline = ref(""),
    version = ref(0),
    status = ref<StoreStatus>();
  const loading = ref(true),
    saving = ref(false),
    loaded = ref(false),
    error = ref(""),
    notice = ref(""),
    conflict = ref(false);
  let active = true,
    generation = 0;
  const readonly = computed(
    () => !status.value || !["OPEN", "CLOSED"].includes(status.value),
  );
  const dirty = computed(
    () => loaded.value && JSON.stringify(rules.value) !== baseline.value,
  );
  const payload = computed(() =>
    rules.value.map((r) => ({
      thresholdCents: moneyInput(r.threshold),
      discountCents: moneyInput(r.discount),
    })),
  );
  const issue = computed(() => {
    const rows = payload.value;
    if (rows.length > 10) return "最多配置 10 档满减";
    if (
      rows.some(
        (r) =>
          !Number.isSafeInteger(r.thresholdCents) ||
          !Number.isSafeInteger(r.discountCents) ||
          r.thresholdCents <= 0 ||
          r.thresholdCents > 1000000 ||
          r.discountCents <= 0 ||
          r.discountCents > r.thresholdCents,
      )
    )
      return "门槛与优惠需为正数，最多两位小数，优惠不能超过门槛，门槛不超过 10000 元";
    return new Set(rows.map((r) => r.thresholdCents)).size !== rows.length
      ? "满减门槛不能重复"
      : "";
  });
  const canSave = computed(
    () =>
      dirty.value &&
      !issue.value &&
      !readonly.value &&
      !loading.value &&
      !saving.value &&
      !conflict.value,
  );
  function accept(result: PromotionConfig) {
    version.value = result.version;
    status.value = result.storeStatus;
    rules.value = result.rules.map((r) => ({
      threshold: String(r.thresholdCents / 100),
      discount: String(r.discountCents / 100),
    }));
    baseline.value = JSON.stringify(rules.value);
    loaded.value = true;
    conflict.value = false;
  }
  async function load() {
    if (saving.value) return;
    const current = ++generation;
    loading.value = true;
    error.value = "";
    try {
      const result = await request<PromotionConfig>("/merchant/promotions");
      if (active && current === generation) accept(result);
    } catch (e) {
      if (active && current === generation)
        error.value = e instanceof Error ? e.message : "配置读取失败";
    } finally {
      if (active && current === generation) loading.value = false;
    }
  }
  async function save() {
    if (!canSave.value) return false;
    saving.value = true;
    error.value = "";
    notice.value = "";
    const current = ++generation;
    try {
      const result = await request<PromotionConfig>("/merchant/promotions", {
        method: "PUT",
        body: { version: version.value, rules: payload.value },
      });
      if (!active || current !== generation) return false;
      accept(result);
      notice.value = "满减设置已保存";
      return true;
    } catch (e) {
      if (active && current === generation) {
        error.value = e instanceof Error ? e.message : "保存失败";
        if ((e as { code?: number })?.code === 409) conflict.value = true;
      }
      return false;
    } finally {
      if (active && current === generation) saving.value = false;
    }
  }
  function reset() {
    if (!saving.value && baseline.value) {
      rules.value = JSON.parse(baseline.value);
      if (!conflict.value) error.value = "";
      notice.value = "";
    }
  }
  function add() {
    if (
      !readonly.value &&
      !loading.value &&
      !saving.value &&
      rules.value.length < 10
    )
      rules.value.push({ threshold: "", discount: "" });
  }
  function remove(index: number) {
    if (!readonly.value && !loading.value && !saving.value)
      rules.value.splice(index, 1);
  }
  onMounted(load);
  onScopeDispose(() => {
    active = false;
    generation++;
  });
  return {
    rules,
    status,
    loading,
    saving,
    loaded,
    error,
    notice,
    conflict,
    dirty,
    readonly,
    issue,
    canSave,
    load,
    save,
    reset,
    add,
    remove,
  };
}
