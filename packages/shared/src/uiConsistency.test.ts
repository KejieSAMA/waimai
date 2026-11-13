import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import {
  clearLoginPassword,
  useFormFeedback,
  validationFields,
} from "./formFeedback";
import { dialogCloseDecision, rowActivation } from "./uiInteraction";
import { useProductEditor } from "./productEditor";
import { usePagedList } from "./pagedList";
import { profileLeaveDecision } from "./profileEditor";
import { addressErrors, passwordError } from "./formValidation";
import { useCategoryEditor } from "./categoryEditor";
import { useUserOrders } from "./userOrders";
import type { CheckoutRequest } from "./cart";
import type { Order } from "./index";

vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((s) => s.stop()));
function setup<T>(make: () => T) {
  const scope = effectScope();
  scopes.push(scope);
  return { s: scope.run(make)!, scope };
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (cause: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
async function flush() {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe("字段反馈、登录和关闭决策", () => {
  it("优先保留嵌套路径及首条消息，兼容原 fieldErrors 和金额别名", () => {
    const error = {
      details: {
        issues: [
          { path: ["account", "username"], message: "账号已存在" },
          { path: ["account", "username"], message: "第二条" },
          { path: ["rules", 2, "discountCents"], message: "优惠过高" },
        ],
        fieldErrors: { "account.username": ["旧信息"], phone: ["手机号错误"] },
      },
    };
    expect(
      validationFields(error, { "rules.2.discountCents": "rules.2.discount" }),
    ).toEqual({
      "account.username": "账号已存在",
      "rules.2.discount": "优惠过高",
      phone: "手机号错误",
    });
    expect(validationFields(new Error("断网"))).toEqual({});
  });
  it("失焦才展示字段错误，提交定位首错，修复后才可提交，服务器错误可清除", () => {
    const name = ref("");
    const f = useFormFeedback((): Record<string, string> =>
      name.value ? {} : { name: "必填" },
    );
    expect(f.field("name")).toBe("");
    f.blur("name");
    expect(f.field("name")).toBe("必填");
    expect(f.check()).toBe(false);
    expect(f.first.value).toBe("name");
    expect(f.focusVersion.value).toBe(1);
    name.value = "正确";
    expect(f.check()).toBe(true);
    f.reject({ details: { issues: [{ path: ["name"], message: "已存在" }] } });
    expect(f.field("name")).toBe("已存在");
    f.blur("name");
    expect(f.field("name")).toBe("");
    f.reset();
    expect(f.first.value).toBe("");
  });
  it.each([undefined, { code: 401 }])(
    "成功及凭据错误清除内存密码 %j",
    (cause) => expect(clearLoginPassword(cause)).toBe(true),
  );
  it.each([
    { code: 429 },
    { code: 500 },
    { code: 503 },
    new Error("断网"),
    { code: 400 },
  ])("可重试失败保留内存密码 %j", (cause) =>
    expect(clearLoginPassword(cause)).toBe(false),
  );
  it("地址必填和手机号错误能映射到字段，空白不可绕过", () => {
    expect(
      addressErrors({
        contact: " ",
        phone: "invalid",
        detail: "a",
        isDefault: false,
      }),
    ).toHaveProperty("contact");
    expect(
      Object.keys(
        addressErrors({
          contact: " ",
          phone: "invalid",
          detail: "a",
          isDefault: false,
        }),
      ),
    ).toEqual(["contact", "phone", "detail"]);
    expect(
      addressErrors({
        contact: "收货人",
        phone: "13800000001",
        detail: "街道一号",
        isDefault: false,
      }),
    ).toEqual({});
  });
  it("密码按字符与 UTF-8 字节同时校验，不改变八字符规则", () => {
    expect(passwordError("12345678")).toBe("");
    expect(passwordError("1234567")).not.toBe("");
    expect(passwordError("中".repeat(24))).toBe("");
    expect(passwordError("中".repeat(25))).not.toBe("");
  });
  it("保存时禁止关闭，修改须确认，身份失效绕过离开确认", () => {
    expect(dialogCloseDecision(true, true)).toBe("block");
    expect(dialogCloseDecision(true, false)).toBe("block");
    expect(dialogCloseDecision(false, true)).toBe("confirm");
    expect(dialogCloseDecision(false, false)).toBe("close");
    expect(profileLeaveDecision(false, true, true)).toBe("block");
    expect(profileLeaveDecision(true, false, true)).toBe("confirm");
    expect(profileLeaveDecision(true, true, false)).toBe("allow");
  });
  it("只有显式整行操作允许鼠标和键盘激活，行内按钮始终隔离", () => {
    expect(rowActivation(false, false)).toBe(false);
    expect(rowActivation(true, true)).toBe(false);
    for (const key of [undefined, "Enter", " "])
      expect(rowActivation(true, false, key)).toBe(true);
    expect(rowActivation(true, true, "Enter")).toBe(false);
    expect(rowActivation(true, false, "Tab")).toBe(false);
  });
});

describe("分页读取是一次完整提交", () => {
  it("失败保留当前页、列表与位置，重试原目标成功后才提交页码和回顶", async () => {
    const read = vi
        .fn()
        .mockResolvedValueOnce({ list: ["第一页"], total: 60 })
        .mockRejectedValueOnce(new Error("断网"))
        .mockResolvedValueOnce({ list: ["第二页"], total: 60 }),
      scroll = vi.fn();
    const { s } = setup(() => usePagedList<string>(read, { scroll }));
    await s.load();
    expect(await s.changePage(2)).toBe(false);
    expect(s.page.value).toBe(1);
    expect(s.list.value).toEqual(["第一页"]);
    expect(scroll).not.toHaveBeenCalled();
    expect(await s.retry()).toBe(true);
    expect(read.mock.lastCall).toEqual([2]);
    expect(s.page.value).toBe(2);
    expect(s.list.value).toEqual(["第二页"]);
    expect(scroll).toHaveBeenCalledOnce();
  });
  it("重复翻页合并，新筛选隔离旧响应，背景刷新不回顶", async () => {
    const old = deferred<{ list: string[]; total: number }>(),
      read = vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockResolvedValue({ list: ["新筛选"], total: 40 }),
      scroll = vi.fn();
    const { s } = setup(() => usePagedList<string>(read, { scroll }));
    const a = s.changePage(2),
      b = s.changePage(2);
    expect(read).toHaveBeenCalledTimes(1);
    await s.query();
    old.resolve({ list: ["旧筛选"], total: 60 });
    await Promise.all([a, b]);
    expect(s.list.value).toEqual(["新筛选"]);
    expect(s.page.value).toBe(1);
    scroll.mockClear();
    await s.refresh();
    expect(scroll).not.toHaveBeenCalled();
  });
  it("缩页只展示最后有效页，补读期间仍保持 loading", async () => {
    const last = deferred<{ list: string[]; total: number }>(),
      read = vi
        .fn()
        .mockResolvedValueOnce({ list: [], total: 21 })
        .mockReturnValueOnce(last.promise);
    const { s } = setup(() => usePagedList<string>(read));
    const pending = s.changePage(4);
    await flush();
    expect(s.loading.value).toBe(true);
    expect(s.loaded.value).toBe(false);
    last.resolve({ list: ["有效页"], total: 21 });
    await pending;
    expect(s.page.value).toBe(2);
    expect(s.loading.value).toBe(false);
  });
  it("初次读取失败与空列表分开，卸载忽略迟到数据及回顶", async () => {
    const late = deferred<{ list: string[]; total: number }>(),
      scroll = vi.fn(),
      read = vi
        .fn()
        .mockRejectedValueOnce(new Error("失败"))
        .mockReturnValueOnce(late.promise);
    const { s, scope } = setup(() => usePagedList<string>(read, { scroll }));
    await s.load();
    expect(s.loaded.value).toBe(false);
    expect(s.error.value).toBe("失败");
    const pending = s.retry();
    scope.stop();
    late.resolve({ list: ["迟到"], total: 1 });
    await pending;
    expect(s.list.value).toEqual([]);
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("商品和类目表单的加载与保存", () => {
  const own = { id: "store", status: "OPEN" };
  function product() {
    const request = vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          path.endsWith("dish-categories") ? [{ id: "c", name: "分类" }] : own,
        ),
      );
    const id = ref("");
    const { s, scope } = setup(() =>
      useProductEditor(request as CheckoutRequest, vi.fn(), id),
    );
    return { s, scope, request, id };
  }
  it("读取失败不允许默认值提交，重试恢复；无效字段定位且不发请求", async () => {
    const request = vi.fn().mockRejectedValue(new Error("读取失败"));
    const { s } = setup(() =>
      useProductEditor(request as CheckoutRequest, vi.fn(), ref("")),
    );
    await flush();
    s.form.name = "输入";
    expect(s.locked.value).toBe(true);
    expect(await s.save()).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
    request.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("dish-categories") ? [{ id: "c" }] : own),
    );
    await s.load();
    expect(s.locked.value).toBe(false);
    s.form.price = "0";
    const before = request.mock.calls.length;
    expect(await s.save()).toBe(false);
    expect(request).toHaveBeenCalledTimes(before);
    expect(s.feedback.first.value).toBe("name");
  });
  it("保存失败保留草稿，互斥提交，成功重置基准并清除错误", async () => {
    const { s, request } = product();
    await flush();
    s.form.name = "商品";
    request.mockRejectedValueOnce(new Error("库存冲突"));
    expect(await s.save()).toBe(false);
    expect(s.form.name).toBe("商品");
    expect(s.dirty.value).toBe(true);
    const wait = deferred<unknown>();
    request.mockReturnValueOnce(wait.promise);
    const pending = s.save();
    expect(await s.save()).toBe(false);
    wait.resolve({});
    expect(await pending).toBe(true);
    expect(s.dirty.value).toBe(false);
    expect(s.error.value).toBe("");
  });
  it("同组件切换商品和卸载忽略旧详情，不覆盖当前草稿", async () => {
    const { s, request, id, scope } = product();
    await flush();
    const old = deferred<unknown>();
    request.mockImplementation((path: string) =>
      path.endsWith("/old")
        ? old.promise
        : Promise.resolve(
            path.endsWith("dish-categories")
              ? [{ id: "c" }]
              : path.includes("products/")
                ? {
                    name: "新商品",
                    priceCents: 100,
                    stock: 3,
                    lowStock: 0,
                    images: "[]",
                    status: "ON",
                    dishCategoryId: "c",
                  }
                : own,
          ),
    );
    id.value = "old";
    await flush();
    id.value = "new";
    await flush();
    expect(s.form.name).toBe("新商品");
    old.resolve({ name: "旧商品" });
    await flush();
    expect(s.form.name).toBe("新商品");
    const late = deferred<unknown>();
    request.mockReturnValue(late.promise);
    const pending = s.load();
    scope.stop();
    late.resolve([]);
    await pending;
    expect(s.form.name).toBe("新商品");
  });
  it("类目保存就近校验，失败不关闭，关闭后不重放写请求", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const { s } = setup(() => useCategoryEditor(request as CheckoutRequest));
    s.edit(null);
    s.name.value = " ";
    expect(await s.save()).toBe(false);
    expect(s.feedback.first.value).toBe("name");
    expect(request).not.toHaveBeenCalled();
    s.name.value = "分类";
    request.mockRejectedValueOnce(new Error("已有同名类目"));
    expect(await s.save()).toBe(false);
    expect(s.open.value).toBe(true);
    expect(s.name.value).toBe("分类");
    expect(s.dialogError.value).toContain("同名");
  });
  it("用户订单加载更多失败后重试仍追加，不跳页或重复请求", async () => {
    const next = deferred<unknown>(),
      request = vi
        .fn()
        .mockResolvedValueOnce({ list: [{ id: "a" }], total: 40 })
        .mockRejectedValueOnce(new Error("断网"))
        .mockReturnValueOnce(next.promise);
    const cart = {} as Parameters<typeof useUserOrders>[1];
    const { s } = setup(() =>
      useUserOrders(request as CheckoutRequest, cart, vi.fn(), true),
    );
    await s.load();
    await s.more();
    expect(s.page.value).toBe(1);
    expect(s.list.value.map((o) => o.id)).toEqual(["a"]);
    const retry = s.load();
    await s.more();
    expect(request).toHaveBeenCalledTimes(3);
    next.resolve({ list: [{ id: "b" } as Order], total: 40 });
    await retry;
    expect(s.page.value).toBe(2);
    expect(s.list.value.map((o) => o.id)).toEqual(["a", "b"]);
  });
});
