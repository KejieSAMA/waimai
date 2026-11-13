import type { Prisma } from "@prisma/client";
import { db } from "../../db";
import { shanghaiDay } from "../../http";
import { TRAFFIC_RULES } from "../../rules";
import { visibleStore } from "../stores/service";

export async function registerVisit(
  storeId: string,
  hash: string | undefined,
  actor?: { id: string; role: string },
  now = new Date(),
) {
  const store = await visibleStore(storeId);
  if (actor && (actor.role !== "USER" || actor.id === store.ownerId))
    return { registered: false, cookieRequired: false };
  if (!hash) return { registered: false, cookieRequired: true };
  await db.storeVisit.upsert({
    where: {
      storeId_day_visitorHash: {
        storeId,
        day: shanghaiDay(now),
        visitorHash: hash,
      },
    },
    create: {
      storeId,
      day: shanghaiDay(now),
      visitorHash: hash,
      firstSeenAt: now,
    },
    update: {},
  });
  return { registered: true, cookieRequired: false };
}
/** Only called for the first successful payment, inside its transaction. */
export async function paidVisit(
  tx: Prisma.TransactionClient,
  storeId: string,
  hash: string | undefined,
  now: Date,
) {
  if (!hash) return null;
  const visit = await tx.storeVisit.findUnique({
    where: {
      storeId_day_visitorHash: {
        storeId,
        day: shanghaiDay(now),
        visitorHash: hash,
      },
    },
    select: { id: true, firstSeenAt: true },
  });
  return visit && visit.firstSeenAt <= now ? visit.id : null;
}
export async function trafficStats(storeId: string, now = new Date()) {
  const day = shanghaiDay(now);
  const [visitors, convertedVisitors, collection] = await db.$transaction([
    db.storeVisit.count({ where: { storeId, day } }),
    db.storeVisit.count({
      where: {
        storeId,
        day,
        paidOrders: {
          some: {
            paidAt: { gte: day, lt: new Date(day.getTime() + 86_400_000) },
          },
        },
      },
    }),
    db.trafficCollection.findUniqueOrThrow({
      where: { id: "store-visits-v1" },
    }),
  ]);
  return {
    visitors,
    convertedVisitors,
    conversionRate: visitors
      ? Number(((convertedVisitors / visitors) * 100).toFixed(1))
      : null,
    traffic: {
      collectionStartedAt: collection.startedAt.toISOString(),
      day: day.toISOString(),
      timezone: "Asia/Shanghai" as const,
      partialDay: collection.startedAt > day,
    },
  };
}
export async function cleanupVisits(now = new Date()) {
  // Keep today and the preceding 29 Shanghai natural days.
  const before = new Date(
    shanghaiDay(now).getTime() - (TRAFFIC_RULES.retentionDays - 1) * 86_400_000,
  );
  return db.storeVisit.deleteMany({ where: { day: { lt: before } } });
}
