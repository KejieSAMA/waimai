import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "../../db";
import { assert } from "../../http";
const schema = z.object({
  name: z.string().trim().min(1).max(40),
  sort: z.number().int().min(0).default(0),
});
export const platformCategories = () =>
  db.category.findMany({ orderBy: { sort: "asc" } });
export const categoryExists = (id: string) =>
  db.category.findUnique({ where: { id } });
export const dishCategories = (storeId: string) =>
  db.dishCategory.findMany({ where: { storeId }, orderBy: { sort: "asc" } });
export const dishCategoryExists = (
  id: string,
  storeId: string,
  tx: Prisma.TransactionClient = db,
) => tx.dishCategory.findFirst({ where: { id, storeId } });
export async function saveCategory(
  id: string | undefined,
  body: unknown,
  storeId?: string,
) {
  const data = schema.parse(body);
  if (storeId) {
    if (id) assert(await dishCategoryExists(id, storeId), 404, "分类不存在");
    return id
      ? db.dishCategory.update({ where: { id }, data })
      : db.dishCategory.create({ data: { ...data, storeId } });
  }
  if (id) assert(await categoryExists(id), 404, "类目不存在");
  return id
    ? db.category.update({ where: { id }, data })
    : db.category.create({ data });
}
export async function deleteCategory(id: string, storeId?: string) {
  if (storeId) {
    assert(await dishCategoryExists(id, storeId), 404, "分类不存在");
    assert(
      !(await db.product.count({ where: { dishCategoryId: id } })),
      409,
      "请先移动分类下的商品",
    );
    await db.dishCategory.delete({ where: { id } });
  } else {
    assert(await categoryExists(id), 404, "类目不存在");
    assert(
      !(await db.store.count({ where: { categoryId: id } })),
      409,
      "类目下仍有店铺",
    );
    await db.category.delete({ where: { id } });
  }
  return null;
}
