import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import {
  usePromotionsEditor,
  useMerchantReviews,
  type MerchantReview,
} from "./merchantManagement";
import type { CheckoutRequest } from "./cart";
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((s) => s.stop()));
function inside<T>(factory: () => T) {
  const scope = effectScope();
  scopes.push(scope);
  return { state: scope.run(factory)!, scope };
}
function delayed<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
const config = {
  version: 1,
  storeStatus: "OPEN",
  rules: [{ thresholdCents: 2000, discountCents: 500 }],
};
const review = {
  id: "r",
  rating: 2,
  content: "不好",
  reply: null,
  order: { id: "o", orderNo: "001", doneAt: null },
} satisfies MerchantReview;
describe("经营配置控制", () => {
  it("满减草稿数值校验、取消和空列表保存，失败保留输入", async () => {
    const request = vi.fn().mockResolvedValue(config);
    const { state: s } = inside(() =>
      usePromotionsEditor(request as CheckoutRequest),
    );
    await s.load();
    expect(s.dirty.value).toBe(false);
    s.rules.value[0].discount = "30";
    expect(s.canSave.value).toBe(true);
    const before = request.mock.calls.length;
    expect(await s.save()).toBe(false);
    expect(request).toHaveBeenCalledTimes(before);
    expect(s.feedback.first.value).toBe("rules.0.discount");
    s.reset();
    s.rules.value[0].discount = "6";
    expect(s.canSave.value).toBe(true);
    request.mockRejectedValueOnce(new Error("断网"));
    expect(await s.save()).toBe(false);
    expect(s.rules.value[0].discount).toBe("6");
    s.remove(0);
    request.mockResolvedValueOnce({ ...config, version: 2, rules: [] });
    expect(await s.save()).toBe(true);
    expect(request.mock.lastCall![1].body).toEqual({ version: 1, rules: [] });
    expect(s.dirty.value).toBe(false);
  });
  it("版本冲突不自动覆盖草稿，重新读取后才恢复保存；冻结只读", async () => {
    const request = vi.fn().mockResolvedValue(config);
    const { state: s } = inside(() =>
      usePromotionsEditor(request as CheckoutRequest),
    );
    await s.load();
    s.rules.value[0].discount = "6";
    request.mockRejectedValueOnce(
      Object.assign(new Error("冲突"), { code: 409 }),
    );
    await s.save();
    expect(s.conflict.value).toBe(true);
    expect(s.canSave.value).toBe(false);
    expect(s.rules.value[0].discount).toBe("6");
    request.mockResolvedValueOnce({
      ...config,
      version: 3,
      storeStatus: "FROZEN",
    });
    await s.load();
    expect(s.readonly.value).toBe(true);
    expect(s.rules.value[0].discount).toBe("5");
    s.add();
    expect(s.rules.value).toHaveLength(1);
  });
  it("保存互斥、卸载后忽略迟到响应", async () => {
    const request = vi.fn().mockResolvedValue(config);
    const { state: s, scope } = inside(() =>
      usePromotionsEditor(request as CheckoutRequest),
    );
    await s.load();
    s.rules.value[0].discount = "6";
    const wait = delayed<typeof config>();
    request.mockReturnValueOnce(wait.promise);
    const saving = s.save();
    expect(await s.save()).toBe(false);
    scope.stop();
    wait.resolve({
      ...config,
      rules: [{ thresholdCents: 2000, discountCents: 700 }],
    });
    expect(await saving).toBe(false);
    expect(s.rules.value[0].discount).toBe("6");
  });
  it("评价筛选隔离迟到列表，回复失败保留输入并支持修改", async () => {
    const result = { list: [review], total: 1, storeStatus: "OPEN" };
    const request = vi.fn().mockResolvedValue(result);
    const { state: s } = inside(() =>
      useMerchantReviews(request as CheckoutRequest, {
        rating: "bad",
        reply: "pending",
      }),
    );
    await s.load();
    expect(request.mock.lastCall![0]).toContain("rating=bad&reply=pending");
    const wait = delayed<typeof result>();
    request.mockReturnValueOnce(wait.promise);
    const old = s.load();
    s.reply.value = "replied";
    await nextTick();
    await Promise.resolve();
    wait.resolve({ ...result, list: [], total: 0 });
    await old;
    expect(s.list.value).toHaveLength(1);
    s.edit(review);
    s.content.value = "改善";
    request.mockRejectedValueOnce(new Error("失败"));
    expect(await s.save()).toBe(false);
    expect(s.content.value).toBe("改善");
    expect(s.editing.value?.id).toBe("r");
    request
      .mockResolvedValueOnce({ id: "r", reply: "改善" })
      .mockResolvedValueOnce({
        ...result,
        list: [{ ...review, reply: "改善" }],
      });
    expect(await s.save()).toBe(true);
    expect(s.editing.value).toBeUndefined();
    expect(s.list.value[0].reply).toBe("改善");
  });
  it("冻结与卸载阻止评价草稿写回", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ list: [review], total: 1, storeStatus: "FROZEN" });
    const { state: s, scope } = inside(() =>
      useMerchantReviews(request as CheckoutRequest),
    );
    await s.load();
    s.edit(review);
    expect(s.editing.value).toBeUndefined();
    const wait = delayed<unknown>();
    request.mockReturnValueOnce(wait.promise);
    const loading = s.load();
    scope.stop();
    wait.resolve({ list: [], total: 0, storeStatus: "OPEN" });
    await loading;
    expect(s.list.value).toHaveLength(1);
  });
});
