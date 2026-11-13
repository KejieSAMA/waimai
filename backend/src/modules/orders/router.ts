import { Router } from "express";
import { z } from "zod";
import { handler, reasonSchema } from "../../http";
import { writableStore } from "../auth/middleware";
import * as orders from "./service";
import { sessionEvents } from "../auth/events";
import { validateSession } from "../auth/service";
import { orderEvents } from "./events";
import { visitorHash } from "../traffic/identity";
import { TRAFFIC_RULES } from "../../rules";
export function registerUserOrders(user: Router) {
  user.post(
    "/orders/preview",
    handler(async (req) => orders.previewOrder(req.actor!.id, req.body)),
  );
  user.post(
    "/orders",
    handler(async (req) => orders.createOrder(req.actor!.id, req.body)),
  );
  user.get(
    "/orders",
    handler(async (req) => orders.listOrders(req.actor!, req.query)),
  );
  user.get(
    "/orders/:id",
    handler(async (req) => orders.orderDetail(req.params.id, req.actor!)),
  );
  for (const action of ["pay", "cancel", "refund", "complete", "dispute"])
    user.post(
      `/orders/:id/${action}`,
      handler(async (req) =>
        orders.actOnOrder(
          req.params.id,
          req.actor!,
          action,
          undefined,
          action === "refund" ? reasonSchema.parse(req.body).reason : undefined,
          action === "pay"
            ? visitorHash(req.cookies[TRAFFIC_RULES.cookieName])
            : undefined,
        ),
      ),
    );
  user.post(
    "/orders/:id/review",
    handler(async (req) =>
      orders.reviewOrder(req.params.id, req.actor!.id, req.body),
    ),
  );
}
export function registerMerchantOrders(merchant: Router) {
  merchant.get("/orders/stream", (request, res) => {
    const storeId = (request as import("../../http").AuthRequest).storeId!;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("event: connected\ndata: {}\n\n");
    const actor = request as import("../../http").AuthRequest;
    const listener = (data: unknown) => {
      void validateSession(actor.sessionId!, actor.sessionVersion)
        .then(() => {
          if (!res.writableEnded)
            res.write(`event: order\ndata: ${JSON.stringify(data)}\n\n`);
        })
        .catch(() => res.end());
    };
    orderEvents.on(storeId, listener);
    const recheck = () => {
      void validateSession(actor.sessionId!, actor.sessionVersion)
        .then(() => {
          if (!res.writableEnded) res.write(": heartbeat\n\n");
        })
        .catch(() => res.end());
    };
    const heartbeat = setInterval(recheck, 5000);
    sessionEvents.on(actor.actor!.id, recheck);
    const expiry = setTimeout(() => res.end(), 110 * 60000);
    res.on("close", () => {
      orderEvents.off(storeId, listener);
      clearInterval(heartbeat);
      sessionEvents.off(actor.actor!.id, recheck);
      clearTimeout(expiry);
    });
  });
  merchant.get(
    "/orders",
    handler(async (req) =>
      orders.listOrders(req.actor!, req.query, req.storeId),
    ),
  );
  merchant.get(
    "/orders/:id",
    handler(async (req) =>
      orders.orderDetail(req.params.id, req.actor!, req.storeId),
    ),
  );
  for (const action of [
    "accept",
    "reject",
    "ready",
    "refund-approve",
    "refund-reject",
  ])
    merchant.post(
      `/orders/:id/${action}`,
      writableStore,
      handler(async (req) =>
        orders.actOnOrder(
          req.params.id,
          req.actor!,
          action,
          req.storeId,
          ["reject", "refund-reject"].includes(action)
            ? reasonSchema.parse(req.body).reason
            : undefined,
        ),
      ),
    );
}
export function registerAdminOrders(admin: Router) {
  admin.get(
    "/orders",
    handler(async (req) => orders.listOrders(req.actor!, req.query)),
  );
  admin.get(
    "/disputes",
    handler(async (req) =>
      orders.listOrders(req.actor!, req.query, undefined, true),
    ),
  );
  admin.post(
    "/disputes/:id/resolve",
    handler(async (req) => {
      const p = reasonSchema.extend({ approve: z.boolean() }).parse(req.body);
      return orders.resolveDispute(
        req.params.id,
        req.actor!,
        p.approve,
        p.reason,
      );
    }),
  );
}
