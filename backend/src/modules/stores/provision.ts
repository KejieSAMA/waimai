import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../../db";
import { assert, HttpError } from "../../http";
import { validateSession } from "../auth/service";
import {
  createAccountInTransaction,
  merchantAccountSchema,
} from "../accounts/service";
import { privateOwner } from "../uploads/service";
import { managedStoreSchema } from "./schema";
import { createManagedStore } from "./service";

const schema = z
  .object({ account: merchantAccountSchema, store: managedStoreSchema })
  .strict();
export async function provisionMerchant(
  actor: { id: string; sessionId: string; version: number },
  input: unknown,
) {
  const data = schema.parse(input);
  for (const url of [
    data.store.licenseImage,
    data.store.foodPermitImage,
  ].filter(Boolean)) {
    if ((await privateOwner(url.replace("/uploads/", ""))) !== actor.id)
      throw new HttpError(400, "请使用当前管理员上传的私有证照", {
        reason: "INVALID_QUALIFICATION",
      });
  }
  if (
    data.store.logo &&
    (await privateOwner(data.store.logo.replace("/uploads/", "")))
  )
    throw new HttpError(400, "店铺 Logo 不能使用私有证照", {
      reason: "INVALID_LOGO",
    });
  const passwordHash = await bcrypt.hash(data.account.password, 12);
  try {
    return await db.$transaction(async (tx) => {
      const session = await validateSession(actor.sessionId, actor.version, tx);
      assert(
        session.userId === actor.id && session.activeRole === "ADMIN",
        403,
        "仅管理员可创建店铺",
      );
      assert(!session.user.mustChangePassword, 403, "请先修改密码");
      assert(
        !(await tx.user.findUnique({
          where: { username: data.account.username },
          select: { id: true },
        })),
        409,
        "账号名已存在，请使用新的账号名",
      );
      const auditActor = { id: actor.id, role: "ADMIN" };
      const account = await createAccountInTransaction(
        tx,
        { ...data.account, passwordHash },
        ["MERCHANT"],
        auditActor,
      );
      const store = await createManagedStore(
        tx,
        account.id,
        data.store,
        auditActor,
      );
      return {
        account,
        store: {
          ...store,
          reviewCount: 0,
          owner: {
            id: account.id,
            name: account.name,
            username: account.username,
            mustChangePassword: true,
          },
        },
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpError(409, "账号名已存在，请核对后重试", {
        reason: "USERNAME_TAKEN",
      });
    if (
      error instanceof HttpError &&
      error.status === 409 &&
      error.message.startsWith("账号名已存在")
    )
      throw new HttpError(409, error.message, { reason: "USERNAME_TAKEN" });
    throw error;
  }
}
