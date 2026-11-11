import { Router } from "express";
import { z } from "zod";
import { handler } from "../../http";
import { auditLogs } from "./service";
export function registerAdminAudit(admin: Router) {
  admin.get(
    "/audit-logs",
    handler(async (req) =>
      auditLogs(
        z.string().optional().parse(req.query.targetType),
        z.string().optional().parse(req.query.targetId),
      ),
    ),
  );
}
