-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '北京',
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
INSERT INTO "new_Store" ("address", "categoryId", "city", "contactPhone", "createdAt", "deliveryFeeCents", "foodPermitImage", "frozenReason", "id", "licenseExpireAt", "licenseImage", "logo", "minOrderCents", "monthlySales", "name", "notice", "openHours", "ownerId", "permitExpireAt", "previousStatus", "rating", "rejectReason", "status", "submitCount") SELECT "address", "categoryId", "city", "contactPhone", "createdAt", "deliveryFeeCents", "foodPermitImage", "frozenReason", "id", "licenseExpireAt", "licenseImage", "logo", "minOrderCents", "monthlySales", "name", "notice", "openHours", "ownerId", "permitExpireAt", "previousStatus", "rating", "rejectReason", "status", "submitCount" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_ownerId_key" ON "Store"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


UPDATE "Store" SET "rating" = (SELECT ROUND(AVG("Review"."rating"), 1) FROM "Review" WHERE "Review"."storeId" = "Store"."id");
