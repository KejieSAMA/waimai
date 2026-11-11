import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { Response } from "express";
import { handler } from "../../http";
import { production } from "../../config";
import {
  loginSchema,
  phoneSchema,
  registerSchema,
  userLoginSchema,
} from "./schema";
import * as service from "./service";
const router = Router();
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, message: "操作频繁，请稍后重试" },
  }),
);
function respond(
  res: Response,
  session: Awaited<ReturnType<typeof service.issueSession>>,
) {
  res.cookie(`xz_refresh_${session.user.role}`, session.refreshToken, {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: 7 * 86400000,
  });
  return { accessToken: session.accessToken, user: session.user };
}
router.post(
  "/user/code",
  handler(async (req) => {
    const { phone } = z.object({ phone: phoneSchema }).parse(req.body);
    await service.sms.send(phone);
    return { expiresIn: 300 };
  }),
);
router.post(
  "/user/login",
  handler(async (req, res) => {
    const p = userLoginSchema.parse(req.body);
    return respond(res, await service.userLogin(p.phone, p.code));
  }),
);
for (const role of ["MERCHANT", "ADMIN"] as const)
  router.post(
    `/${role.toLowerCase()}/login`,
    handler(async (req, res) => {
      const p = loginSchema.parse(req.body);
      return respond(
        res,
        await service.passwordLogin(p.phone, p.password, role),
      );
    }),
  );
router.post(
  "/merchant/register",
  handler(async (req, res) => {
    const p = registerSchema.parse(req.body);
    return respond(res, await service.register(p.phone, p.password, p.name));
  }),
);
const roleSchema = z.object({ role: z.enum(["USER", "MERCHANT", "ADMIN"]) });
router.post(
  "/refresh",
  handler(async (req, res) => {
    const { role } = roleSchema.parse(req.body);
    return respond(
      res,
      await service.refreshSession(
        req.cookies[`xz_refresh_${role}`] ?? "",
        role,
      ),
    );
  }),
);
router.post(
  "/logout",
  handler(async (req, res) => {
    const { role } = roleSchema.parse(req.body);
    await service.revokeSession(req.cookies[`xz_refresh_${role}`] ?? "");
    res.clearCookie(`xz_refresh_${role}`, {
      path: "/api/v1/auth",
      httpOnly: true,
      secure: production,
      sameSite: "strict",
    });
    return null;
  }),
);
export default router;
