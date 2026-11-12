PRAGMA foreign_keys=OFF;
CREATE TABLE "UserRole" (
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  PRIMARY KEY ("userId", "role"),
  CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "UserRole" ("userId", "role") SELECT "id", "role" FROM "User";
DELETE FROM "RefreshSession";
CREATE TABLE "new_User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "phone" TEXT,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "lastLoginAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("id", "username", "phone", "name", "passwordHash", "status", "mustChangePassword", "createdAt")
SELECT "id", lower("phone"), CASE WHEN length("phone")=11 AND "phone" NOT GLOB '*[^0-9]*' THEN "phone" ELSE NULL END,
"name", NULL, 'DISABLED', true, "createdAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
ALTER TABLE "RefreshSession" ADD COLUMN "activeRole" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "RefreshSession" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
UPDATE "Store" SET "previousStatus"="status", "status"='FROZEN', "frozenReason"='账号系统升级，待管理员核对账号' WHERE "status"<>'FROZEN';
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
