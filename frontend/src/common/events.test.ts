import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => ({
  mount: [] as (() => void)[],
  unmount: [] as (() => void)[],
}));
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: (callback: () => void) => hooks.mount.push(callback),
  onBeforeUnmount: (callback: () => void) => hooks.unmount.push(callback),
}));
vi.mock("./auth", () => ({
  useAuth: () => ({ tokens: { MERCHANT: "test" }, refresh: vi.fn() }),
}));
vi.mock("@waimai/shared", () => ({ invalidateRoleData: vi.fn() }));
import { useOrderStream } from "./events";
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
beforeEach(() => {
  hooks.mount.length = hooks.unmount.length = 0;
});
afterEach(() => {
  hooks.unmount.splice(0).forEach((stop) => stop());
  vi.unstubAllGlobals();
});
describe("订单静默实时更新", () => {
  it("移除提醒控件后仍可自动连接并刷新，不请求音频权限，离开后停止", async () => {
    let finish!: (value: { done: boolean }) => void;
    const read = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_path: string, options: RequestInit) => {
      signal = options.signal as AbortSignal;
      return Promise.resolve({
        status: 200,
        ok: true,
        body: { getReader: () => ({ read }) },
      });
    });
    const audio = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("AudioContext", audio);
    const reload = vi.fn().mockResolvedValue(undefined),
      stream = useOrderStream(reload, { autoConnect: true });
    hooks.mount.forEach((start) => start());
    await flush();
    expect(fetch).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(stream.connected.value).toBe(true);
    expect(audio).not.toHaveBeenCalled();
    hooks.unmount.splice(0).forEach((stop) => stop());
    expect(signal?.aborted).toBe(true);
    finish({ done: true });
    await flush();
    expect(stream.connected.value).toBe(false);
  });
  it("其他页面的默认行为不变，未主动开启时不连接", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    useOrderStream(vi.fn().mockResolvedValue(undefined));
    hooks.mount.forEach((start) => start());
    await flush();
    expect(fetch).not.toHaveBeenCalled();
  });
});
