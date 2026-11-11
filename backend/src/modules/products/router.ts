import { Router } from "express";
import { z } from "zod";
import { handler, reasonSchema, assert } from "../../http";
import { writableStore } from "../auth/middleware";
import * as products from "./service";
export function registerMerchantProducts(merchant: Router) {
  merchant.get(
    "/products",
    handler(async (req) => products.listProducts(req.query, req.storeId)),
  );
  merchant.get(
    "/products/:id",
    handler(async (req) => {
      const p = await products.findProduct(req.params.id, req.storeId!);
      assert(p, 404, "商品不存在");
      return products.displayProduct(p);
    }),
  );
  merchant.post(
    "/products",
    writableStore,
    handler(async (req) =>
      products.saveProduct(req.storeId!, undefined, req.body),
    ),
  );
  merchant.put(
    "/products/:id",
    writableStore,
    handler(async (req) =>
      products.saveProduct(req.storeId!, req.params.id, req.body),
    ),
  );
  merchant.put(
    "/products/:id/listing",
    writableStore,
    handler(async (req) =>
      products.listing(
        req.storeId!,
        req.params.id,
        z.object({ listed: z.boolean() }).parse(req.body).listed,
      ),
    ),
  );
  merchant.post(
    "/products/batch",
    writableStore,
    handler(async (req) => {
      const p = z
        .object({
          ids: z.array(z.string()).min(1).max(100),
          action: z.enum(["on", "off", "stock"]),
          stock: z.number().int().min(0).max(1000000).optional(),
        })
        .refine((p) => p.action !== "stock" || p.stock !== undefined)
        .parse(req.body);
      return products.batchProducts(req.storeId!, p.ids, p.action, p.stock);
    }),
  );
}
export function registerAdminProducts(admin: Router) {
  admin.get(
    "/products",
    handler(async (req) => products.listProducts(req.query)),
  );
  for (const action of ["approve", "reject", "force-off"])
    admin.post(
      `/products/:id/${action}`,
      handler(async (req) =>
        products.moderateProduct(
          req.params.id,
          action,
          req.actor!,
          action !== "approve"
            ? reasonSchema.parse(req.body).reason
            : undefined,
        ),
      ),
    );
}
