import { Router } from "express";
import multer from "multer";
import { handler, assert } from "../../http";
import { authenticate } from "../auth/middleware";
import { ownStore } from "../stores/service";
import { saveUpload } from "./service";
export function registerRouterUploads(router: Router) {
  router.post(
    "/uploads",
    authenticate,
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }).single("file"),
    handler(async (req) => {
      assert(!req.mustChangePassword, 403, "请先修改密码");
      if (req.actor!.role === "MERCHANT") {
        const store = await ownStore(req.actor!.id);
        assert(store?.status !== "FROZEN", 403, "已冻结店铺只允许查看");
      }
      return saveUpload(req.file, req.actor!.id, req.body.purpose);
    }),
  );
}
