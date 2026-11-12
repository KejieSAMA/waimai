import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
process.env.DATABASE_URL ??= "file:./dev.db";
export const production = process.env.NODE_ENV === "production";
function secret(name: string) {
  const value = process.env[name];
  if (!value || value.length < 32 || value.startsWith("replace-"))
    throw new Error(`${name} 必须设置为随机密钥`);
  return value;
}
export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: secret("JWT_SECRET"),
  productReview: process.env.PRODUCT_REVIEW === "true",
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "./uploads"),
};
