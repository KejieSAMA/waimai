import { z } from "zod";
import { db } from "../../db";
import { assert } from "../../http";
import { cartTransaction, type CartActor } from "../cart/service";
import { validateSession } from "../auth/service";
import { recordAudit } from "../audit/service";
const schema = z
  .object({
    version: z.number().int().min(0),
    rules: z
      .array(
        z
          .object({
            thresholdCents: z.number().int().positive().max(1000000),
            discountCents: z.number().int().positive().max(1000000),
          })
          .strict()
          .refine(
            (r) => r.discountCents <= r.thresholdCents,
            "优惠不能超过门槛",
          ),
      )
      .max(10),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.rules.map((r) => r.thresholdCents)).size === v.rules.length,
    "满减门槛不能重复",
  );
export async function promotions(storeId: string) {
  const store = await db.store.findUniqueOrThrow({
    where: { id: storeId },
    select: {
      promotionsVersion: true,
      status: true,
      promotions: {
        orderBy: { thresholdCents: "asc" },
        select: { thresholdCents: true, discountCents: true },
      },
    },
  });
  return {
    version: store.promotionsVersion,
    storeStatus: store.status,
    rules: store.promotions,
  };
}
export async function savePromotions(
  actor: CartActor,
  storeId: string,
  body: unknown,
) {
  const input = schema.parse(body);
  return cartTransaction(async (tx) => {
    const session = await validateSession(actor.sessionId, actor.version, tx);
    assert(
      session.userId === actor.id &&
        session.activeRole === "MERCHANT" &&
        !session.user.mustChangePassword,
      403,
      "身份已变化",
    );
    const old = await tx.store.findFirst({
      where: { id: storeId, ownerId: actor.id },
      include: { promotions: true },
    });
    assert(
      old && ["OPEN", "CLOSED"].includes(old.status),
      403,
      "当前店铺只允许查看",
    );
    assert(
      old.promotionsVersion === input.version,
      409,
      "满减配置已在其他页面更新，请重新读取",
    );
    const rules = input.rules.sort(
      (a, b) => a.thresholdCents - b.thresholdCents,
    );
    const before = old.promotions
      .map(({ thresholdCents, discountCents }) => ({
        thresholdCents,
        discountCents,
      }))
      .sort((a, b) => a.thresholdCents - b.thresholdCents);
    if (JSON.stringify(before) === JSON.stringify(rules))
      return { version: old.promotionsVersion, storeStatus: old.status, rules };
    const result = await tx.store.updateMany({
      where: { id: storeId, promotionsVersion: input.version },
      data: { promotionsVersion: { increment: 1 } },
    });
    assert(result.count === 1, 409, "配置已更新，请重新读取");
    await tx.promotion.deleteMany({ where: { storeId } });
    for (const rule of rules)
      await tx.promotion.create({ data: { storeId, ...rule } });
    await recordAudit(
      tx,
      { id: actor.id, role: "MERCHANT" },
      "promotion-update",
      "Store",
      storeId,
      JSON.stringify({ before, after: rules }),
    );
    return { version: input.version + 1, storeStatus: old.status, rules };
  });
}
