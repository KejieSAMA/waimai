import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Prisma, User } from "@prisma/client";
import type { Role } from "@waimai/shared";
import { db } from "../../db";
import { config } from "../../config";
import { assert } from "../../http";
import { recordAudit } from "../audit/service";
import { sessionChanged } from "./events";
import {
  loginSchema,
  registerSchema,
  passwordSchema,
  profileSchema,
} from "./schema";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function assertAccountIdentifiers(
  tx: Prisma.TransactionClient,
  input: { username?: string; phone?: string | null },
  exceptId?: string,
) {
  if (input.phone) {
    const used = await tx.user.findFirst({
      where: {
        id: exceptId ? { not: exceptId } : undefined,
        OR: [{ phone: input.phone }, { username: input.phone }],
      },
      select: { id: true },
    });
    assert(!used, 409, "该手机号已被使用，请登录或更换手机号");
  }
  if (input.username && /^1[3-9]\d{9}$/.test(input.username)) {
    const used = await tx.user.findFirst({
      where: {
        phone: input.username,
        id: exceptId ? { not: exceptId } : undefined,
      },
      select: { id: true },
    });
    assert(!used, 409, "账号与已有手机号冲突，请更换账号");
  }
}
export async function safeAccount(
  id: string,
  role: Role,
  tx: Prisma.TransactionClient = db,
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id },
    include: { roles: true },
  });
  return {
    id: user.id,
    username: user.username,
    phone: user.phone ?? "",
    name: user.name,
    role,
    roles: user.roles.map((r) => r.role as Role),
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  };
}
export async function issueSession(user: User, requestedRole?: Role) {
  const grants = await db.userRole.findMany({ where: { userId: user.id } });
  const role = requestedRole ?? (grants[0]?.role as Role);
  assert(
    user.status === "ACTIVE" && grants.some((g) => g.role === role),
    403,
    "账号未启用或没有该身份权限",
  );
  const refreshToken = randomUUID() + randomUUID();
  const session = await db.refreshSession.create({
    data: {
      userId: user.id,
      activeRole: role,
      digest: digest(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return serializeSession(session, refreshToken);
}
async function serializeSession(
  session: { id: string; userId: string; activeRole: string; version: number },
  refreshToken: string,
) {
  const activeRole = session.activeRole as Role;
  const accessToken = jwt.sign(
    { role: activeRole, sid: session.id, version: session.version },
    config.jwtSecret,
    { subject: session.userId, expiresIn: "2h" },
  );
  return {
    accessToken,
    refreshToken,
    activeRole,
    user: await safeAccount(session.userId, activeRole),
  };
}
export async function validateSession(
  id: string,
  version?: number,
  tx: Prisma.TransactionClient = db,
) {
  const session = await tx.refreshSession.findUnique({
    where: { id },
    include: { user: { include: { roles: true } } },
  });
  assert(
    session &&
      session.expiresAt > new Date() &&
      session.user.status === "ACTIVE" &&
      (version === undefined || session.version === version) &&
      session.user.roles.some((r) => r.role === session.activeRole),
    401,
    "登录已失效，请重新登录",
  );
  return session;
}
export async function updateProfile(
  actor: { id: string; role: Role },
  sessionId: string,
  version: number,
  input: unknown,
) {
  const p = profileSchema.parse(input);
  return db.$transaction(async (tx) => {
    const session = await validateSession(sessionId, version, tx);
    assert(
      session.userId === actor.id && session.activeRole === actor.role,
      401,
      "登录身份已变化",
    );
    assert(!session.user.mustChangePassword, 403, "请先修改密码");
    const phone = p.phone === undefined ? session.user.phone : p.phone || null;
    if (p.name !== session.user.name || phone !== session.user.phone) {
      if (phone !== session.user.phone)
        await assertAccountIdentifiers(tx, { phone }, actor.id);
      await tx.user.update({
        where: { id: actor.id },
        data: { name: p.name, phone },
      });
      await recordAudit(tx, actor, "account-profile", "Account", actor.id);
    }
    return {
      user: await safeAccount(actor.id, actor.role, tx),
      activeRole: actor.role,
    };
  });
}
export async function refreshSession(token: string, _legacyRole?: Role) {
  const stored = await db.refreshSession.findUnique({
    where: { digest: digest(token) },
  });
  assert(stored, 401, "请重新登录");
  const session = await validateSession(stored.id);
  // Restore the one server-owned identity. The cookie is stable to avoid cross-tab rotation races.
  return serializeSession(session, token);
}
export async function switchRole(id: string, role: Role) {
  const current = await validateSession(id);
  assert(!current.user.mustChangePassword, 403, "请先修改密码");
  assert(
    current.user.roles.some((r) => r.role === role),
    403,
    "没有该身份权限",
  );
  const refreshToken = randomUUID() + randomUUID();
  const next = await db.$transaction(async (tx) => {
    const updated = await tx.refreshSession.updateMany({
      where: { id, version: current.version },
      data: {
        activeRole: role,
        version: { increment: 1 },
        digest: digest(refreshToken),
      },
    });
    assert(updated.count === 1, 409, "身份已变化，请重试");
    return tx.refreshSession.findUniqueOrThrow({ where: { id } });
  });
  sessionChanged(current.userId);
  return serializeSession(next, refreshToken);
}
export async function revokeSession(token: string) {
  const session = await db.refreshSession.findUnique({
    where: { digest: digest(token) },
  });
  if (session) {
    await db.refreshSession.deleteMany({ where: { id: session.id } });
    sessionChanged(session.userId);
  }
}
const attempts = new Map<string, { count: number; until: number }>();
export async function passwordLogin(input: unknown) {
  const p = loginSchema.parse(input);
  const attempt = attempts.get("login:" + p.username);
  assert(
    !attempt || attempt.until < Date.now() || attempt.count < 10,
    429,
    "登录失败次数过多，请稍后重试",
  );
  let user = await db.user.findUnique({
    where: { username: p.username },
    include: { roles: true },
  });
  if (!user && /^1[3-9]\d{9}$/.test(p.username)) {
    const matches = await db.user.findMany({
      where: { phone: p.username },
      include: { roles: true },
      take: 2,
    });
    assert(matches.length < 2, 401, "该手机号关联多个账号，请使用账号登录");
    user = matches[0] ?? null;
  }
  const accountKey = user ? "account:" + user.id : "login:" + p.username;
  const accountAttempt = attempts.get(accountKey);
  assert(
    !accountAttempt ||
      accountAttempt.until < Date.now() ||
      accountAttempt.count < 10,
    429,
    "登录失败次数过多，请稍后重试",
  );
  const valid =
    user?.passwordHash && (await bcrypt.compare(p.password, user.passwordHash));
  if (!valid || user?.status !== "ACTIVE") {
    if (attempts.size > 10000)
      for (const [key, entry] of attempts)
        if (entry.until < Date.now()) attempts.delete(key);
    for (const key of new Set(["login:" + p.username, accountKey])) {
      const old = attempts.get(key);
      attempts.set(key, {
        count: (old && old.until > Date.now() ? old.count : 0) + 1,
        until: Date.now() + 15 * 60000,
      });
    }
    assert(false, 401, "账号或密码错误，或账号未启用");
  }
  const role =
    p.role ??
    (["USER", "MERCHANT", "ADMIN"] as Role[]).find((r) =>
      user.roles.some((g) => g.role === r),
    );
  assert(
    role && user.roles.some((r) => r.role === role),
    403,
    "没有该身份权限",
  );
  for (const identifier of [p.username, user.username, user.phone])
    if (identifier) attempts.delete("login:" + identifier);
  attempts.delete(accountKey);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return issueSession(user, role);
}
export async function register(input: unknown) {
  const p = registerSchema.parse(input);
  const passwordHash = await bcrypt.hash(p.password, 12);
  const user = await db.$transaction(async (tx) => {
    await assertAccountIdentifiers(tx, p);
    return tx.user.create({
      data: {
        username: p.username,
        phone: p.phone,
        name: p.name || p.phone,
        passwordHash,
        roles: { create: { role: "USER" } },
      },
    });
  });
  return issueSession(user, "USER");
}
export async function changePassword(
  userId: string,
  oldPassword: string,
  password: string,
  role: Role = "USER",
) {
  passwordSchema.parse(password);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assert(
    user.passwordHash && (await bcrypt.compare(oldPassword, user.passwordHash)),
    400,
    "原密码错误",
  );
  assert(
    !(await bcrypt.compare(password, user.passwordHash)),
    400,
    "新密码不能与原密码相同",
  );
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await tx.refreshSession.deleteMany({ where: { userId } });
    await recordAudit(
      tx,
      { id: userId, role },
      "account-password-change",
      "Account",
      userId,
    );
  });
  sessionChanged(userId);
}

export async function canOperateStore(
  userId: string,
  tx: Prisma.TransactionClient = db,
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  return (
    !!user &&
    user.status === "ACTIVE" &&
    user.roles.some((r) => r.role === "MERCHANT")
  );
}
