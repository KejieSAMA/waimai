import { z } from "zod";
export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, "请输入正确手机号");
export const loginSchema = z.object({
  phone: z.string().min(1).max(40),
  password: z.string().min(1).max(100),
});
export const userLoginSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
});
export const registerSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8).max(100),
  name: z.string().trim().min(1).max(30),
});
