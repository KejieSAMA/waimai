import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import multer from "multer";
import { ZodError } from "zod";
import path from "node:path";
import { existsSync } from "node:fs";
import { config, production } from "./config";
import { router } from "./routes";
import { privateOwner } from "./modules/uploads/service";
import { authenticate } from "./modules/auth/middleware";
import { assert, type AuthRequest } from "./http";
export const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
app.use(express.json({ limit: "1mb" }), cookieParser());
app.use("/api/v1", router);
app.use("/uploads", (req, res, next) => {
  privateOwner(req.path.slice(1))
    .then((owner) => {
      if (!owner) {
        next();
        return;
      }
      authenticate(req, res, (error) => {
        if (error) {
          next(error);
          return;
        }
        try {
          const actor = (req as AuthRequest).actor;
          assert(
            actor && (actor.role === "ADMIN" || actor.id === owner),
            403,
            "无权查看证照",
          );
          next();
        } catch (e) {
          next(e);
        }
      });
    })
    .catch(next);
});
app.use(
  "/uploads",
  express.static(config.uploadDir, {
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; img-src 'self'",
      );
    },
  }),
);
app.use("/uploads", (_req, res) => {
  res.status(404).json({ code: 404, message: "图片不存在" });
});
if (production) {
  const pc = path.resolve(process.cwd(), "../frontend/dist");
  const mobile = path.resolve(process.cwd(), "../mobile/dist");
  app.use("/mobile", express.static(mobile));
  app.use(express.static(pc));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ code: 404, message: "接口不存在" });
      return;
    }
    const index = path.join(
      req.path === "/mobile" || req.path.startsWith("/mobile/") ? mobile : pc,
      "index.html",
    );
    if (!existsSync(index)) {
      res.status(503).json({ code: 503, message: "请先完成前端构建" });
      return;
    }
    res.sendFile(index);
  });
}
app.use(
  (
    error: Error & { status?: number; code?: string },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const conflict = ["P2002", "P2003", "P2034", "P2028", "P1008"].includes(
      error.code ?? "",
    );
    const status =
      error instanceof ZodError
        ? 400
        : error instanceof multer.MulterError
          ? 400
          : conflict
            ? 409
            : error.code === "P2003"
              ? 409
              : (error.status ?? 500);
    if (status === 500) process.stderr.write(error.stack + "\n");
    res.status(status).json({
      code: status,
      message:
        status === 500
          ? "服务暂时不可用"
          : error instanceof ZodError
            ? "参数格式错误"
            : error.code === "P2002"
              ? "数据已存在"
              : error.code === "P2003"
                ? "关联数据仍在使用"
                : conflict
                  ? "数据正在更新，请重试"
                  : error.message,
      ...(error instanceof ZodError ? { details: error.flatten() } : {}),
    });
  },
);
