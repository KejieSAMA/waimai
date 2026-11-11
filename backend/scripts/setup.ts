import { spawnSync } from "node:child_process";
import { openSync, closeSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import "../src/config";
const url = process.env.DATABASE_URL ?? "file:./dev.db";
if (url.startsWith("file:")) {
  const filename = path.resolve("prisma", url.slice(5));
  mkdirSync(path.dirname(filename), { recursive: true });
  if (!existsSync(filename)) closeSync(openSync(filename, "a"));
}
for (const args of [
  ["exec", "prisma", "generate"],
  ["exec", "prisma", "migrate", "deploy"],
  ["exec", "tsx", "prisma/seed.ts"],
]) {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args,
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
