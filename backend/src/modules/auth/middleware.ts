import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@waimai/shared";
import { config } from "../../config";
import { assert, type AuthRequest } from "../../http";
import { ownStore } from "../stores/service";
import { validateSession } from "./service";
export const authenticate: RequestHandler = (request, _res, next) => {
  const req = request as AuthRequest;
  void (async () => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    assert(token, 401, "请先登录");
    let p: jwt.JwtPayload;
    try {
      p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    } catch {
      assert(false, 401, "请重新登录");
    }
    assert(
      typeof p.sub === "string" &&
        typeof p.sid === "string" &&
        typeof p.version === "number",
      401,
      "登录无效",
    );
    const session = await validateSession(p.sid, p.version);
    assert(
      session.userId === p.sub && session.activeRole === p.role,
      401,
      "登录身份无效",
    );
    req.actor = { id: session.userId, role: session.activeRole as Role };
    req.sessionId = session.id;
    req.sessionVersion = session.version;
    req.mustChangePassword = session.user.mustChangePassword;
    next();
  })().catch(next);
};
export const requireRole =
  (role: Role): RequestHandler =>
  (request, _res, next) => {
    try {
      const req = request as AuthRequest;
      assert(!req.mustChangePassword, 403, "请先修改密码");
      assert(req.actor?.role === role, 403, "无权访问");
      next();
    } catch (e) {
      next(e);
    }
  };
export const attachStore: RequestHandler = (request, _res, next) => {
  const req = request as AuthRequest;
  ownStore(req.actor!.id)
    .then((store) => {
      assert(store, 404, "请先提交入驻申请");
      req.storeId = store.id;
      next();
    })
    .catch(next);
};
export const writableStore: RequestHandler = (request, _res, next) => {
  const req = request as AuthRequest;
  ownStore(req.actor!.id)
    .then((store) => {
      assert(
        store && ["OPEN", "CLOSED"].includes(store.status),
        403,
        "当前店铺状态只允许查看",
      );
      next();
    })
    .catch(next);
};
