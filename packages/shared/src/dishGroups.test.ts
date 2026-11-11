import { describe, expect, it } from "vitest";
import { activeScrollGroup, groupScrollTop } from "./dishGroups";
const groups = [
  { id: "a", top: 0 },
  { id: "b", top: 100 },
  { id: "c", top: 190 },
];
describe("分类滚动边界", () => {
  it("顶部对应全部菜品，中段与底部选择相应分组", () => {
    expect(activeScrollGroup(groups, 0, 150)).toBe("");
    expect(activeScrollGroup(groups, 101, 150)).toBe("b");
    expect(activeScrollGroup(groups, 150, 150)).toBe("c");
    expect(activeScrollGroup([], 100, 150)).toBe("");
  });
  it("点击分组目标不会越界，短内容、搜索后无分组均安全", () => {
    expect(groupScrollTop(groups, "c", 150)).toBe(150);
    expect(groupScrollTop(groups, "b", 0)).toBe(0);
    expect(groupScrollTop(groups, "", 150)).toBe(0);
    expect(groupScrollTop([], "b", 150)).toBe(0);
  });
});
