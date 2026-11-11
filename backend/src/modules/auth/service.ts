import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import type { Role } from "@waimai/shared";
import { db } from "../../db";
import { config, production } from "../../config";
import { assert } from "../../http";
export interface SmsProvider {
  send(phone: string): Promise<void>;
  verify(phone: string, code: string): Promise<boolean>;
}
const codes = new Map<string, number>();
export const sms: SmsProvider = {
  async send(phone) {
    assert(!production, 503, "短信服务尚未配置");
    codes.set(phone, Date.now() + 300000);
    process.stdout.write(`开发验证码 尾号 ${phone.slice(-4)} 123456\n`);
  },
  async verify(phone, code) {
    const valid =
      !production && code === "123456" && (codes.get(phone) ?? 0) > Date.now();
    if (valid) codes.delete(phone);
    return valid;
  },
};
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const safeAccount = (user: User) => ({
  id: user.id,
  phone: user.phone,
  name: user.name,
  role: user.role,
});
export async function issueSession(user: User, oldDigest?: string) {
  const accessToken = jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: "2h",
  });
  const refreshToken = jwt.sign(
    { role: user.role, jti: randomUUID() },
    config.refreshSecret,
    { subject: user.id, expiresIn: "7d" },
  );
  await db.$transaction(async (tx) => {
    if (oldDigest) {
      const removed = await tx.refreshSession.deleteMany({
        where: { digest: oldDigest },
      });
      assert(removed.count === 1, 401, "登录已过期");
    }
    await tx.refreshSession.create({
      data: {
        userId: user.id,
        digest: digest(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
  });
  return { accessToken, refreshToken, user: safeAccount(user) };
}
export async function refreshSession(token: string, role: Role) {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.refreshSecret) as jwt.JwtPayload;
  } catch {
    assert(false, 401, "请重新登录");
  }
  assert(
    payload.role === role && typeof payload.sub === "string",
    401,
    "登录身份无效",
  );
  const session = await db.refreshSession.findUnique({
    where: { digest: digest(token) },
    include: { user: true },
  });
  assert(session && session.expiresAt > new Date(), 401, "登录已过期");
  return issueSession(session.user, digest(token));
}
export const revokeSession = (token: string) =>
  db.refreshSession.deleteMany({ where: { digest: digest(token) } });
export async function passwordLogin(
  phone: string,
  password: string,
  role: Role,
) {
  const user = await db.user.findUnique({ where: { phone } });
  assert(
    user?.role === role &&
      user.passwordHash &&
      (await bcrypt.compare(password, user.passwordHash)),
    401,
    "账号或密码错误",
  );
  return issueSession(user);
}
export async function userLogin(phone: string, code: string) {
  assert(await sms.verify(phone, code), 401, "验证码错误或过期");
  const old = await db.user.findUnique({ where: { phone } });
  assert(!old || old.role === "USER", 409, "该手机号已用于其他角色");
  const user =
    old ??
    (await db.user.create({
      data: { phone, name: "用户" + phone.slice(-4), role: "USER" },
    }));
  return issueSession(user);
}
export async function register(phone: string, password: string, name: string) {
  assert(
    !(await db.user.findUnique({ where: { phone } })),
    409,
    "手机号已注册",
  );
  return issueSession(
    await db.user.create({
      data: {
        phone,
        name,
        role: "MERCHANT",
        passwordHash: await bcrypt.hash(password, 12),
      },
    }),
  );
}
