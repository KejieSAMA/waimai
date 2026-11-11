import { describe, expect, it } from "vitest";
import { money, phoneTail, firstImage, createApi } from "./index";
describe("格式和客户端", () => {
  it("使用整数分格式化价格", () => {
    expect(money(2850)).toBe("¥28.5");
    expect(money(2800)).toBe("¥28");
  });
  it("只显示手机尾号", () =>
    expect(phoneTail("13800000001")).toBe("尾号 0001"));
  it("兼容旧图片数据", () => {
    expect(firstImage("bad")).toBeUndefined();
    expect(firstImage('["/uploads/a.png"]')).toBe("/uploads/a.png");
  });
  it("传递授权并解析错误", async () => {
    const api = createApi(
      async (_path, init) => {
        expect(init.headers.Authorization).toBe("Bearer test");
        return { ok: true, json: async () => ({ code: 0, data: 12 }) };
      },
      () => "test",
    );
    expect(await api("/test")).toBe(12);
  });
});
