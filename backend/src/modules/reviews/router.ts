import type { Router } from "express";
import { handler } from "../../http";
import { writableStore } from "../auth/middleware";
import { merchantReviews, replyReview } from "./service";
export function registerMerchantReviews(router: Router) {
  router.get(
    "/reviews",
    handler((req) => merchantReviews(req.storeId!, req.query)),
  );
  router.put(
    "/reviews/:id/reply",
    writableStore,
    handler((req) =>
      replyReview(
        {
          id: req.actor!.id,
          sessionId: req.sessionId!,
          version: req.sessionVersion!,
        },
        req.storeId!,
        req.params.id,
        req.body,
      ),
    ),
  );
}
