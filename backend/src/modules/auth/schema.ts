import { z } from "zod";
export const roles = ["USER", "MERCHANT", "ADMIN"] as const;
export const roleSchema = z.enum(roles);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_-]{3,32}$/, "账号须为 3–32 位英文、数字、下划线或连字符");
export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 个字符")
  .refine((v) => [...v].length >= 8, "密码至少 8 个字符")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "密码不能超过 72 字节");
export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, "请输入正确手机号");
export const contactSchema = z
  .union([phoneSchema, z.literal("")])
  .optional()
  .nullable();
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(30),
    phone: contactSchema,
  })
  .strict();
export const loginSchema = z
  .object({
    username: usernameSchema,
    password: z
      .string()
      .min(1)
      .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "账号或密码错误"),
    role: roleSchema.optional(),
  })
  .strict();
export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    name: z.string().trim().min(1).max(30),
    phone: contactSchema,
  })
  .strict();
