import type { FieldErrors } from "./formFeedback";
import type { AddressDraft } from "./index";
export function registrationContactErrors(form: {
  phone: string;
  name?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^1[3-9]\d{9}$/.test(form.phone.trim()))
    errors.phone = "请填写有效的 11 位手机号";
  if ((form.name?.trim().length ?? 0) > 30)
    errors.name = "昵称不能超过 30 个字";
  return errors;
}
export function passwordError(value: string) {
  const bytes = [...value].reduce(
    (n, c) =>
      n +
      ((c.codePointAt(0) ?? 0) <= 127
        ? 1
        : (c.codePointAt(0) ?? 0) <= 2047
          ? 2
          : (c.codePointAt(0) ?? 0) <= 65535
            ? 3
            : 4),
    0,
  );
  return [...value].length < 8 || bytes > 72
    ? "密码至少 8 个字符，不超过 72 字节"
    : "";
}
export function addressErrors(form: AddressDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.contact.trim() || form.contact.trim().length > 30)
    errors.contact = "请填写 1–30 个字的收货人";
  if (!/^1[3-9]\d{9}$/.test(form.phone.trim()))
    errors.phone = "请填写有效的 11 位手机号";
  if (form.detail.trim().length < 2 || form.detail.trim().length > 200)
    errors.detail = "详细地址需为 2–200 个字";
  return errors;
}
