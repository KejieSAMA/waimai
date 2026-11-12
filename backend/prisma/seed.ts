import { db } from "../src/db";
// Only platform categories are initialized, never demo accounts or operational data.
async function seed() {
  const names = [
    "快餐便当",
    "米粉面馆",
    "奶茶饮品",
    "烧烤夜宵",
    "甜品",
    "粥粉面点",
    "轻食沙拉",
    "地方菜",
  ];
  for (const [sort, name] of names.entries()) {
    if (!(await db.category.findFirst({ where: { name } })))
      await db.category.create({ data: { name, sort } });
  }
}
seed().finally(() => db.$disconnect());
