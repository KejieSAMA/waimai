import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const hooks = vi.hoisted(() => ({
  mount: [] as (() => void)[],
  unmount: [] as (() => void)[],
}));
vi.mock("vue", async (original) => ({
  ...(await original<typeof import("vue")>()),
  onMounted: (f: () => void) => hooks.mount.push(f),
  onBeforeUnmount: (f: () => void) => hooks.unmount.push(f),
}));
vi.mock("./auth", () => ({
  useAuth: () => ({ tokens: { MERCHANT: "test" }, refresh: vi.fn() }),
}));
vi.mock("@waimai/shared", () => ({ invalidateRoleData: vi.fn() }));
import { useOrderStream } from "./events";
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}
beforeEach(() => {
  hooks.mount.length = hooks.unmount.length = 0;
});
afterEach(() => {
  hooks.unmount.splice(0).forEach((f) => f());
  vi.unstubAllGlobals();
});
describe("手机订单静默连接", () => {
  it("自动连接不申请音频权限，关闭提醒不关闭状态更新或创建重复连接", async () => {
    let finish!: (result: { done: boolean }) => void,
      signal: AbortSignal | undefined;
    const read = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const fetch = vi.fn((_url: string, options: RequestInit) => {
      signal = options.signal as AbortSignal;
      return Promise.resolve({
        ok: true,
        status: 200,
        body: { getReader: () => ({ read }) },
      });
    });
    const audio = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("AudioContext", audio);
    const refresh = vi.fn().mockResolvedValue(undefined),
      stream = useOrderStream(refresh, { autoConnect: true });
    hooks.mount.forEach((f) => f());
    await flush();
    expect(fetch).toHaveBeenCalledOnce();
    expect(audio).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
    await stream.toggle(false);
    expect(signal?.aborted).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
    hooks.unmount.splice(0).forEach((f) => f());
    expect(signal?.aborted).toBe(true);
    finish({ done: true });
    await flush();
  });
  it("启用声音只对新单发声，到达等更新只刷新，切换提醒复用连接", async () => {
    const start = vi.fn(),
      oscillator = {
        connect: vi.fn(),
        frequency: { value: 0 },
        start,
        stop: vi.fn(),
      };
    const audio = vi.fn(function () {
      return {
        state: "running",
        currentTime: 0,
        destination: {},
        resume: vi.fn(),
        close: vi.fn(),
        createOscillator: () => oscillator,
        createGain: () => ({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }),
      };
    });
    let release!: (value: { done: boolean; value?: Uint8Array }) => void;
    const read = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        body: { getReader: () => ({ read }) },
      });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("AudioContext", audio);
    const refresh = vi.fn().mockResolvedValue(undefined),
      stream = useOrderStream(refresh, { autoConnect: true });
    hooks.mount.forEach((f) => f());
    await flush();
    await stream.toggle(true);
    expect(fetch).toHaveBeenCalledOnce();
    release({
      done: false,
      value: new TextEncoder().encode(
        'event: order\ndata: {"kind":"updated"}\n\nevent: order\ndata: {"kind":"new_order"}\n\n',
      ),
    });
    await flush();
    expect(start).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledTimes(3);
    await stream.toggle(false);
    release({
      done: false,
      value: new TextEncoder().encode(
        'event: order\ndata: {"kind":"new_order"}\n\n',
      ),
    });
    await flush();
    expect(start).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledTimes(4);
    hooks.unmount.splice(0).forEach((f) => f());
    release({ done: true });
    await flush();
  });
});
