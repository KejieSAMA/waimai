PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "notice" TEXT NOT NULL DEFAULT '',
    "openHours" TEXT NOT NULL DEFAULT '09:00-22:00',
    "minOrderCents" INTEGER NOT NULL DEFAULT 0,
    "deliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "previousStatus" TEXT NOT NULL DEFAULT 'CLOSED',
    "rejectReason" TEXT,
    "frozenReason" TEXT,
    "licenseImage" TEXT NOT NULL DEFAULT '',
    "foodPermitImage" TEXT NOT NULL DEFAULT '',
    "licenseExpireAt" DATETIME,
    "permitExpireAt" DATETIME,
    "rating" REAL,
    "monthlySales" INTEGER NOT NULL DEFAULT 0,
    "submitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotionsVersion" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Store_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Store" ("id", "ownerId", "name", "logo", "categoryId", "city", "address", "contactPhone", "notice", "openHours", "minOrderCents", "deliveryFeeCents", "status", "previousStatus", "rejectReason", "frozenReason", "licenseImage", "foodPermitImage", "licenseExpireAt", "permitExpireAt", "rating", "monthlySales", "submitCount", "createdAt", "promotionsVersion") SELECT "id", "ownerId", "name", "logo", "categoryId", "city", "address", "contactPhone", "notice", "openHours", "minOrderCents", "deliveryFeeCents", "status", "previousStatus", "rejectReason", "frozenReason", "licenseImage", "foodPermitImage", "licenseExpireAt", "permitExpireAt", "rating", "monthlySales", "submitCount", "createdAt", "promotionsVersion" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_ownerId_key" ON "Store"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "TrafficCollection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "TrafficCollection" ("id") VALUES ('store-visits-v1');
CREATE TABLE "StoreVisit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "day" DATETIME NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreVisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StoreVisit_storeId_day_visitorHash_key" ON "StoreVisit"("storeId", "day", "visitorHash");
CREATE INDEX "StoreVisit_day_idx" ON "StoreVisit"("day");
ALTER TABLE "Order" ADD COLUMN "paidVisitId" TEXT REFERENCES "StoreVisit" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_paidVisitId_idx" ON "Order"("paidVisitId");
