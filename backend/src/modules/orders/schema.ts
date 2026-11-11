import { z } from "zod";
export const orderSchema = z.object({
  storeId: z.string().min(1),
  type: z.enum(["DELIVERY", "PICKUP"]),
  addressId: z.string().optional(),
  note: z.string().max(300).default(""),
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
});
