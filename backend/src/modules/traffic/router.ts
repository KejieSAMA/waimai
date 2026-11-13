import type { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { handler } from "../../http";
import { production } from "../../config";
import { TRAFFIC_RULES } from "../../rules";
import { authenticate } from "../auth/middleware";
import { newVisitorCookie, visitorHash } from "./identity";
import { registerVisit } from "./service";
export function registerTraffic(router: Router) {
  router.post(
    "/public/stores/:id/visits",
    (_req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    },
    rateLimit({
      windowMs: TRAFFIC_RULES.rateWindowMs,
      limit: TRAFFIC_RULES.rateLimit,
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, message: "访问登记频繁，请稍后重试" },
    }),
    (req, res, next) =>
      req.headers.authorization ? authenticate(req, res, next) : next(),
    handler(async (req, res) => {
      z.object({})
        .strict()
        .parse(req.body ?? {});
      const result = await registerVisit(
        req.params.id,
        visitorHash(req.cookies[TRAFFIC_RULES.cookieName]),
        req.actor,
      );
      if (result.cookieRequired)
        res.cookie(TRAFFIC_RULES.cookieName, newVisitorCookie(), {
          httpOnly: true,
          secure: production,
          sameSite: "strict",
          path: "/api/v1",
          maxAge: TRAFFIC_RULES.cookieMaxAgeMs,
        });
      return result;
    }),
  );
}
