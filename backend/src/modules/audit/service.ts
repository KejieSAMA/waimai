import type { Prisma } from "@prisma/client";
import { db } from "../../db";
export function recordAudit(
  tx: Prisma.TransactionClient,
  actor: { id: string; role: string },
  action: string,
  targetType: string,
  targetId: string,
  reason?: string,
) {
  return tx.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      reason,
    },
  });
}
export const auditLogs = (targetType?: string, targetId?: string) =>
  db.auditLog.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
