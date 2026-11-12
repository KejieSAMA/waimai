import { Router, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { handler } from "../../http";
import { production } from "../../config";
import { authenticate } from "./middleware";
import { roleSchema, passwordSchema } from "./schema";
import * as service from "./service";
const router = Router();
router.use(
  ["/login", "/register", "/password"],
  rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, message: "操作频繁，请稍后重试" },
  }),
);
const options = {
  httpOnly: true,
  secure: production,
  sameSite: "strict" as const,
  path: "/api/v1/auth",
};
function clearLegacy(res: Response) {
  for (const role of ["USER", "MERCHANT", "ADMIN"])
    res.clearCookie(`xz_refresh_${role}`, options);
}
router.use((_req, res, next) => {
  clearLegacy(res);
  next();
});
function respond(
  res: Response,
  session: Awaited<ReturnType<typeof service.issueSession>>,
) {
  res.cookie("xz_refresh", session.refreshToken, {
    ...options,
    maxAge: 7 * 86400000,
  });
  return {
    accessToken: session.accessToken,
    activeRole: session.activeRole,
    user: session.user,
  };
}
router.post(
  "/login",
  handler(async (req, res) => {
    const session = await service.passwordLogin(req.body);
    await service.revokeSession(req.cookies.xz_refresh ?? "");
    return respond(res, session);
  }),
);
router.post(
  "/register",
  handler(async (req, res) => {
    const session = await service.register(req.body);
    await service.revokeSession(req.cookies.xz_refresh ?? "");
    return respond(res, session);
  }),
);
router.post(
  "/refresh",
  handler(async (req) => {
    const session = await service.refreshSession(req.cookies.xz_refresh ?? "");
    return {
      accessToken: session.accessToken,
      activeRole: session.activeRole,
      user: session.user,
    };
  }),
);
router.post(
  "/logout",
  handler(async (req, res) => {
    await service.revokeSession(req.cookies.xz_refresh ?? "");
    res.clearCookie("xz_refresh", options);
    return null;
  }),
);
router.get(
  "/me",
  authenticate,
  handler(async (req) => ({
    user: await service.safeAccount(req.actor!.id, req.actor!.role),
    activeRole: req.actor!.role,
  })),
);
router.put(
  "/me",
  authenticate,
  handler(async (req) =>
    service.updateProfile(
      req.actor!,
      req.sessionId!,
      req.sessionVersion!,
      req.body,
    ),
  ),
);
router.post(
  "/switch-role",
  authenticate,
  handler(async (req, res) => {
    const { role } = z.object({ role: roleSchema }).strict().parse(req.body);
    return respond(res, await service.switchRole(req.sessionId!, role));
  }),
);
router.post(
  "/password",
  authenticate,
  handler(async (req, res) => {
    const p = z
      .object({
        oldPassword: z.string().min(1).max(100),
        password: passwordSchema,
      })
      .strict()
      .parse(req.body);
    await service.changePassword(
      req.actor!.id,
      p.oldPassword,
      p.password,
      req.actor!.role,
    );
    res.clearCookie("xz_refresh", options);
    return null;
  }),
);
export default router;
