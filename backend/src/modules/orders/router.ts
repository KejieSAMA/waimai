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
import { MAX_ARRIVAL_ORDERS, MAX_MERCHANT_ORDER_BATCH } from "@waimai/shared";
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
  const arrivalActor = (
    req: import("../../http").AuthRequest,
  ): orders.MerchantArrivalActor => ({
    id: req.actor!.id,
    role: "MERCHANT",
    storeId: req.storeId!,
    sessionId: req.sessionId!,
    version: req.sessionVersion!,
  });
  merchant.post(
    "/orders/batch-action",
    writableStore,
    handler(async (req) => {
      const body = z
        .object({
          action: z.enum([
            "accept",
            "reject",
            "ready",
            "arrive",
            "refund-approve",
            "refund-reject",
          ]),
          ids: z
            .array(z.string().min(1).max(128))
            .min(1)
            .max(MAX_MERCHANT_ORDER_BATCH)
            .refine(
              (ids) => new Set(ids).size === ids.length,
              "订单不能重复选择",
            ),
          reason: z.string().trim().max(500).optional(),
        })
        .strict()
        .superRefine((value, ctx) => {
          if (
            ["reject", "refund-reject"].includes(value.action) &&
            !value.reason
          )
            ctx.addIssue({
              code: "custom",
              path: ["reason"],
              message: "请填写原因",
            });
        })
        .parse(req.body);
      return orders.batchMerchantOrderAction(
        body.ids,
        arrivalActor(req),
        body.action,
        body.reason,
      );
    }),
  );
  merchant.post(
    "/orders/batch-arrive",
    writableStore,
    handler(async (req) => {
      const body = z
        .object({
          ids: z
            .array(z.string().min(1).max(128))
            .min(1)
            .max(MAX_ARRIVAL_ORDERS)
            .refine(
              (ids) => new Set(ids).size === ids.length,
              "订单不能重复选择",
            ),
        })
        .strict()
        .parse(req.body);
      return orders.batchArriveOrders(body.ids, arrivalActor(req));
    }),
  );
  merchant.post(
    "/orders/:id/arrive",
    writableStore,
    handler(async (req) => {
      z.object({}).strict().parse(req.body);
      return (await orders.arriveOrder(req.params.id, arrivalActor(req))).order;
    }),
  );
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
        orders
          .merchantOrderAction(
            req.params.id,
            arrivalActor(req),
            action as
              | "accept"
              | "reject"
              | "ready"
              | "refund-approve"
              | "refund-reject",
            ["reject", "refund-reject"].includes(action)
              ? reasonSchema.parse(req.body).reason
              : undefined,
          )
          .then((result) => result.order),
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
