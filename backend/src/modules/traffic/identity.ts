import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { config } from "../../config";
import { TRAFFIC_RULES } from "../../rules";
const sign = (value: string) =>
  createHmac("sha256", config.jwtSecret)
    .update("visitor-v1:" + value)
    .digest("hex");
export function newVisitorCookie(now = Date.now()) {
  const value = `${randomBytes(32).toString("hex")}.${now + TRAFFIC_RULES.cookieMaxAgeMs}`;
  return value + "." + sign(value);
}
export function visitorHash(
  cookie: unknown,
  now = Date.now(),
): string | undefined {
  if (
    typeof cookie !== "string" ||
    !/^[a-f0-9]{64}\.\d{13}\.[a-f0-9]{64}$/.test(cookie)
  )
    return;
  const [id, expires, signature] = cookie.split(".");
  if (
    Number(expires) <= now ||
    !timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(sign(`${id}.${expires}`), "hex"),
    )
  )
    return;
  return createHash("sha256").update(id).digest("hex");
}
