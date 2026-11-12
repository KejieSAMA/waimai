import "../src/config";
import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "prisma", "migrate", "deploy"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
process.exitCode = result.status ?? 1;
