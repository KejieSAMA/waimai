import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@waimai/shared";
import { config } from "../../config";
import { assert, type AuthRequest } from "../../http";
import { ownStore } from "../stores/service";
export const authenticate: RequestHandler = (request, _res, next) => {
  const req = request as AuthRequest;
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    assert(token, 401, "请先登录");
    const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    assert(
      typeof p.sub === "string" &&
        ["USER", "MERCHANT", "ADMIN"].includes(p.role),
      401,
      "登录无效",
    );
    req.actor = { id: p.sub, role: p.role };
    next();
  } catch {
    next(Object.assign(new Error("请重新登录"), { status: 401 }));
  }
};
export const requireRole =
  (role: Role): RequestHandler =>
  (request, _res, next) => {
    try {
      assert((request as AuthRequest).actor?.role === role, 403, "无权访问");
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
