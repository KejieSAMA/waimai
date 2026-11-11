import { Router } from "express";
import { z } from "zod";
import { handler } from "../../http";
import { writableStore } from "../auth/middleware";
import * as categories from "./service";
export function registerRouterCategories(router: Router) {
  router.get(
    "/public/categories",
    handler(async () => categories.platformCategories()),
  );
}
export function registerMerchantCategories(merchant: Router) {
  merchant.get(
    "/dish-categories",
    handler(async (req) => categories.dishCategories(req.storeId!)),
  );
  merchant.post(
    "/dish-categories",
    writableStore,
    handler(async (req) =>
      categories.saveCategory(undefined, req.body, req.storeId),
    ),
  );
  merchant.put(
    "/dish-categories/:id",
    writableStore,
    handler(async (req) =>
      categories.saveCategory(req.params.id, req.body, req.storeId),
    ),
  );
  merchant.delete(
    "/dish-categories/:id",
    writableStore,
    handler(async (req) =>
      categories.deleteCategory(req.params.id, req.storeId),
    ),
  );
  merchant.put(
    "/dish-categories",
    writableStore,
    handler(async (req) =>
      categories.saveCategory(
        z.string().parse(req.body.id),
        req.body,
        req.storeId,
      ),
    ),
  );
  merchant.delete(
    "/dish-categories",
    writableStore,
    handler(async (req) =>
      categories.deleteCategory(z.string().parse(req.body.id), req.storeId),
    ),
  );
}
export function registerAdminCategories(admin: Router) {
  admin.get(
    "/categories",
    handler(async () => categories.platformCategories()),
  );
  admin.post(
    "/categories",
    handler(async (req) => categories.saveCategory(undefined, req.body)),
  );
  admin.put(
    "/categories/:id",
    handler(async (req) => categories.saveCategory(req.params.id, req.body)),
  );
  admin.delete(
    "/categories/:id",
    handler(async (req) => categories.deleteCategory(req.params.id)),
  );
  admin.put(
    "/categories",
    handler(async (req) =>
      categories.saveCategory(z.string().parse(req.body.id), req.body),
    ),
  );
  admin.delete(
    "/categories",
    handler(async (req) =>
      categories.deleteCategory(z.string().parse(req.body.id)),
    ),
  );
}
