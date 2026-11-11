import { describe, expect, it } from "vitest";
import { createOverlayStack } from "./overlayStack";
describe("弹窗事件栈", () => {
  it("仅最上层响应，关闭后恢复下层", () => {
    const stack = createOverlayStack(),
      drawer = Symbol(),
      modal = Symbol();
    stack.push(drawer);
    stack.push(modal);
    expect(stack.isTop(drawer)).toBe(false);
    expect(stack.isTop(modal)).toBe(true);
    stack.remove(modal);
    expect(stack.isTop(drawer)).toBe(true);
    stack.remove(drawer);
    expect(stack.size).toBe(0);
  });
  it("卸载非顶层不会破坏上层，重复注册或清理保持幂等", () => {
    const stack = createOverlayStack(),
      a = Symbol(),
      b = Symbol();
    stack.push(a);
    stack.push(a);
    stack.push(b);
    expect(stack.size).toBe(2);
    stack.remove(a);
    stack.remove(a);
    expect(stack.isTop(b)).toBe(true);
    expect(stack.size).toBe(1);
  });
});
