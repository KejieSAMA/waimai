import bcrypt from "bcryptjs";
import { db } from "../src/db";

async function seed() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const merchantHash = await bcrypt.hash("merchant123", 12);
  await db.user.upsert({
    where: { phone: "admin" },
    update: {},
    create: {
      phone: "admin",
      name: "运营管理员",
      role: "ADMIN",
      passwordHash: adminHash,
    },
  });
  const user = await db.user.upsert({
    where: { phone: "13900000001" },
    update: {},
    create: { phone: "13900000001", name: "小王", role: "USER" },
  });
  await db.address.upsert({
    where: { id: "seed-address" },
    update: {},
    create: {
      id: "seed-address",
      userId: user.id,
      contact: "王先生",
      phone: "13900000001",
      detail: "北京市朝阳区望京 SOHO T1 1208",
      isDefault: true,
    },
  });
  const categories = [
    "快餐便当",
    "米粉面馆",
    "奶茶饮品",
    "烧烤夜宵",
    "甜品",
    "粥粉面点",
    "轻食沙拉",
    "地方菜",
  ];
  for (const [sort, name] of categories.entries())
    await db.category.upsert({
      where: { id: `category-${sort}` },
      update: {},
      create: { id: `category-${sort}`, name, sort },
    });
  const samples = [
    {
      name: "老张家牛肉面（望京店）",
      rating: 4.8,
      sales: 3000,
      fee: 300,
      min: 2000,
      category: 1,
      status: "OPEN",
    },
    {
      name: "阿香米线",
      rating: 4.6,
      sales: 1500,
      fee: 0,
      min: 1500,
      category: 1,
      status: "OPEN",
    },
    {
      name: "一碗好粥",
      rating: 4.7,
      sales: 2200,
      fee: 200,
      min: 1500,
      category: 5,
      status: "OPEN",
    },
    {
      name: "川味小厨",
      rating: 4.5,
      sales: 1800,
      fee: 300,
      min: 2500,
      category: 7,
      status: "OPEN",
    },
    {
      name: "江南小笼",
      rating: 4.8,
      sales: 960,
      fee: 200,
      min: 2000,
      category: 5,
      status: "OPEN",
    },
    {
      name: "鲜果茶研所",
      rating: 4.7,
      sales: 4100,
      fee: 0,
      min: 1500,
      category: 2,
      status: "OPEN",
    },
    {
      name: "东北饺子馆",
      rating: 4.6,
      sales: 1300,
      fee: 300,
      min: 2000,
      category: 0,
      status: "OPEN",
    },
    {
      name: "轻食沙拉实验室",
      rating: 4.4,
      sales: 700,
      fee: 400,
      min: 2500,
      category: 6,
      status: "OPEN",
    },
    {
      name: "深夜烧烤研究所",
      rating: 4.7,
      sales: 800,
      fee: 400,
      min: 3000,
      category: 3,
      status: "CLOSED",
    },
    {
      name: "甜蜜工坊",
      rating: 4.5,
      sales: 300,
      fee: 200,
      min: 2000,
      category: 4,
      status: "FROZEN",
    },
    {
      name: "巷口小馆",
      rating: 5,
      sales: 0,
      fee: 300,
      min: 2000,
      category: 0,
      status: "PENDING",
    },
    {
      name: "好味轻食",
      rating: 5,
      sales: 0,
      fee: 200,
      min: 2000,
      category: 6,
      status: "PENDING",
    },
  ];
  for (const [index, sample] of samples.entries()) {
    const phone = `1380000${String(index + 1).padStart(4, "0")}`;
    const owner = await db.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        name: sample.name,
        role: "MERCHANT",
        passwordHash: merchantHash,
      },
    });
    const store = await db.store.upsert({
      where: { ownerId: owner.id },
      update: {},
      create: {
        id: `store-${index}`,
        ownerId: owner.id,
        name: sample.name,
        categoryId: `category-${sample.category}`,
        contactPhone: phone,
        address: `北京市朝阳区望京街道 ${index + 1} 号`,
        status: sample.status,
        rating: sample.rating,
        monthlySales: sample.sales,
        minOrderCents: sample.min,
        deliveryFeeCents: sample.fee,
        notice: index === 8 ? "17:00 开始营业" : "用心做好每一餐",
        previousStatus: "OPEN",
        frozenReason: sample.status === "FROZEN" ? "证照信息待核验" : null,
      },
    });
    const dishCategory = await db.dishCategory.upsert({
      where: { id: `dish-category-${index}` },
      update: {},
      create: {
        id: `dish-category-${index}`,
        storeId: store.id,
        name: "招牌推荐",
        sort: 0,
      },
    });
    const dishes =
      index === 0
        ? ([
            ["招牌红烧牛肉面", 2800],
            ["番茄牛腩面", 3200],
            ["酸菜牛肉面", 2600],
            ["凉拌黄瓜", 800],
            ["卤蛋", 300],
            ["冰镇酸梅汤", 600],
          ] as const)
        : ([
            [`${sample.name}招牌套餐`, 2800],
            ["人气双拼套餐", 3500],
            ["清爽小菜", 800],
          ] as const);
    for (const [position, [name, priceCents]] of dishes.entries())
      await db.product.upsert({
        where: { id: `product-${index}-${position}` },
        update: {},
        create: {
          id: `product-${index}-${position}`,
          storeId: store.id,
          dishCategoryId: dishCategory.id,
          name,
          priceCents,
          stock: position === 5 ? 0 : 100,
          monthlySales: 1200 - position * 100,
          description: "每日现做，食材新鲜",
        },
      });
    await db.promotion.upsert({
      where: { id: `promotion-${index}` },
      update: {},
      create: {
        id: `promotion-${index}`,
        storeId: store.id,
        thresholdCents: 3000,
        discountCents: 500,
      },
    });
  }
  for (const [index, status] of [
    "PENDING",
    "PREPARING",
    "DELIVERING",
    "PICKUP",
    "DONE",
    "REFUNDING",
  ].entries()) {
    await db.order.upsert({
      where: { orderNo: `seed-order-${index}` },
      update: {},
      create: {
        orderNo: `seed-order-${index}`,
        serialOfDay: index + 1,
        userId: user.id,
        storeId: "store-0",
        type: status === "PICKUP" ? "PICKUP" : "DELIVERY",
        status,
        itemsCents: 3100,
        deliveryFeeCents: 300,
        discountCents: 500,
        payCents: 2900,
        paidAt: new Date(),
        note: "少放辣椒",
        addressSnapshot: JSON.stringify({
          contact: "王先生",
          phone: "13900000001",
          detail: "望京 SOHO T1 1208",
        }),
        refundFromStatus: status === "REFUNDING" ? "PREPARING" : null,
        refundReason: status === "REFUNDING" ? "临时有事无法用餐" : null,
        items: {
          create: [
            {
              productId: "product-0-0",
              nameSnapshot: "招牌红烧牛肉面",
              priceCentsSnapshot: 2800,
              qty: 1,
            },
            {
              productId: "product-0-4",
              nameSnapshot: "卤蛋",
              priceCentsSnapshot: 300,
              qty: 1,
            },
          ],
        },
      },
    });
  }
}
seed()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    process.stderr.write(String(error) + "\n");
    await db.$disconnect();
    process.exit(1);
  });
