import { computed, onScopeDispose, ref } from "vue";
import type { Account } from "@waimai/shared";

export function profileLeaveDecision(
  dirty: boolean,
  saving: boolean,
  sameIdentity: boolean,
) {
  if (!sameIdentity || !dirty) return "allow";
  return saving ? "block" : "confirm";
}

export function useProfileEditor(port: {
  read(): Promise<Account>;
  save(data: { name: string; phone: string }): Promise<Account>;
}) {
  const name = ref(""),
    phone = ref(""),
    baseline = ref({ name: "", phone: "" });
  const loading = ref(true),
    saving = ref(false),
    loaded = ref(false),
    error = ref("");
  let alive = true,
    version = 0;
  const dirty = computed(
    () =>
      loaded.value &&
      (name.value.trim() !== baseline.value.name ||
        phone.value.trim() !== baseline.value.phone),
  );
  const nameError = computed(() =>
    !name.value.trim()
      ? "请填写昵称"
      : name.value.trim().length > 30
        ? "昵称最多 30 个字"
        : "",
  );
  const phoneError = computed(() =>
    phone.value.trim() && !/^1[3-9]\d{9}$/.test(phone.value.trim())
      ? "请填写有效的 11 位手机号，或留空"
      : "",
  );
  const valid = computed(() => !nameError.value && !phoneError.value);
  const canSave = computed(
    () => dirty.value && valid.value && !loading.value && !saving.value,
  );
  function accept(account: Account) {
    baseline.value = { name: account.name, phone: account.phone || "" };
    name.value = baseline.value.name;
    phone.value = baseline.value.phone;
    loaded.value = true;
  }
  async function load() {
    if (saving.value) return;
    const id = ++version;
    loading.value = true;
    error.value = "";
    try {
      const account = await port.read();
      if (alive && version === id) accept(account);
    } catch (e) {
      if (alive && version === id)
        error.value = e instanceof Error ? e.message : "资料加载失败";
    } finally {
      if (alive && version === id) loading.value = false;
    }
  }
  async function save() {
    if (!canSave.value) return false;
    saving.value = true;
    error.value = "";
    const id = ++version;
    try {
      const account = await port.save({
        name: name.value.trim(),
        phone: phone.value.trim(),
      });
      if (!alive || id !== version) return false;
      accept(account);
      return true;
    } catch (e) {
      if (alive && version === id)
        error.value = e instanceof Error ? e.message : "保存失败";
      return false;
    } finally {
      if (alive && version === id) saving.value = false;
    }
  }
  onScopeDispose(() => {
    alive = false;
    version++;
  });
  void load();
  return {
    name,
    phone,
    loading,
    saving,
    loaded,
    error,
    dirty,
    canSave,
    nameError,
    phoneError,
    load,
    save,
  };
}
