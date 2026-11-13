import { z } from "zod";
import { db } from "../../db";
import { assert, pagination, pageResult } from "../../http";
import { cartTransaction } from "../cart/service";
import { validateSession } from "../auth/service";
import { recordAudit } from "../audit/service";
import { notifyOrder } from "../orders/events";
import type { CartActor } from "../cart/service";
export async function merchantReviews(
  storeId: string,
  query: Record<string, unknown>,
) {
  const p = pagination(query);
  const rating = z.enum(["all", "bad"]).default("all").parse(query.rating);
  const reply = z
    .enum(["all", "pending", "replied"])
    .default("all")
    .parse(query.reply);
  const where = {
    storeId,
    ...(rating === "bad" ? { rating: { lte: 2 } } : {}),
    ...(reply === "pending"
      ? { reply: null }
      : reply === "replied"
        ? { reply: { not: null } }
        : {}),
  };
  const [list, total, store] = await Promise.all([
    db.review.findMany({
      where,
      skip: p.skip,
      take: p.take,
      orderBy: { id: "desc" },
      select: {
        id: true,
        rating: true,
        content: true,
        reply: true,
        order: { select: { id: true, orderNo: true, doneAt: true } },
      },
    }),
    db.review.count({ where }),
    db.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { status: true },
    }),
  ]);
  return { ...pageResult(list, total, p), storeStatus: store.status };
}
export async function replyReview(
  actor: CartActor,
  storeId: string,
  id: string,
  body: unknown,
) {
  const { content } = z
    .object({ content: z.string().trim().min(1).max(500) })
    .strict()
    .parse(body);
  let changed = false;
  const result = await cartTransaction(async (tx) => {
    changed = false;
    const session = await validateSession(actor.sessionId, actor.version, tx);
    assert(
      session.userId === actor.id &&
        session.activeRole === "MERCHANT" &&
        !session.user.mustChangePassword,
      403,
      "身份已变化",
    );
    const store = await tx.store.findFirst({
      where: { id: storeId, ownerId: actor.id },
    });
    assert(
      store && ["OPEN", "CLOSED"].includes(store.status),
      403,
      "当前店铺只允许查看",
    );
    const old = await tx.review.findFirst({ where: { id, storeId } });
    assert(old, 404, "评价不存在");
    if (old.reply === content) return old;
    const updated = await tx.review.update({
      where: { id },
      data: { reply: content },
    });
    await recordAudit(
      tx,
      { id: actor.id, role: "MERCHANT" },
      "review-reply",
      "Review",
      id,
      JSON.stringify({ before: old.reply, after: content }),
    );
    changed = true;
    return updated;
  });
  if (changed) notifyOrder(storeId, result.orderId);
  return { id: result.id, reply: result.reply };
}
