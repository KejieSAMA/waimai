import { z } from "zod";
export const productSchema = z.object({
  name: z.string().trim().min(1).max(80),
  dishCategoryId: z.string().min(1),
  description: z.string().max(1000).default(""),
  images: z
    .string()
    .default("[]")
    .refine((v) => {
      try {
        const a: unknown = JSON.parse(v);
        return (
          Array.isArray(a) &&
          a.length <= 5 &&
          a.every(
            (x) =>
              typeof x === "string" && /^\/uploads\/[a-zA-Z0-9_.-]+$/.test(x),
          )
        );
      } catch {
        return false;
      }
    }, "图片格式错误"),
  priceCents: z.number().int().positive().max(10000000),
  originalPriceCents: z
    .number()
    .int()
    .positive()
    .max(10000000)
    .nullable()
    .optional(),
  stock: z.number().int().min(0).max(1000000),
  lowStock: z.number().int().min(0).default(5),
  limitPerOrder: z.number().int().min(1).max(999).nullable().optional(),
  listed: z.boolean().default(true),
});
