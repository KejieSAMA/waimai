import { z } from "zod";
export const cartItemsSchema = z
  .array(
    z
      .object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(999),
      })
      .strict(),
  )
  .max(100)
  .refine(
    (items) =>
      new Set(items.map((item) => item.productId)).size === items.length,
    "商品不能重复",
  );
export const cartWriteSchema = z
  .object({
    revision: z.number().int().min(0),
    type: z.enum(["DELIVERY", "PICKUP"]),
    addressId: z.string().default(""),
    note: z.string().max(300).default(""),
    items: cartItemsSchema,
  })
  .strict();
export const cartMergeSchema = z
  .object({
    guestId: z.string().regex(/^[a-zA-Z0-9_-]{16,100}$/),
    carts: z
      .array(
        cartWriteSchema
          .omit({ revision: true, addressId: true })
          .extend({ storeId: z.string().min(1) }),
      )
      .max(100)
      .refine(
        (carts) =>
          new Set(carts.map((cart) => cart.storeId)).size === carts.length,
        "店铺不能重复",
      ),
  })
  .strict();
