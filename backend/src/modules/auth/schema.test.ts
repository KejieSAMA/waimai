import { describe, expect, it } from "vitest";
import { passwordSchema } from "./schema";
describe("密码长度与编码边界", () => {
  it.each([
    ["a".repeat(7), false],
    ["a".repeat(8), true],
    ["a".repeat(72), true],
    ["a".repeat(73), false],
    ["中".repeat(8), true],
    [String.fromCodePoint(0x1f600).repeat(7), false],
    [String.fromCodePoint(0x1f600).repeat(8), true],
  ])("长度和 UTF-8 约束正确：%s", (password, allowed) => {
    expect(passwordSchema.safeParse(password).success).toBe(allowed);
  });
});
