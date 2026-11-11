import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useValue } from "./useValue";
import { icons } from "./icons";

describe("Vue 组件受控与内部状态", () => {
  it("以默认值初始化内部状态并发出更新", () => {
    const updates: number[] = [];
    const value = useValue<number>(
      () => undefined,
      2,
      (next) => updates.push(next),
    );
    expect(value.value).toBe(2);
    value.value = 3;
    expect(value.value).toBe(3);
    expect(updates).toEqual([3]);
  });
  it("受控值等待父组件更新", () => {
    const parent = ref(false);
    let emitted = false;
    const value = useValue(
      () => parent.value,
      true,
      (next) => {
        emitted = next;
      },
    );
    value.value = true;
    expect(emitted).toBe(true);
    expect(value.value).toBe(false);
    parent.value = true;
    expect(value.value).toBe(true);
  });
  it("包含设计系统与主题切换图标路径", () => {
    expect(Object.keys(icons)).toHaveLength(31);
    expect(icons.plus).toEqual(["M12 5v14", "M5 12h14"]);
  });
});
