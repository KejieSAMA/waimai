import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import {
  loadMerchantStore,
  merchantStore,
  merchantStoreError,
  resetMerchantStore,
  updateMerchantStore,
} from "./merchantStatus";
import type { Store } from "@waimai/shared";
vi.mock("./api", () => ({ api: vi.fn() }));
const request = vi.mocked(api);
beforeEach(() => {
  resetMerchantStore();
  request.mockReset();
});
afterEach(resetMerchantStore);
describe("商家店铺上下文", () => {
  it("重复读取共享请求，成功状态缓存，失败后允许重试", async () => {
    let done!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const first = loadMerchantStore("a"),
      second = loadMerchantStore("a");
    expect(request).toHaveBeenCalledOnce();
    done({ id: "s", status: "OPEN" });
    await Promise.all([first, second]);
    await loadMerchantStore("a");
    expect(request).toHaveBeenCalledOnce();
    request.mockRejectedValueOnce(new Error("断网"));
    await loadMerchantStore("a", true);
    expect(merchantStoreError.value).toBe("断网");
    request.mockResolvedValueOnce({ id: "s", status: "CLOSED" });
    await loadMerchantStore("a", true);
    expect(merchantStore.value?.status).toBe("CLOSED");
    expect(merchantStoreError.value).toBe("");
  });
  it("账号切换清理旧状态，旧账号响应和保存前旧请求不覆盖新数据", async () => {
    let done!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const old = loadMerchantStore("a");
    request.mockResolvedValueOnce({ id: "b", status: "PENDING" });
    await loadMerchantStore("b");
    done({ id: "a", status: "OPEN" });
    await old;
    expect(merchantStore.value?.id).toBe("b");
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const refresh = loadMerchantStore("b", true);
    updateMerchantStore({ id: "b", status: "CLOSED" } as Store);
    done({ id: "b", status: "OPEN" });
    await refresh;
    expect(merchantStore.value?.status).toBe("CLOSED");
    resetMerchantStore();
    expect(merchantStore.value).toBeUndefined();
  });
});
