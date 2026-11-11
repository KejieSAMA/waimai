import { Router } from "express";
import { z } from "zod";
import { handler, reasonSchema } from "../../http";
import { writableStore } from "../auth/middleware";
import * as stores from "./service";
export function registerRouterStores(router: Router) {
  router.get(
    "/public/stores",
    handler(async (req) => stores.storeList(req.query)),
  );
  router.get(
    "/public/stores/:id",
    handler(async (req) => stores.storeDetail(req.params.id)),
  );
}
export function registerMerchantStores(merchant: Router) {
  merchant.get(
    "/application",
    handler(async (req) => stores.ownStore(req.actor!.id)),
  );
  merchant.put(
    "/application",
    handler(async (req) => stores.saveStore(req.actor!.id, req.body, true)),
  );
  merchant.get(
    "/store",
    handler(async (req) => stores.ownStore(req.actor!.id)),
  );
  merchant.put(
    "/store",
    writableStore,
    handler(async (req) => stores.saveStore(req.actor!.id, req.body)),
  );
  merchant.put(
    "/store/open",
    writableStore,
    handler(async (req) =>
      stores.setOpen(
        req.actor!.id,
        z.object({ open: z.boolean() }).parse(req.body).open,
      ),
    ),
  );
}
export function registerAdminStores(admin: Router) {
  admin.get(
    "/merchants",
    handler(async (req) => stores.storeList(req.query, true)),
  );
  admin.get(
    "/merchants/:id",
    handler(async (req) => stores.storeDetail(req.params.id, true)),
  );
  for (const action of ["approve", "reject", "freeze", "unfreeze"])
    admin.post(
      `/merchants/:id/${action}`,
      handler(async (req) =>
        stores.moderateStore(
          req.params.id,
          action,
          req.actor!,
          ["reject", "freeze"].includes(action)
            ? reasonSchema.parse(req.body).reason
            : undefined,
        ),
      ),
    );
}
