import { describe, expect, it } from "vitest";
import { passwordSchema, registerSchema } from "./schema";
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
describe("注册手机号与昵称", () => {
  it.each([
    undefined,
    null,
    "",
    " ",
    "123",
    "1391234567",
    "23912345678",
    "1391234567x",
  ])("拒绝缺失或非法手机号 %s", (phone) => {
    expect(
      registerSchema.safeParse({
        username: "register_test",
        password: "password123",
        phone,
      }).success,
    ).toBe(false);
  });
  it.each([undefined, "", "   ", "昵称"])(
    "昵称选填并修剪，手机号必须为有效格式",
    (name) => {
      const result = registerSchema.parse({
        username: "register_test",
        password: "password123",
        phone: " 13912345678 ",
        name,
      });
      expect(result.phone).toBe("13912345678");
      expect(result.name).toBe(name?.trim());
    },
  );
  it("拒绝超长昵称和额外权限字段", () => {
    for (const extra of [{ name: "字".repeat(31) }, { roles: ["ADMIN"] }])
      expect(
        registerSchema.safeParse({
          username: "register_test",
          password: "password123",
          phone: "13912345678",
          ...extra,
        }).success,
      ).toBe(false);
  });
});
