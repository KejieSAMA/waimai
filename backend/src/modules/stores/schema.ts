import { z } from "zod";
const image = z
  .string()
  .max(300)
  .refine(
    (v) => v === "" || /^\/uploads\/[a-zA-Z0-9_.-]+$/.test(v),
    "请选择上传图片",
  );
export const storeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  logo: image.default(""),
  categoryId: z.string().min(1),
  city: z.string().min(1).max(30),
  address: z.string().min(2).max(200),
  contactPhone: z.string().regex(/^1[3-9]\d{9}$/),
  notice: z.string().max(300).default(""),
  openHours: z.string().min(1).max(100),
  minOrderCents: z.number().int().min(0).max(1000000),
  deliveryFeeCents: z.number().int().min(0).max(100000),
  licenseImage: image.default(""),
  foodPermitImage: image.default(""),
  licenseExpireAt: z.coerce.date().optional(),
  permitExpireAt: z.coerce.date().optional(),
});
export const applicationSchema = storeSchema.refine(
  (v) => !!v.licenseImage && !!v.foodPermitImage,
  "请上传营业执照及食品经营许可证",
);
