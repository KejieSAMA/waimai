import { Router } from "express";
import { handler, assert } from "./http";
import {
  authenticate,
  requireRole,
  attachStore,
} from "./modules/auth/middleware";
import auth from "./modules/auth/router";
import { registerRouterCategories } from "./modules/categories/router";
import { registerRouterStores } from "./modules/stores/router";
import { registerRouterUploads } from "./modules/uploads/router";
import { registerUserUsers } from "./modules/users/router";
import { registerUserOrders } from "./modules/orders/router";
import { registerUserCart } from "./modules/cart/router";
import { registerMerchantReviews } from "./modules/reviews/router";
import { registerMerchantCategories } from "./modules/categories/router";
import { registerMerchantStores } from "./modules/stores/router";
import { registerMerchantOrders } from "./modules/orders/router";
import { registerMerchantProducts } from "./modules/products/router";
import { registerMerchantStats } from "./modules/stats/router";
import { registerAdminCategories } from "./modules/categories/router";
import { registerAdminStores } from "./modules/stores/router";
import { registerAdminOrders } from "./modules/orders/router";
import { registerAdminProducts } from "./modules/products/router";
import { registerAdminStats } from "./modules/stats/router";
import { registerAdminAudit } from "./modules/audit/router";
import { registerAdminAccounts } from "./modules/accounts/router";
import { registerTraffic } from "./modules/traffic/router";
export const router = Router();
router.use("/auth", auth);
router.get(
  "/health",
  handler(async () => ({ status: "ok" })),
);
registerRouterCategories(router);
registerRouterStores(router);
registerTraffic(router);
registerRouterUploads(router);
const user = Router();
user.use(authenticate, requireRole("USER"));
registerUserUsers(user);
registerUserOrders(user);
registerUserCart(user);
router.use("/user", user);
const merchant = Router();
merchant.use(authenticate, requireRole("MERCHANT"));
registerMerchantStores(merchant);
merchant.use(attachStore);
registerMerchantReviews(merchant);
registerMerchantCategories(merchant);
registerMerchantOrders(merchant);
registerMerchantProducts(merchant);
registerMerchantStats(merchant);
router.use("/merchant", merchant);
const admin = Router();
admin.use(authenticate, requireRole("ADMIN"));
registerAdminCategories(admin);
registerAdminStores(admin);
registerAdminOrders(admin);
registerAdminProducts(admin);
registerAdminStats(admin);
registerAdminAudit(admin);
registerAdminAccounts(admin);
router.use("/admin", admin);
router.use((_req, _res, next) => {
  try {
    assert(false, 404, "接口不存在");
  } catch (e) {
    next(e);
  }
});
