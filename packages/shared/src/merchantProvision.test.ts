import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { ApiError } from "./index";
import {
  useMerchantProvision,
  type MerchantProvisionResult,
} from "./merchantProvision";
const categories = [{ id: "category", name: "平台类目", sort: 0 }];
const result: MerchantProvisionResult = {
  account: {
    id: "account",
    username: "new_shop",
    name: "负责人",
    roles: ["MERCHANT"],
    status: "ACTIVE",
    mustChangePassword: true,
  },
  store: {
    id: "store",
    name: "新店",
    logo: "",
    categoryId: "category",
    city: "城市",
    address: "测试地址",
    contactPhone: "13833334444",
    notice: "",
    openHours: "09:00-22:00",
    minOrderCents: 2000,
    deliveryFeeCents: 300,
    status: "CLOSED",
    rejectReason: null,
    frozenReason: null,
    rating: null,
    monthlySales: 0,
  },
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function setup(request = vi.fn()) {
  if (!request.getMockImplementation())
    request.mockImplementation(async (path: string) =>
      path === "/public/categories" ? categories : result,
    );
  const scope = effectScope(),
    upload = vi.fn().mockResolvedValue("/uploads/logo.png");
  let identity = "admin:ADMIN:1";
  const editor = scope.run(() =>
    useMerchantProvision({ request, upload, identity: () => identity }),
  )!;
  return {
    scope,
    editor,
    request,
    upload,
    changeIdentity: () => {
      identity = "other:ADMIN:2";
    },
  };
}
function fill(editor: ReturnType<typeof useMerchantProvision>) {
  Object.assign(editor.account, {
    username: " New_Shop ",
    password: "Temporary-123",
    name: " 负责人 ",
    phone: "13811112222",
  });
  Object.assign(editor.form, {
    name: "新店",
    categoryId: "category",
    city: "测试城市",
    address: "测试地址",
    contactPhone: "13833334444",
  });
}
const file = { type: "image/png", size: 100 } as File;

describe("共享店铺创建控制", () => {
  it.each([
    ["CATEGORY_UNAVAILABLE", "base"],
    ["INVALID_LOGO", "base"],
    ["INVALID_QUALIFICATION", "qualification"],
  ])("服务端 %s 错误定位 %s 并保留草稿", async (reason, section) => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(categories)
      .mockRejectedValueOnce(new ApiError(400, "资料已变化", { reason }));
    const state = setup(request);
    await tick();
    fill(state.editor);
    await state.editor.save();
    expect(state.editor.section.value).toBe(section);
    expect(state.editor.account.password).toBe("Temporary-123");
    expect(state.editor.created.value).toBeUndefined();
    state.scope.stop();
  });
  it("默认无账号、城市和类目，不保存密码；类目未加载不能提交", async () => {
    const pending = deferred<typeof categories>();
    const state = setup(vi.fn(() => pending.promise));
    expect(state.editor.loading.value).toBe(true);
    expect(state.editor.canSubmit.value).toBe(false);
    expect(state.editor.account).toEqual({
      username: "",
      password: "",
      name: "",
      phone: "",
    });
    expect(state.editor.form).toMatchObject({
      city: "",
      categoryId: "",
      min: "20",
      fee: "3",
      openHours: "09:00-22:00",
    });
    pending.resolve(categories);
    await tick();
    expect(state.editor.form.categoryId).toBe("");
    state.scope.stop();
  });
  it("类目加载失败可重试、保留草稿；空类目不可创建", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("类目失败"))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(categories);
    const state = setup(request);
    state.editor.account.name = "正在填写";
    await tick();
    expect(state.editor.loadError.value).toBe("类目失败");
    expect(state.editor.canSubmit.value).toBe(false);
    await state.editor.load();
    expect(state.editor.canSubmit.value).toBe(false);
    expect(state.editor.account.name).toBe("正在填写");
    await state.editor.load();
    expect(state.editor.loadError.value).toBe("");
    expect(state.editor.canSubmit.value).toBe(true);
    state.scope.stop();
  });
  it("校验定位账号、基础、营业与资质分组，未通过不发请求", async () => {
    const state = setup();
    await tick();
    fill(state.editor);
    state.editor.account.password = "密".repeat(25);
    await state.editor.save();
    expect(state.editor.section.value).toBe("account");
    state.editor.account.password = "Temporary-123";
    state.editor.form.city = "";
    await state.editor.save();
    expect(state.editor.section.value).toBe("base");
    state.editor.form.city = "城市";
    state.editor.form.fee = "1001";
    await state.editor.save();
    expect(state.editor.section.value).toBe("business");
    state.editor.form.fee = "3";
    state.editor.form.licenseImage = "/uploads/license.png";
    state.editor.form.licenseExpireAt = "2030-02-30";
    await state.editor.save();
    expect(state.editor.section.value).toBe("qualification");
    expect(state.request).toHaveBeenCalledTimes(1);
    state.scope.stop();
  });
  it("规范账号名并区分手机，成功清空密码且不能重复创建", async () => {
    const state = setup();
    await tick();
    fill(state.editor);
    expect(await state.editor.save()).toEqual(result);
    expect(state.request).toHaveBeenLastCalledWith("/admin/merchants", {
      method: "POST",
      body: {
        account: {
          username: "new_shop",
          password: "Temporary-123",
          name: "负责人",
          phone: "13811112222",
        },
        store: expect.objectContaining({
          contactPhone: "13833334444",
          minOrderCents: 2000,
          deliveryFeeCents: 300,
          licenseImage: "",
          licenseExpireAt: null,
        }),
      },
    });
    expect(state.editor.account.password).toBe("");
    expect(state.editor.dirty.value).toBe(false);
    expect(state.editor.canSubmit.value).toBe(false);
    await state.editor.save();
    expect(state.request).toHaveBeenCalledTimes(2);
    state.scope.stop();
  });
  it("上传和提交互斥，创建快照不会随后续改动改变", async () => {
    const pending = deferred<MerchantProvisionResult>(),
      uploaded = deferred<string>();
    const request = vi
      .fn()
      .mockImplementation((path: string) =>
        path === "/public/categories"
          ? Promise.resolve(categories)
          : pending.promise,
      );
    const state = setup(request);
    await tick();
    fill(state.editor);
    state.upload.mockImplementationOnce(() => uploaded.promise);
    const uploading = state.editor.upload(file, "logo");
    await state.editor.save();
    expect(request).toHaveBeenCalledTimes(1);
    uploaded.resolve("/uploads/new.png");
    await uploading;
    const saving = state.editor.save();
    await state.editor.save();
    await state.editor.upload(file, "licenseImage");
    expect(request).toHaveBeenCalledTimes(2);
    expect(state.upload).toHaveBeenCalledTimes(1);
    state.editor.account.name = "后续修改";
    expect(request.mock.calls[1][1]).toMatchObject({
      body: { account: { name: "负责人" } },
    });
    pending.resolve(result);
    await saving;
    state.scope.stop();
  });
  it("账号冲突定位账号组并保留输入；网络失败不自动重试且提示核对结果", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(categories)
      .mockRejectedValueOnce(
        new ApiError(409, "已存在", { reason: "USERNAME_TAKEN" }),
      )
      .mockRejectedValueOnce(new Error("连接中断"));
    const state = setup(request);
    await tick();
    fill(state.editor);
    state.editor.section.value = "business";
    await state.editor.save();
    expect(state.editor.section.value).toBe("account");
    expect(state.editor.account.password).toBe("Temporary-123");
    expect(state.editor.uncertain.value).toBe(false);
    await state.editor.save();
    expect(state.editor.uncertain.value).toBe(true);
    expect(state.editor.error.value).toContain("核对");
    expect(request).toHaveBeenCalledTimes(3);
    state.scope.stop();
  });
  it("上传失败保留旧图片；无效格式不发请求", async () => {
    const state = setup();
    await tick();
    state.editor.form.logo = "/uploads/old.png";
    state.upload.mockRejectedValueOnce(new Error("上传失败"));
    await state.editor.upload(file, "logo");
    expect(state.editor.form.logo).toBe("/uploads/old.png");
    await state.editor.upload(
      { type: "application/pdf", size: 1 } as File,
      "logo",
    );
    expect(state.upload).toHaveBeenCalledTimes(1);
    state.scope.stop();
  });
  it("身份变化后迟到类目和创建响应不应用，卸载清空密码", async () => {
    const load = deferred<typeof categories>();
    const first = setup(vi.fn(() => load.promise));
    first.changeIdentity();
    load.resolve(categories);
    await tick();
    expect(first.editor.loaded.value).toBe(false);
    first.scope.stop();
    const pending = deferred<MerchantProvisionResult>();
    const state = setup(
      vi.fn((path: string) =>
        path === "/public/categories"
          ? Promise.resolve(categories)
          : pending.promise,
      ),
    );
    await tick();
    fill(state.editor);
    const save = state.editor.save();
    state.changeIdentity();
    pending.resolve(result);
    expect(await save).toBeUndefined();
    expect(state.editor.created.value).toBeUndefined();
    state.scope.stop();
    expect(state.editor.account.password).toBe("");
  });
  it("卸载后上传的迟到响应不覆盖表单", async () => {
    const state = setup();
    await tick();
    const pending = deferred<string>();
    state.upload.mockImplementationOnce(() => pending.promise);
    const uploading = state.editor.upload(file, "logo");
    state.scope.stop();
    pending.resolve("/uploads/late.png");
    await uploading;
    expect(state.editor.form.logo).toBe("");
  });
});
