import { randomUUID, createHmac } from "node:crypto";
import { config } from "../../config";
import type { Prisma, OrderItem } from "@prisma/client";
import { z } from "zod";
import { db } from "../../db";
import {
  assert,
  HttpError,
  pagination,
  pageResult,
  shanghaiDay,
} from "../../http";
import { orderTransition } from "../../domain/orderMachine";
import {
  requireOpenStore,
  safeStore,
  updateStoreRating,
} from "../stores/service";
import {
  findProduct,
  reserveProduct,
  restoreProduct,
} from "../products/service";
import { ownedAddress } from "../users/service";
import { recordAudit } from "../audit/service";
import { orderSchema, createOrderSchema } from "./schema";
import {
  checkOrderCart,
  consumeOrderCart,
  cartTransaction,
} from "../cart/service";
import { notifyOrder } from "./events";
import { paidVisit } from "../traffic/service";
import { PAYMENT_TTL_MS } from "../../rules";
export { PAYMENT_TTL_MS } from "../../rules";
const include = {
  items: true,
  store: true,
  review: { select: { id: true } },
} satisfies Prisma.OrderInclude;
function fingerprint(
  userId: string,
  body: unknown,
  quote: Awaited<ReturnType<typeof quoteOrder>>,
) {
  const input = orderSchema.parse(body);
  return createHmac("sha256", config.jwtSecret)
    .update(
      JSON.stringify([
        "checkout-quote-v1",
        userId,
        input.storeId,
        input.type,
        input.addressId ?? "",
        [...quote.items].sort((a, b) => a.productId.localeCompare(b.productId)),
        quote.itemsCents,
        quote.deliveryFeeCents,
        quote.discountCents,
        quote.payCents,
        quote.minOrderCents,
        quote.checkoutAllowed,
      ]),
    )
    .digest("hex");
}
export async function previewOrder(userId: string, body: unknown) {
  const quote = await quoteOrder(body);
  return { ...quote, quoteFingerprint: fingerprint(userId, body, quote) };
}
export async function quoteOrder(
  body: unknown,
  tx: Prisma.TransactionClient = db,
) {
  const input = orderSchema.parse(body);
  const store = await requireOpenStore(input.storeId, tx);
  const quantities = new Map<string, number>();
  for (const it of input.items)
    quantities.set(it.productId, (quantities.get(it.productId) ?? 0) + it.qty);
  const items = [];
  let itemsCents = 0;
  for (const [productId, qty] of quantities) {
    const p = await findProduct(productId, store.id, tx);
    assert(p?.status === "ON" && !p.forcedOff, 409, "商品已下架");
    assert(p.stock >= qty, 409, `${p.name} 库存不足`);
    assert(
      !p.limitPerOrder || qty <= p.limitPerOrder,
      409,
      `${p.name} 超出限购数量`,
    );
    itemsCents += p.priceCents * qty;
    items.push({
      productId,
      qty,
      name: p.name,
      priceCents: p.priceCents,
      lineTotalCents: p.priceCents * qty,
    });
  }
  assert(
    Number.isSafeInteger(itemsCents) && itemsCents <= 2147383647,
    400,
    "订单金额超出限制",
  );
  const deliveryFeeCents = input.type === "PICKUP" ? 0 : store.deliveryFeeCents;
  const discountCents = Math.min(
    itemsCents,
    Math.max(
      0,
      ...store.promotions
        .filter((p) => itemsCents >= p.thresholdCents)
        .map((p) => p.discountCents),
    ),
  );
  return {
    minOrderCents: store.minOrderCents,
    shortfallCents:
      input.type === "PICKUP"
        ? 0
        : Math.max(0, store.minOrderCents - itemsCents),
    checkoutAllowed:
      input.type === "PICKUP" || itemsCents >= store.minOrderCents,
    items,
    itemsCents,
    deliveryFeeCents,
    discountCents,
    payCents: itemsCents + deliveryFeeCents - discountCents,
    count: items.reduce((n, it) => n + it.qty, 0),
  };
}
export async function createOrder(userId: string, body: unknown) {
  const input = createOrderSchema.parse(body);
  return cartTransaction(async (tx) => {
    if (input.requestId) {
      const existing = await tx.order.findUnique({
        where: { userId_requestId: { userId, requestId: input.requestId } },
        include,
      });
      if (existing) {
        assert(
          existing.storeId === input.storeId &&
            existing.type === input.type &&
            existing.note === input.note &&
            JSON.stringify(
              existing.items.map((i) => [i.productId, i.qty]).sort(),
            ) ===
              JSON.stringify(
                input.items.map((i) => [i.productId, i.qty]).sort(),
              ),
          409,
          "提交标识已使用，请重新核对订单",
        );
        return serializeOrder(existing, "USER");
      }
    }
    const address =
      input.type === "DELIVERY"
        ? await ownedAddress(input.addressId ?? "", userId, tx)
        : null;
    assert(input.type !== "DELIVERY" || address, 400, "请选择收货地址");
    await checkOrderCart(userId, input, tx);
    const quote = await quoteOrder(input, tx);
    if (!input.quoteFingerprint)
      throw new HttpError(409, "请刷新页面并重新确认金额", {
        reason: "QUOTE_REQUIRED",
      });
    if (input.quoteFingerprint !== fingerprint(userId, input, quote))
      throw new HttpError(409, "金额已更新，请核对后再次提交", {
        reason: "QUOTE_CHANGED",
      });
    assert(quote.checkoutAllowed, 409, "未达到起送金额");
    for (const it of quote.items) {
      await reserveProduct(tx, input.storeId, it.productId, it.qty);
    }
    const { items, itemsCents, deliveryFeeCents, discountCents, payCents } =
      quote;
    const serialOfDay =
      (await tx.order.count({
        where: { storeId: input.storeId, createdAt: { gte: shanghaiDay() } },
      })) + 1;
    const order = await tx.order.create({
      data: {
        orderNo: Date.now() + randomUUID().replaceAll("-", "").slice(0, 12),
        serialOfDay,
        userId,
        requestId: input.requestId,
        storeId: input.storeId,
        type: input.type,
        note: input.note,
        addressSnapshot: JSON.stringify(
          address
            ? {
                contact: address.contact,
                phone: address.phone,
                detail: address.detail,
              }
            : {},
        ),
        itemsCents,
        deliveryFeeCents,
        discountCents,
        payCents,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            nameSnapshot: it.name,
            priceCentsSnapshot: it.priceCents,
          })),
        },
      },
      include,
    });
    await consumeOrderCart(userId, input.storeId, input.cartRevision, tx);
    return serializeOrder(order, "USER");
  });
}
function scopedWhere(
  actor: { id: string; role: string },
  storeId?: string,
): Prisma.OrderWhereInput {
  return actor.role === "USER"
    ? { userId: actor.id }
    : actor.role === "MERCHANT"
      ? { storeId: storeId ?? "__none__" }
      : {};
}
function serializeOrder<
  T extends {
    store: Parameters<typeof safeStore>[0];
    addressSnapshot: string;
    items: OrderItem[];
    createdAt: Date;
    paidVisitId?: string | null;
  },
>(order: T, role: string) {
  const { paidVisitId, ...publicOrder } = order;
  void paidVisitId;
  const safe = {
    ...publicOrder,
    paymentExpiresAt: new Date(
      order.createdAt.getTime() + PAYMENT_TTL_MS,
    ).toISOString(),
    store: safeStore(order.store),
    items: order.items.map((item) => ({
      ...item,
      lineTotalCents: item.priceCentsSnapshot * item.qty,
    })),
  };
  if (role === "MERCHANT") {
    const address = JSON.parse(order.addressSnapshot);
    return {
      ...safe,
      addressSnapshot: JSON.stringify({
        ...address,
        phone: address.phone ? "尾号 " + address.phone.slice(-4) : "",
      }),
    };
  }
  return safe;
}
export async function listOrders(
  actor: { id: string; role: string },
  query: Record<string, unknown>,
  storeId?: string,
  disputes = false,
) {
  const p = pagination(query);
  const stage = z
    .enum(["PENDING", "PREPARING", "DELIVERING", "REFUNDING"])
    .optional()
    .parse(query.stage);
  const tab = z
    .enum(["all", "ongoing", "unreviewed", "refund"])
    .default("all")
    .parse(query.tab);
  const userFilter: Prisma.OrderWhereInput =
    actor.role !== "USER"
      ? {}
      : tab === "ongoing"
        ? {
            status: {
              in: [
                "PENDING_PAY",
                "PENDING",
                "PREPARING",
                "DELIVERING",
                "PICKUP",
              ],
            },
          }
        : tab === "unreviewed"
          ? { status: "DONE", review: { is: null } }
          : tab === "refund"
            ? { status: "REFUNDING" }
            : {};
  const where: Prisma.OrderWhereInput = {
    ...scopedWhere(actor, storeId),
    ...(actor.role === "USER" && typeof query.requestId === "string"
      ? { requestId: query.requestId }
      : {}),
    ...(disputes ? { disputed: true, status: "REFUNDING" } : {}),
    ...(p.status ? { status: p.status } : {}),
    ...(p.keyword ? { orderNo: { contains: p.keyword } } : {}),
    AND: [
      userFilter,
      actor.role === "MERCHANT" && stage
        ? {
            status: {
              in: stage === "DELIVERING" ? ["DELIVERING", "PICKUP"] : [stage],
            },
          }
        : {},
    ],
  };
  const [list, total] = await Promise.all([
    db.order.findMany({
      where,
      include,
      skip: p.skip,
      take: p.take,
      orderBy: { createdAt: "desc" },
    }),
    db.order.count({ where }),
  ]);
  const result = pageResult(
    list.map((o) => serializeOrder(o, actor.role)),
    total,
    p,
  );
  if (actor.role !== "MERCHANT") return result;
  const grouped = await db.order.groupBy({
    by: ["status"],
    where: {
      ...scopedWhere(actor, storeId),
      ...(p.keyword ? { orderNo: { contains: p.keyword } } : {}),
    },
    _count: { id: true },
  });
  const counts: Record<string, number> = { all: 0 };
  for (const group of grouped) {
    counts[group.status] = group._count.id;
    counts.all += group._count.id;
  }
  return { ...result, counts };
}
export async function orderDetail(
  id: string,
  actor: { id: string; role: string },
  storeId?: string,
) {
  const o = await db.order.findFirst({
    where: { id, ...scopedWhere(actor, storeId) },
    include,
  });
  assert(o, 404, "订单不存在");
  return serializeOrder(o, actor.role);
}
async function restoreStock(
  tx: Prisma.TransactionClient,
  order: { items: { productId: string; qty: number }[] },
) {
  for (const it of order.items) await restoreProduct(tx, it.productId, it.qty);
}
export async function actOnOrder(
  id: string,
  actor: { id: string; role: string },
  action: string,
  storeId?: string,
  reason?: string,
  visitor?: string,
) {
  let changedState = false,
    expired = false;
  const result = await cartTransaction(async (tx) => {
    changedState = false;
    expired = false;
    const old = await tx.order.findFirst({
      where: { id, ...scopedWhere(actor, storeId) },
      include,
    });
    assert(old, 404, "订单不存在");
    const now = new Date(Date.now());
    if (
      action === "pay" &&
      old.status === "PENDING_PAY" &&
      now.getTime() >= old.createdAt.getTime() + PAYMENT_TTL_MS
    ) {
      changedState = await cancelExpired(tx, old.id, now);
      expired = true;
      return tx.order.findUniqueOrThrow({ where: { id }, include });
    }
    const targets: Record<string, string> = {
      pay: "PENDING",
      accept: "PREPARING",
      ready: old.type === "PICKUP" ? "PICKUP" : "DELIVERING",
      complete: "DONE",
      cancel: "CANCELLED",
      reject: "CANCELLED",
      "refund-approve": "CANCELLED",
      refund: "REFUNDING",
    };
    if (old.status === targets[action]) return old;
    if (action === "refund-reject") {
      assert(old.status === "REFUNDING", 409, "订单当前无法处理退款");
      assert(!old.disputed, 409, "纠纷已由平台处理");
      if (old.refundRejected) return old;
      changedState = true;
      return tx.order.update({
        where: { id },
        data: { refundRejected: true },
        include,
      });
    }
    if (action === "dispute") {
      assert(
        old.status === "REFUNDING" && old.refundRejected,
        409,
        "商家拒绝退款后可申诉",
      );
      if (old.disputed) return old;
      changedState = true;
      return tx.order.update({
        where: { id },
        data: { disputed: true },
        include,
      });
    }
    assert(
      !(old.disputed && actor.role === "MERCHANT"),
      409,
      "纠纷已由平台处理",
    );
    const status = orderTransition(old.status, action, old.type);
    const visitId =
      action === "pay"
        ? await paidVisit(tx, old.storeId, visitor, now)
        : undefined;
    const changed = await tx.order.updateMany({
      where: { id, status: old.status },
      data: {
        status,
        ...(action === "pay" ? { paidAt: now, paidVisitId: visitId } : {}),
        ...(action === "accept" ? { acceptedAt: new Date() } : {}),
        ...(action === "ready" ? { readyAt: new Date() } : {}),
        ...(action === "complete" ? { doneAt: new Date() } : {}),
        ...(status === "CANCELLED"
          ? { cancelReason: reason ?? "取消订单" }
          : {}),
        ...(action === "refund"
          ? {
              refundReason: reason,
              refundFromStatus: old.status,
              refundRejected: false,
            }
          : {}),
      },
    });
    assert(changed.count === 1, 409, "订单状态已更新，请重试");
    changedState = true;
    if (status === "CANCELLED") await restoreStock(tx, old);
    return tx.order.findUniqueOrThrow({ where: { id }, include });
  });
  if (changedState)
    notifyOrder(
      result.storeId,
      result.id,
      action === "pay" && !expired ? "new_order" : "updated",
    );
  if (expired)
    throw new HttpError(409, "订单已超时取消", { reason: "PAYMENT_EXPIRED" });
  return serializeOrder(result, actor.role);
}
export async function resolveDispute(
  id: string,
  actor: { id: string; role: string },
  approve: boolean,
  reason: string,
) {
  const result = await cartTransaction(async (tx) => {
    const old = await tx.order.findUnique({ where: { id }, include });
    assert(old?.status === "REFUNDING" && old.disputed, 409, "退款纠纷不存在");
    const status = approve ? "CANCELLED" : (old.refundFromStatus ?? "DONE");
    const updated = await tx.order.updateMany({
      where: { id, status: "REFUNDING", disputed: true },
      data: { status, disputed: false, cancelReason: approve ? reason : null },
    });
    assert(updated.count === 1, 409, "纠纷已处理");
    if (approve) await restoreStock(tx, old);
    await recordAudit(
      tx,
      actor,
      approve ? "refund-approve" : "refund-reject",
      "Order",
      id,
      reason,
    );
    return tx.order.findUniqueOrThrow({ where: { id }, include });
  });
  notifyOrder(result.storeId, result.id);
  return serializeOrder(result, actor.role);
}
export async function reviewOrder(id: string, userId: string, body: unknown) {
  const data = z
    .object({
      rating: z.number().int().min(1).max(5),
      content: z.string().min(1).max(1000),
    })
    .parse(body);
  const result = await cartTransaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, userId },
      include: { review: true },
    });
    assert(order, 404, "订单不存在");
    assert(order.status === "DONE", 409, "完成订单后可评价");
    assert(!order.review, 409, "订单已评价");
    const review = await tx.review.create({
      data: { ...data, orderId: id, userId, storeId: order.storeId },
    });
    const aggregate = await tx.review.aggregate({
      where: { storeId: order.storeId },
      _avg: { rating: true },
    });
    await updateStoreRating(
      tx,
      order.storeId,
      Math.round(aggregate._avg.rating! * 10) / 10,
    );
    return review;
  });
  notifyOrder(result.storeId, id);
  return result;
}
async function cancelExpired(
  tx: Prisma.TransactionClient,
  id: string,
  now: Date,
) {
  const changed = await tx.order.updateMany({
    where: {
      id,
      status: "PENDING_PAY",
      paidAt: null,
      createdAt: { lte: new Date(now.getTime() - PAYMENT_TTL_MS) },
    },
    data: { status: "CANCELLED", cancelReason: "支付超时" },
  });
  if (!changed.count) return false;
  const order = await tx.order.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });
  await restoreStock(tx, order);
  return true;
}
export async function expireUnpaid() {
  const now = new Date();
  for (;;) {
    const batch = await db.order.findMany({
      where: {
        status: "PENDING_PAY",
        paidAt: null,
        createdAt: { lte: new Date(now.getTime() - PAYMENT_TTL_MS) },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
    });
    if (!batch.length) return;
    for (const row of batch) {
      const changed = await cartTransaction((tx) =>
        cancelExpired(tx, row.id, now),
      );
      if (changed) notifyOrder(row.storeId, row.id);
    }
  }
}
export async function orderStats(
  storeId?: string,
  start = shanghaiDay(),
  end?: Date,
) {
  const where: Prisma.OrderWhereInput = {
    storeId,
    createdAt: { gte: start, ...(end ? { lt: end } : {}) },
  };
  const [
    orders,
    revenue,
    pending,
    refunds,
    refundPending,
    badReviews,
    disputesPending,
  ] = await Promise.all([
    db.order.count({ where }),
    db.order.aggregate({
      where: {
        ...where,
        paidAt: { not: null },
        status: { notIn: ["CANCELLED", "REFUNDING"] },
      },
      _sum: { payCents: true },
      _count: { id: true },
    }),
    db.order.count({ where: { storeId, status: "PENDING" } }),
    db.order.count({
      where: {
        ...where,
        OR: [
          { status: "REFUNDING" },
          { status: "CANCELLED", refundReason: { not: null } },
        ],
      },
    }),
    db.order.count({ where: { storeId, status: "REFUNDING" } }),
    db.review.count({ where: { storeId, rating: { lte: 2 }, reply: null } }),
    db.order.count({ where: { storeId, status: "REFUNDING", disputed: true } }),
  ]);
  return {
    orders,
    validOrders: revenue._count.id,
    revenueCents: revenue._sum.payCents ?? 0,
    pending,
    refunds,
    refundPending,
    disputesPending,
    badReviews,
    refundRate: orders ? Number(((refunds / orders) * 100).toFixed(1)) : 0,
  };
}

export function dailyStoreOrders() {
  return db.order.groupBy({
    by: ["storeId"],
    where: {
      createdAt: { gte: shanghaiDay() },
      paidAt: { not: null },
      status: { notIn: ["CANCELLED", "REFUNDING"] },
    },
    _count: { id: true },
    _sum: { payCents: true },
  });
}
export async function publicReviews(
  storeId: string,
  query: Record<string, unknown>,
) {
  const p = pagination(query);
  const [list, total] = await Promise.all([
    db.review.findMany({
      where: { storeId },
      select: { id: true, rating: true, content: true, reply: true },
      skip: p.skip,
      take: p.take,
      orderBy: { id: "desc" },
    }),
    db.review.count({ where: { storeId } }),
  ]);
  return pageResult(list, total, p);
}
