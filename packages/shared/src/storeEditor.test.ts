import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import {
  merchantStoreEntry,
  merchantStoreRedirect,
  storeDraft,
  storeDraftIssue,
  storeDraftPayload,
  useStoreEditor,
} from "./storeEditor";
import type { CheckoutRequest } from "./cart";
import type { Store } from "./index";
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
const store = {
  id: "s",
  name: "测试面馆",
  status: "OPEN",
  categoryId: "c",
  city: "北京",
  address: "测试街道 1 号",
  contactPhone: "13800000001",
  openHours: "09:00-22:00",
  notice: "",
  minOrderCents: 2000,
  deliveryFeeCents: 300,
  logo: "",
  licenseImage: "/uploads/license.png",
  foodPermitImage: "/uploads/permit.png",
  licenseExpireAt: "2028-01-01T00:00:00Z",
} as Store;
function setup(application = false, initial: Store | null = store) {
  const request = vi.fn().mockResolvedValue([{ id: "c", name: "面馆" }]);
  const saved = vi.fn(),
    loader = vi.fn().mockResolvedValue(initial);
  const scope = effectScope();
  scopes.push(scope);
  const editor = scope.run(() =>
    useStoreEditor(request as CheckoutRequest, application, loader, saved),
  )!;
  return { editor, request, saved, scope, loader };
}
describe("店铺入口与分组草稿", () => {
  it("未知状态不提前显示入口，未入驻与审核状态显示申请，通过及冻结只显示设置", () => {
    expect(merchantStoreEntry(undefined)).toBeNull();
    expect(merchantStoreEntry(null)?.key).toBe("/merchant/apply");
    for (const status of ["PENDING", "REJECTED"] as const)
      expect(merchantStoreEntry({ ...store, status })?.key).toBe(
        "/merchant/apply",
      );
    for (const status of ["OPEN", "CLOSED", "FROZEN"] as const)
      expect(merchantStoreEntry({ ...store, status })?.key).toBe(
        "/merchant/store",
      );
  });
  it("旧设置和申请路径按状态替换，目标路径不循环且不影响其他页面", () => {
    expect(merchantStoreRedirect(null, "/merchant/store")).toBe(
      "/merchant/apply",
    );
    expect(merchantStoreRedirect(store, "/merchant/apply")).toBe(
      "/merchant/store",
    );
    expect(merchantStoreRedirect(store, "/merchant/store")).toBeNull();
    expect(merchantStoreRedirect(undefined, "/merchant/store")).toBeNull();
    expect(merchantStoreRedirect(null, "/merchant/products")).toBeNull();
  });
  it("切组不丢编辑，取消恢复基准，不把独立营业状态更新当表单修改", async () => {
    const { editor } = setup();
    await editor.load();
    expect(editor.dirty.value).toBe(false);
    editor.form.name = "新面馆";
    editor.section.value = "business";
    editor.section.value = "base";
    expect(editor.form.name).toBe("新面馆");
    expect(editor.dirty.value).toBe(true);
    editor.store.value = { ...store, status: "CLOSED" };
    expect(editor.form.name).toBe("新面馆");
    editor.reset();
    expect(editor.form.name).toBe(store.name);
    expect(editor.dirty.value).toBe(false);
  });
  it("保存失败保留所有组输入，成功用后端返回值更新基准，证照不混入营业设置", async () => {
    const { editor, request, saved } = setup();
    await editor.load();
    editor.form.name = "新的名称";
    editor.form.fee = "2.5";
    request.mockRejectedValueOnce(new Error("网络错误"));
    expect(await editor.save()).toBe(false);
    expect(editor.form.name).toBe("新的名称");
    expect(editor.form.fee).toBe("2.5");
    expect(editor.dirty.value).toBe(true);
    request.mockResolvedValueOnce({
      ...store,
      name: "规范后的名称",
      deliveryFeeCents: 250,
    });
    expect(await editor.save()).toBe(true);
    expect(editor.form.name).toBe("规范后的名称");
    expect(editor.dirty.value).toBe(false);
    expect(saved).toHaveBeenCalledOnce();
    expect(request.mock.lastCall![1].body).toMatchObject({
      deliveryFeeCents: 250,
    });
    expect(request.mock.lastCall![1].body).not.toHaveProperty("licenseImage");
  });
  it("提交期间互斥，上传与冻结时不可保存", async () => {
    const { editor, request } = setup();
    await editor.load();
    editor.uploading.value = true;
    expect(await editor.save()).toBe(false);
    editor.uploading.value = false;
    let done!: (value: Store) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const first = editor.save();
    const calls = request.mock.calls.length;
    expect(await editor.save()).toBe(false);
    expect(request).toHaveBeenCalledTimes(calls);
    done(store);
    await first;
    editor.store.value = { ...store, status: "FROZEN" };
    expect(await editor.save()).toBe(false);
  });
  it("待审核允许修改重提，申请携带证照，校验失败定位对应分组", async () => {
    const { editor, request } = setup(true, { ...store, status: "PENDING" });
    await editor.load();
    editor.form.contactPhone = "123";
    expect(await editor.save()).toBe(false);
    expect(editor.section.value).toBe("base");
    editor.form.contactPhone = store.contactPhone;
    editor.form.fee = "1.999";
    expect(await editor.save()).toBe(false);
    expect(editor.section.value).toBe("business");
    editor.form.fee = "2";
    editor.form.licenseExpireAt = "2028-02-31";
    expect(await editor.save()).toBe(false);
    expect(editor.section.value).toBe("qualification");
    editor.form.licenseExpireAt = "2028-01-01";
    editor.form.licenseImage = "";
    request.mockResolvedValueOnce({ ...store, status: "PENDING" });
    expect(await editor.save()).toBe(true);
    expect(request.mock.lastCall![0]).toBe("/merchant/application");
    expect(request.mock.lastCall![1].body).toMatchObject({
      licenseImage: "",
      licenseExpireAt: null,
    });
  });
  it.each(["none", "license", "permit"])(
    "证照选填：%s 组合可以提交，空日期明确清除，不携带孤立有效期",
    (kind) => {
      const form = storeDraft(store);
      form.licenseImage = kind === "license" ? store.licenseImage! : "";
      form.foodPermitImage = kind === "permit" ? store.foodPermitImage! : "";
      form.licenseExpireAt = "";
      form.permitExpireAt = kind === "permit" ? "" : "2028-01-01";
      expect(storeDraftIssue(form, true)).toBeNull();
      expect(storeDraftPayload(form, true)).toMatchObject({
        licenseImage: form.licenseImage,
        foodPermitImage: form.foodPermitImage,
        licenseExpireAt: null,
        permitExpireAt: null,
      });
    },
  );
  it("无店铺可填写申请，加载失败可重试，离开后不写回旧加载", async () => {
    const { editor, loader, scope } = setup(true, null);
    loader.mockResolvedValueOnce(undefined);
    await editor.load();
    expect(editor.error.value).not.toBe("");
    await editor.load();
    expect(editor.store.value).toBeNull();
    expect(editor.form.categoryId).toBe("c");
    let done!: (value: Store) => void;
    loader.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const loading = editor.load();
    scope.stop();
    done(store);
    await loading;
    expect(editor.store.value).toBeNull();
  });
  it("金额边界和证照日期转换不依赖 DOM", () => {
    const form = storeDraft(store);
    expect(form.licenseExpireAt).toBe("2028-01-01");
    form.min = "10000";
    form.fee = "1000";
    expect(storeDraftIssue(form, false)).toBeNull();
    expect(storeDraftPayload(form, false)).toMatchObject({
      minOrderCents: 1000000,
      deliveryFeeCents: 100000,
    });
    form.fee = "1001";
    expect(storeDraftIssue(form, false)?.section).toBe("business");
  });
});
