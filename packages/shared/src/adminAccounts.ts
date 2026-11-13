import { DEFAULT_PAGE_SIZE } from "./rules";
import { computed, onScopeDispose, reactive } from "vue";
import type { Role } from "./index";
export interface ManagedAccount {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  roles: Role[];
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
interface Request {
  <T>(path: string, options?: { method?: string; body?: unknown }): Promise<T>;
}
export function useAdminAccounts(request: Request) {
  const state = reactive({
    list: [] as ManagedAccount[],
    total: 0,
    page: 1,
    keyword: "",
    role: "",
    status: "",
    loading: false,
    error: "",
    open: false,
    kind: "create",
    selected: "",
    saving: false,
    detailLoading: false,
    detailReady: false,
    dialogError: "",
    audit: [] as {
      id: string;
      action: string;
      createdAt: string;
      reason?: string;
      actorName?: string;
    }[],
    form: {
      username: "",
      name: "",
      phone: "",
      password: "",
      roles: ["USER"] as Role[],
    },
  });
  let sequence = 0,
    detailSequence = 0;
  let applied = { keyword: "", role: "", status: "" };
  onScopeDispose(() => {
    sequence++;
    detailSequence++;
  });
  async function load() {
    const version = ++sequence;
    state.loading = true;
    state.error = "";
    try {
      const q = new URLSearchParams({
        ...applied,
        page: String(state.page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      const result = await request<{ list: ManagedAccount[]; total: number }>(
        "/admin/accounts?" + q,
      );
      if (version !== sequence) return;
      state.list = result.list;
      state.total = result.total;
      if (
        state.page > Math.max(1, Math.ceil(result.total / DEFAULT_PAGE_SIZE))
      ) {
        state.page = Math.max(1, Math.ceil(result.total / DEFAULT_PAGE_SIZE));
        await load();
      }
    } catch (e) {
      if (version === sequence)
        state.error = e instanceof Error ? e.message : "加载失败";
    } finally {
      if (version === sequence) state.loading = false;
    }
  }
  function query(reset = false) {
    if (reset) state.keyword = state.role = state.status = "";
    applied = {
      keyword: state.keyword,
      role: state.role,
      status: state.status,
    };
    state.page = 1;
    return load();
  }
  async function open(kind: string, account?: Pick<ManagedAccount, "id">) {
    if (state.saving) return;
    const version = ++detailSequence;
    state.kind = kind;
    state.selected = account?.id ?? "";
    state.dialogError = "";
    state.audit = [];
    state.form = {
      username: "",
      name: "",
      phone: "",
      password: "",
      roles: ["USER"],
    };
    state.open = true;
    state.detailReady = !account;
    state.detailLoading = !!account;
    if (!account) return;
    try {
      const detail = await request<ManagedAccount>(
        "/admin/accounts/" + account.id,
      );
      if (version === detailSequence) {
        state.form = {
          username: detail.username,
          name: detail.name,
          phone: detail.phone ?? "",
          password: "",
          roles: detail.roles,
        };
        state.detailReady = true;
      }
    } catch (e) {
      if (version === detailSequence)
        state.dialogError = e instanceof Error ? e.message : "加载失败";
    } finally {
      if (version === detailSequence) state.detailLoading = false;
    }
  }
  function close() {
    if (state.saving) return;
    detailSequence++;
    state.open = false;
    state.form.password = "";
  }
  async function save(action = state.kind) {
    if (state.saving || state.detailLoading || !state.detailReady) return;
    state.saving = true;
    state.dialogError = "";
    try {
      const form = state.form;
      if (action === "create")
        await request("/admin/accounts", {
          method: "POST",
          body: {
            username: form.username,
            name: form.name,
            phone: form.phone,
            password: form.password,
            roles: form.roles,
          },
        });
      else
        await request(
          "/admin/accounts/" +
            state.selected +
            (action === "edit" ? "" : "/" + action),
          {
            method: "PUT",
            body:
              action === "roles"
                ? { roles: form.roles }
                : action === "password"
                  ? { password: form.password }
                  : { name: form.name, phone: form.phone },
          },
        );
      state.open = false;
      state.form.password = "";
      await load();
    } catch (e) {
      state.dialogError = e instanceof Error ? e.message : "保存失败";
      state.form.password = "";
    } finally {
      state.saving = false;
    }
  }
  async function status(account: ManagedAccount) {
    await open("status", account);
  }
  async function confirmStatus() {
    if (state.saving || !state.detailReady) return;
    const account = state.list.find((a) => a.id === state.selected);
    if (!account) return;
    state.saving = true;
    state.dialogError = "";
    try {
      await request("/admin/accounts/" + state.selected + "/status", {
        method: "PUT",
        body: { status: account.status === "ACTIVE" ? "DISABLED" : "ACTIVE" },
      });
      state.open = false;
      await load();
    } catch (e) {
      state.dialogError = e instanceof Error ? e.message : "操作失败";
    } finally {
      state.saving = false;
    }
  }
  async function audit() {
    const version = detailSequence;
    state.dialogError = "";
    try {
      const result = await request<typeof state.audit>(
        "/admin/accounts/" + state.selected + "/audit",
      );
      if (version === detailSequence) state.audit = result;
    } catch (e) {
      if (version === detailSequence)
        state.dialogError = e instanceof Error ? e.message : "加载失败";
    }
  }
  const retryDetail = () =>
    open(state.kind, state.selected ? { id: state.selected } : undefined);
  return {
    retryDetail,
    state,
    pages: computed(() =>
      Math.max(1, Math.ceil(state.total / DEFAULT_PAGE_SIZE)),
    ),
    load,
    query,
    open,
    close,
    save,
    status,
    confirmStatus,
    audit,
  };
}
