import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "../../db";
import { assert, pagination, pageResult } from "../../http";
import { recordAudit, auditLogs } from "../audit/service";
import { freezeForAccount } from "../stores/service";
import { sessionChanged } from "../auth/events";
import {
  roleSchema,
  usernameSchema,
  passwordSchema,
  contactSchema,
} from "../auth/schema";
const fields = z.object({
  name: z.string().trim().min(1).max(30),
  phone: contactSchema,
});
export const merchantAccountSchema = fields
  .extend({ username: usernameSchema, password: passwordSchema })
  .strict();
export const createSchema = fields
  .extend({
    username: usernameSchema,
    password: passwordSchema,
    roles: z.array(roleSchema).min(1).max(3),
  })
  .strict();
const publicSelect = {
  id: true,
  username: true,
  name: true,
  phone: true,
  status: true,
  roles: true,
  mustChangePassword: true,
  createdAt: true,
  lastLoginAt: true,
} as const;
type Actor = { id: string; role: string };
export async function createAccountInTransaction(
  tx: Prisma.TransactionClient,
  data: {
    username: string;
    name: string;
    phone?: string | null;
    passwordHash: string;
  },
  roles: ("USER" | "MERCHANT" | "ADMIN")[],
  actor: Actor,
) {
  const user = await tx.user.create({
    data: {
      username: data.username,
      name: data.name,
      phone: data.phone || null,
      passwordHash: data.passwordHash,
      status: "ACTIVE",
      mustChangePassword: true,
      roles: { create: [...new Set(roles)].map((role) => ({ role })) },
    },
  });
  await recordAudit(tx, actor, "account-create", "Account", user.id);
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    roles: [...new Set(roles)],
    createdAt: user.createdAt,
  };
}
export async function list(query: Record<string, unknown>) {
  const p = pagination(query);
  const role = roleSchema.optional().parse(query.role || undefined);
  const status = z
    .enum(["ACTIVE", "DISABLED"])
    .optional()
    .parse(query.status || undefined);
  const where: Prisma.UserWhereInput = {
    status,
    ...(role ? { roles: { some: { role } } } : {}),
    ...(p.keyword
      ? {
          OR: [
            { username: { contains: p.keyword } },
            { name: { contains: p.keyword } },
          ],
        }
      : {}),
  };
  const [rows, total] = await db.$transaction([
    db.user.findMany({
      where,
      select: publicSelect,
      skip: p.skip,
      take: p.take,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    db.user.count({ where }),
  ]);
  return pageResult(
    rows.map((u) => ({
      ...u,
      roles: u.roles.map((r) => r.role),
      phone: u.phone ? "尾号 " + u.phone.slice(-4) : "",
    })),
    total,
    p,
  );
}
export async function detail(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: publicSelect,
  });
  assert(user, 404, "账号不存在");
  return { ...user, roles: user.roles.map((r) => r.role) };
}
export async function create(input: unknown, actor: Actor) {
  const p = createSchema.parse(input);
  const passwordHash = await bcrypt.hash(p.password, 12);
  const user = await db.$transaction(async (tx) => {
    return createAccountInTransaction(
      tx,
      { ...p, passwordHash },
      p.roles,
      actor,
    );
  });
  return detail(user.id);
}
export async function update(
  id: string,
  action: string,
  input: unknown,
  actor: Actor,
) {
  const edit = action === "edit" ? fields.strict().parse(input) : undefined;
  const roleList =
    action === "roles"
      ? z
          .object({ roles: z.array(roleSchema).min(1).max(3) })
          .strict()
          .parse(input).roles
      : undefined;
  const status =
    action === "status"
      ? z
          .object({ status: z.enum(["ACTIVE", "DISABLED"]) })
          .strict()
          .parse(input).status
      : undefined;
  const password =
    action === "password"
      ? z.object({ password: passwordSchema }).strict().parse(input).password
      : undefined;
  assert(
    ["edit", "roles", "status", "password"].includes(action),
    400,
    "操作无效",
  );
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  await db.$transaction(async (tx) => {
    const old = await tx.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    assert(old, 404, "账号不存在");
    const previous = old.roles.map((r) => r.role);
    const nextRoles = [...new Set(roleList ?? previous)];
    const nextStatus = status ?? old.status;
    assert(
      !(
        id === actor.id &&
        (nextStatus !== "ACTIVE" || !nextRoles.includes("ADMIN"))
      ),
      409,
      "不能停用自己或撤销自己的管理员身份",
    );
    if (
      previous.includes("ADMIN") &&
      old.status === "ACTIVE" &&
      (nextStatus !== "ACTIVE" || !nextRoles.includes("ADMIN"))
    ) {
      const admins = await tx.user.count({
        where: { status: "ACTIVE", roles: { some: { role: "ADMIN" } } },
      });
      assert(admins > 1, 409, "必须保留一个启用的管理员");
    }
    if (nextStatus === "ACTIVE")
      assert(passwordHash || old.passwordHash, 409, "请先重置密码再启用账号");
    if (roleList) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: nextRoles.map((role) => ({ userId: id, role })),
      });
    }
    await tx.user.update({
      where: { id },
      data: {
        ...(edit ? { name: edit.name, phone: edit.phone || null } : {}),
        ...(status ? { status } : {}),
        ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
      },
    });
    if (action !== "edit")
      await tx.refreshSession.deleteMany({ where: { userId: id } });
    if (
      previous.includes("MERCHANT") &&
      (nextStatus === "DISABLED" || !nextRoles.includes("MERCHANT"))
    )
      await freezeForAccount(tx, id, actor);
    await recordAudit(
      tx,
      actor,
      "account-" + action,
      "Account",
      id,
      roleList ? nextRoles.join(",") : status,
    );
  });
  sessionChanged(id);
  return detail(id);
}
export async function initializeAdmin(
  username: string,
  password: string,
  recover = false,
) {
  username = usernameSchema.parse(username);
  passwordSchema.parse(password);
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    const active = await tx.user.count({
      where: { status: "ACTIVE", roles: { some: { role: "ADMIN" } } },
    });
    assert(recover || active === 0, 409, "已有启用管理员，不能重复初始化");
    const existing = await tx.user.findUnique({
      where: { username },
      include: { roles: true },
    });
    assert(
      !recover || existing?.roles.some((r) => r.role === "ADMIN"),
      404,
      "待恢复的管理员不存在",
    );
    assert(recover || !existing, 409, "账号名已存在，请使用新的账号名");
    const user = recover
      ? await tx.user.update({
          where: { id: existing!.id },
          data: { passwordHash, status: "ACTIVE", mustChangePassword: true },
        })
      : await tx.user.create({
          data: {
            username,
            name: "管理员",
            passwordHash,
            roles: { create: { role: "ADMIN" } },
          },
        });
    await tx.refreshSession.deleteMany({ where: { userId: user.id } });
    await recordAudit(
      tx,
      { id: "server-console", role: "SYSTEM" },
      recover ? "account-recover" : "account-bootstrap",
      "Account",
      user.id,
    );
  });
}

export async function audit(id: string) {
  await detail(id);
  const records = await auditLogs("Account", id);
  const actors = await db.user.findMany({
    where: { id: { in: [...new Set(records.map((r) => r.actorId))] } },
    select: { id: true, name: true },
  });
  return records.map((record) => ({
    ...record,
    actorName:
      actors.find((a) => a.id === record.actorId)?.name ??
      (record.actorRole === "SYSTEM" ? "服务器操作" : "历史操作者"),
  }));
}
