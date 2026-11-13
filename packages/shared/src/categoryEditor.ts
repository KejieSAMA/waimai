import { computed, onMounted, onScopeDispose, ref } from "vue";
import type { Category } from "./index";
import type { CheckoutRequest } from "./cart";
import { useFormFeedback } from "./formFeedback";
export function useCategoryEditor(request: CheckoutRequest) {
  const list = ref<Category[]>([]),
    editing = ref<Category | null>(null),
    deleting = ref<Category | null>(null),
    open = ref(false),
    name = ref(""),
    sort = ref("0"),
    loading = ref(true),
    loaded = ref(false),
    busy = ref(false),
    error = ref(""),
    dialogError = ref("");
  let active = true,
    version = 0,
    baseline = "";
  const dirty = computed(
    () => JSON.stringify([name.value, sort.value]) !== baseline,
  );
  const feedback = useFormFeedback(() => ({
    ...(!name.value.trim() || name.value.trim().length > 40
      ? { name: "请填写 1–40 个字的类目名称" }
      : {}),
    ...(!/^\d+$/.test(sort.value) || !Number.isSafeInteger(Number(sort.value))
      ? { sort: "请填写非负整数排序" }
      : {}),
  }));
  async function load() {
    const current = ++version;
    loading.value = true;
    error.value = "";
    try {
      const rows = await request<Category[]>("/admin/categories");
      if (active && current === version) {
        list.value = rows;
        loaded.value = true;
      }
    } catch (e) {
      if (active && current === version)
        error.value = e instanceof Error ? e.message : "类目读取失败";
    } finally {
      if (active && current === version) loading.value = false;
    }
  }
  function edit(row: Category | null) {
    if (busy.value) return;
    editing.value = row;
    name.value = row?.name ?? "";
    sort.value = String(row?.sort ?? 0);
    baseline = JSON.stringify([name.value, sort.value]);
    dialogError.value = "";
    feedback.reset();
    open.value = true;
  }
  async function save() {
    if (busy.value || !dirty.value || !feedback.check()) return false;
    busy.value = true;
    dialogError.value = "";
    try {
      await request(
        "/admin/categories" + (editing.value ? "/" + editing.value.id : ""),
        {
          method: editing.value ? "PUT" : "POST",
          body: { name: name.value.trim(), sort: Number(sort.value) },
        },
      );
      if (!active) return false;
      open.value = false;
      await load();
      return true;
    } catch (e) {
      if (active) {
        feedback.reject(e);
        dialogError.value = e instanceof Error ? e.message : "保存失败";
      }
      return false;
    } finally {
      if (active) busy.value = false;
    }
  }
  async function remove() {
    if (busy.value || !deleting.value) return;
    busy.value = true;
    dialogError.value = "";
    try {
      await request("/admin/categories/" + deleting.value.id, {
        method: "DELETE",
      });
      if (!active) return;
      deleting.value = null;
      await load();
    } catch (e) {
      if (active)
        dialogError.value = e instanceof Error ? e.message : "删除失败";
    } finally {
      if (active) busy.value = false;
    }
  }
  onMounted(load);
  onScopeDispose(() => {
    active = false;
    version++;
  });
  return {
    list,
    editing,
    deleting,
    open,
    name,
    sort,
    loading,
    loaded,
    busy,
    error,
    dialogError,
    dirty,
    feedback,
    load,
    edit,
    save,
    remove,
  };
}
