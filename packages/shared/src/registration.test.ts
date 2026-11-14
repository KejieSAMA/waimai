import { describe, expect, it } from "vitest";
import { registrationContactErrors } from "./formValidation";
describe("两端注册联系资料校验", () => {
  it.each(["", " ", "123", "1391234567", "23912345678", "1391234567x"])(
    "手机号必填且格式有效 %s",
    (phone) => {
      expect(registrationContactErrors({ phone }).phone).toBeTruthy();
    },
  );
  it.each([undefined, "", "  ", "昵称", "字".repeat(30)])(
    "允许昵称选填 %s",
    (name) => {
      expect(
        registrationContactErrors({ phone: " 13912345678 ", name }),
      ).toEqual({});
    },
  );
  it("昵称过长定位昵称字段", () => {
    expect(
      registrationContactErrors({
        phone: "13912345678",
        name: "字".repeat(31),
      }),
    ).toEqual({ name: "昵称不能超过 30 个字" });
  });
});
