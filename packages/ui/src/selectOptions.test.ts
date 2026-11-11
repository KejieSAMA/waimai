import { describe, expect, it } from "vitest";
import {
  matchSelectOption,
  moveSelectIndex,
  selectOptions,
} from "./selectOptions";

describe("下拉选项与键盘导航", () => {
  it("兼容字符串与值标签对象", () => {
    expect(
      selectOptions(["全部", { value: "sales", label: "销量最高" }]),
    ).toEqual([
      { value: "全部", label: "全部" },
      { value: "sales", label: "销量最高" },
    ]);
  });
  it("占位选项保留空值语义", () => {
    expect(
      selectOptions([{ value: "1", label: "招牌推荐" }], "选择分类")[0],
    ).toEqual({ value: "", label: "选择分类" });
  });
  it("空列表无法产生有效活动项", () => {
    expect(moveSelectIndex(-1, 0, 1)).toBe(-1);
    expect(matchSelectOption([], "a", 0)).toBe(-1);
  });
  it("上下导航保持在合法选项边界", () => {
    expect(moveSelectIndex(-1, 3, 1)).toBe(0);
    expect(moveSelectIndex(0, 3, -1)).toBe(0);
    expect(moveSelectIndex(1, 3, 1)).toBe(2);
    expect(moveSelectIndex(2, 3, 1)).toBe(2);
  });
  it("中文前缀与英文大小写均可匹配", () => {
    const options = selectOptions([
      "综合排序",
      "销量最高",
      "起送价最低",
      "Salad",
    ]);
    expect(matchSelectOption(options, "销量", 0)).toBe(1);
    expect(matchSelectOption(options, "sal", 0)).toBe(3);
  });
  it("从当前选项继续搜索并在末尾循环", () => {
    const options = selectOptions(["牛肉面", "卤蛋", "牛杂面"]);
    expect(matchSelectOption(options, "牛", 1)).toBe(2);
    expect(matchSelectOption(options, "牛", 3)).toBe(0);
  });
  it("无匹配或空输入保持无结果", () => {
    const options = selectOptions(["全部"]);
    expect(matchSelectOption(options, "不存在", 0)).toBe(-1);
    expect(matchSelectOption(options, "", 0)).toBe(-1);
  });
});
