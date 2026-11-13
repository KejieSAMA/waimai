import type { Router } from "express";
import { handler, type AuthRequest } from "../../http";
import { listCart, saveCart, mergeCart } from "./service";
const actor = (req: AuthRequest) => ({
  id: req.actor!.id,
  sessionId: req.sessionId!,
  version: req.sessionVersion!,
});
export function registerUserCart(router: Router) {
  router.get(
    "/cart",
    handler(async (req) => listCart(req.actor!.id)),
  );
  router.put(
    "/cart/:storeId",
    handler(async (req) => saveCart(actor(req), req.params.storeId, req.body)),
  );
  router.post(
    "/cart/merge",
    handler(async (req) => mergeCart(actor(req), req.body)),
  );
}
