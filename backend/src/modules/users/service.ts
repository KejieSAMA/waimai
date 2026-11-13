import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "../../db";
import { assert } from "../../http";
import { phoneSchema } from "../auth/schema";
const addressSchema = z.object({
  contact: z.string().trim().min(1).max(30),
  phone: phoneSchema,
  detail: z.string().trim().min(2).max(200),
  isDefault: z.boolean().default(false),
});
export const listAddresses = (userId: string) =>
  db.address.findMany({ where: { userId }, orderBy: { isDefault: "desc" } });
export const ownedAddress = (
  id: string,
  userId: string,
  tx: Prisma.TransactionClient = db,
) => tx.address.findFirst({ where: { id, userId } });
export async function saveAddress(
  userId: string,
  id: string | undefined,
  body: unknown,
) {
  const data = addressSchema.parse(body);
  return db.$transaction(async (tx) => {
    if (id)
      assert(
        await tx.address.findFirst({ where: { id, userId } }),
        404,
        "地址不存在",
      );
    if (data.isDefault)
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    return id
      ? tx.address.update({ where: { id }, data })
      : tx.address.create({ data: { ...data, userId } });
  });
}
export async function deleteAddress(userId: string, id: string) {
  assert(await ownedAddress(id, userId), 404, "地址不存在");
  await db.address.delete({ where: { id } });
  return null;
}
