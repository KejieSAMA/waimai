import { Router } from "express";
import { handler } from "../../http";
import * as stats from "./service";
export function registerMerchantStats(merchant: Router) {
  merchant.get(
    "/stats/today",
    handler(async (req) => stats.overview(req.storeId)),
  );
  merchant.get(
    "/stats/trend",
    handler(async (req) => stats.trend(req.query.days, req.storeId)),
  );
  merchant.get(
    "/todos",
    handler(async (req) => stats.todos(req.storeId)),
  );
}
export function registerAdminStats(admin: Router) {
  admin.get(
    "/stats/overview",
    handler(async () => stats.overview()),
  );
  admin.get(
    "/stats/trend",
    handler(async (req) => stats.trend(req.query.days)),
  );
  admin.get(
    "/stats/ranking",
    handler(async () => stats.ranking()),
  );
  admin.get(
    "/todos",
    handler(async () => stats.todos()),
  );
}
