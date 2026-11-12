import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
export async function applyTestMigrations(
  db: PrismaClient,
  before?: (name: string) => Promise<void>,
) {
  const directory = path.resolve("backend/prisma/migrations");
  for (const name of (await readdir(directory)).sort()) {
    if (name === "migration_lock.toml") continue;
    await before?.(name);
    const sql = await readFile(
      path.join(directory, name, "migration.sql"),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.$executeRawUnsafe(statement);
  }
}
