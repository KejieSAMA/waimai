import { DEFAULT_PAGE_SIZE } from "./rules";
import { computed, onScopeDispose, reactive } from "vue";
import { useFormFeedback, type FieldErrors } from "./formFeedback";
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
export function useAdminAccounts(request: Request, onPageSuccess?: () => void) {
  const state = reactive({
    list: [] as ManagedAccount[],
    total: 0,
    page: 1,
    keyword: "",
    role: "",
    status: "",
    loading: true,
    loaded: false,
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
  const feedback = useFormFeedback(() => {
    const e: FieldErrors = {},
      f = state.form;
    if (
      state.kind === "create" &&
      !/^[a-z0-9_-]{3,32}$/.test(f.username.trim().toLowerCase())
    )
      e.username = "账号须为 3–32 位英文、数字、下划线或连字符";
    if (["create", "edit"].includes(state.kind)) {
      if (!f.name.trim() || f.name.trim().length > 30)
        e.name = "昵称需为 1–30 个字";
      if (f.phone && !/^1[3-9]\d{9}$/.test(f.phone))
        e.phone = "请填写有效的 11 位手机号，或留空";
      if (!f.roles.length) e.roles = "请至少保留一个授权身份";
    }
    if (["create", "password"].includes(state.kind)) {
      const bytes = [...f.password].reduce(
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
      if ([...f.password].length < 8 || bytes > 72)
        e.password = "临时密码至少 8 个字符，不超过 72 字节";
    }
    return e;
  });
  let baseline = "";
  const dirty = computed(
    () => state.detailReady && JSON.stringify(state.form) !== baseline,
  );
  let sequence = 0,
    detailSequence = 0;
  let applied = { keyword: "", role: "", status: "" };
  onScopeDispose(() => {
    sequence++;
    detailSequence++;
  });
  let committedPage = 1,
    retryPage = 1,
    retryScroll = false;
  async function readPage(target: number, scroll = false) {
    retryPage = target;
    retryScroll = scroll;
    const version = ++sequence;
    state.loading = true;
    state.error = "";
    try {
      const q = new URLSearchParams({
        ...applied,
        page: String(target),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      const result = await request<{ list: ManagedAccount[]; total: number }>(
        "/admin/accounts?" + q,
      );
      if (version !== sequence) return;
      const last = Math.max(1, Math.ceil(result.total / DEFAULT_PAGE_SIZE));
      if (target > last) return readPage(last, scroll);
      state.loaded = true;
      state.list = result.list;
      state.total = result.total;
      state.page = committedPage = target;
      if (scroll) onPageSuccess?.();
    } catch (e) {
      if (version === sequence) {
        state.page = committedPage;
        state.error = e instanceof Error ? e.message : "加载失败";
      }
    } finally {
      if (version === sequence) state.loading = false;
    }
  }
  const load = () => readPage(committedPage);
  const retry = () => readPage(retryPage, retryScroll);
  const changePage = (page: number) => readPage(page, true);
  function query(reset = false) {
    if (reset) state.keyword = state.role = state.status = "";
    applied = {
      keyword: state.keyword,
      role: state.role,
      status: state.status,
    };
    return readPage(1, true);
  }
  async function open(kind: string, account?: Pick<ManagedAccount, "id">) {
    if (state.saving) return;
    const version = ++detailSequence;
    feedback.reset();
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
    if (!account) {
      baseline = JSON.stringify(state.form);
      return;
    }
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
        baseline = JSON.stringify(state.form);
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
    if (!feedback.check()) return;
    const version = detailSequence;
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
      if (version !== detailSequence) return;
      state.open = false;
      state.form.password = "";
      await load();
    } catch (e) {
      if (version !== detailSequence) return;
      feedback.reject(e);
      state.dialogError = e instanceof Error ? e.message : "保存失败";
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
    feedback,
    dirty,
    state,
    pages: computed(() =>
      Math.max(1, Math.ceil(state.total / DEFAULT_PAGE_SIZE)),
    ),
    load,
    retry,
    changePage,
    query,
    open,
    close,
    save,
    status,
    confirmStatus,
    audit,
  };
}
