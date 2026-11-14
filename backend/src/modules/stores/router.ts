import { Router } from "express";
import { z } from "zod";
import { handler, reasonSchema, assert } from "../../http";
import { writableStore } from "../auth/middleware";
import * as stores from "./service";
import { publicReviews } from "../orders/service";
import { promotions, savePromotions } from "./promotions";
import { provisionMerchant } from "./provision";
export function registerRouterStores(router: Router) {
  router.get(
    "/public/stores/:id/reviews",
    handler(async (req) => {
      await stores.storeDetail(req.params.id);
      return publicReviews(req.params.id, req.query);
    }),
  );
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
  merchant.put(
    "/store/visibility",
    writableStore,
    handler(async (req) =>
      stores.setVisibility(
        req.actor!.id,
        z.object({ visible: z.boolean() }).strict().parse(req.body).visible,
      ),
    ),
  );

  merchant.get(
    "/promotions",
    handler(async (req) => {
      const store = await stores.ownStore(req.actor!.id);
      assert(store, 404, "请先申请入驻");
      return promotions(store.id);
    }),
  );
  merchant.put(
    "/promotions",
    writableStore,
    handler(async (req) => {
      const store = await stores.ownStore(req.actor!.id);
      assert(store, 404, "请先申请入驻");
      return savePromotions(
        {
          id: req.actor!.id,
          sessionId: req.sessionId!,
          version: req.sessionVersion!,
        },
        store.id,
        req.body,
      );
    }),
  );
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
  admin.post(
    "/merchants",
    handler(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      return provisionMerchant(
        {
          id: req.actor!.id,
          sessionId: req.sessionId!,
          version: req.sessionVersion!,
        },
        req.body,
      );
    }),
  );
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
