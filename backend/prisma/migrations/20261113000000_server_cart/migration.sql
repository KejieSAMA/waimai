CREATE TABLE "Cart" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "type" TEXT NOT NULL DEFAULT 'DELIVERY',
  "addressId" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "items" TEXT NOT NULL DEFAULT '[]',
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Cart_userId_storeId_key" ON "Cart"("userId", "storeId");
CREATE TABLE "CartMerge" (
  "guestId" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "issues" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CartMerge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "Order" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "Order_userId_requestId_key" ON "Order"("userId", "requestId");
