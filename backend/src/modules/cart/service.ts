import { Prisma, type Cart } from "@prisma/client";
import { db } from "../../db";
import { assert } from "../../http";
import { cartProducts, displayProduct } from "../products/service";
import { cartStore } from "../stores/service";
import { ownedAddress } from "../users/service";
import { validateSession } from "../auth/service";
import { cartMergeSchema, cartWriteSchema } from "./schema";

interface Item {
  productId: string;
  qty: number;
  name: string;
  images: string;
}
export interface CartActor {
  id: string;
  sessionId: string;
  version: number;
}
const items = (cart: Cart | null): Item[] =>
  cart ? JSON.parse(cart.items) : [];
const sortedItems = (value: { productId: string; qty: number }[]) =>
  value
    .map((item) => [item.productId, item.qty])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
function same(
  cart: Cart,
  value: {
    type: string;
    addressId?: string;
    note: string;
    items: { productId: string; qty: number }[];
  },
) {
  return (
    cart.type === value.type &&
    cart.addressId === (value.addressId ?? "") &&
    cart.note === value.note &&
    JSON.stringify(sortedItems(items(cart))) ===
      JSON.stringify(sortedItems(value.items))
  );
}
export async function cartTransaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(run);
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)
      )
        continue;
      throw error;
    }
  }
}
async function authorize(actor: CartActor, tx: Prisma.TransactionClient) {
  const session = await validateSession(actor.sessionId, actor.version, tx);
  assert(
    session.userId === actor.id &&
      session.activeRole === "USER" &&
      !session.user.mustChangePassword,
    403,
    "请使用用户身份操作购物车",
  );
}
async function serialize(cart: Cart, tx: Prisma.TransactionClient) {
  const shop = await cartStore(cart.storeId, tx);
  assert(shop, 404, "店铺不存在");
  const saved = items(cart),
    products = await cartProducts(
      cart.storeId,
      saved.map((item) => item.productId),
      tx,
    );
  return {
    storeId: cart.storeId,
    revision: cart.version,
    type: cart.type,
    addressId:
      cart.addressId && (await ownedAddress(cart.addressId, cart.userId, tx))
        ? cart.addressId
        : "",
    note: cart.note,
    name: shop.name,
    logo: shop.logo,
    updatedAt: cart.updatedAt.getTime(),
    lines: saved.map((line) => {
      const p = products.find((product) => product.id === line.productId);
      return {
        qty: line.qty,
        product: p
          ? displayProduct({ ...p, rejectReason: null })
          : {
              id: line.productId,
              storeId: cart.storeId,
              dishCategoryId: "",
              name: line.name || "商品已失效",
              images: line.images,
              description: "商品暂不可购买",
              priceCents: 0,
              originalPriceCents: null,
              stock: 0,
              lowStock: 0,
              limitPerOrder: null,
              status: "OFF",
              displayStatus: "OFF",
              forcedOff: true,
              rejectReason: null,
              monthlySales: 0,
            },
      };
    }),
  };
}
export async function listCart(
  userId: string,
  tx: Prisma.TransactionClient = db,
) {
  const carts = await tx.cart.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return {
    version: 2 as const,
    carts: await Promise.all(carts.map((cart) => serialize(cart, tx))),
  };
}
export async function saveCart(
  actor: CartActor,
  storeId: string,
  body: unknown,
) {
  const input = cartWriteSchema.parse(body);
  return cartTransaction(async (tx) => {
    await authorize(actor, tx);
    const shop = await cartStore(storeId, tx);
    assert(shop, 404, "店铺不存在");
    const old = await tx.cart.findUnique({
      where: { userId_storeId: { userId: actor.id, storeId } },
    });
    if ((old?.version ?? 0) !== input.revision) {
      if (old && same(old, input)) return serialize(old, tx);
      assert(false, 409, "购物车已在其他页面更新，请重新读取");
    }
    if (input.addressId)
      assert(
        await ownedAddress(input.addressId, actor.id, tx),
        400,
        "收货地址不存在或不属于当前账号",
      );
    const previous = items(old),
      products = await cartProducts(
        storeId,
        input.items.map((item) => item.productId),
        tx,
      );
    const saved: Item[] = [];
    for (const line of input.items) {
      const p = products.find((product) => product.id === line.productId),
        before = previous.find((item) => item.productId === line.productId);
      assert(p || before, 400, "商品不存在或不属于该店铺");
      if (line.qty > (before?.qty ?? 0)) {
        assert(shop.status === "OPEN", 409, "店铺当前无法加购");
        assert(p?.status === "ON" && !p.forcedOff, 409, "商品已下架");
        assert(
          line.qty <= p.stock &&
            (!p.limitPerOrder || line.qty <= p.limitPerOrder),
          409,
          "商品库存或限购数量不足",
        );
      }
      saved.push({
        ...line,
        name: p?.name ?? before!.name,
        images: p?.images ?? before!.images,
      });
    }
    const data = {
      type: input.type,
      addressId: input.addressId,
      note: input.note,
      items: JSON.stringify(saved),
    };
    const result = old
      ? await tx.cart.update({
          where: { id: old.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.cart.create({ data: { ...data, userId: actor.id, storeId } });
    return serialize(result, tx);
  });
}
export async function mergeCart(actor: CartActor, body: unknown) {
  const input = cartMergeSchema.parse(body);
  return cartTransaction(async (tx) => {
    await authorize(actor, tx);
    const receipt = await tx.cartMerge.findUnique({
      where: { guestId: input.guestId },
    });
    if (receipt)
      return {
        snapshot: await listCart(actor.id, tx),
        issues:
          receipt.userId === actor.id
            ? (JSON.parse(receipt.issues) as string[])
            : ["这份游客购物车已合并，未重复加入当前账号"],
      };
    const issues: string[] = [];
    for (const draft of input.carts) {
      const shop = await cartStore(draft.storeId, tx);
      if (!shop || shop.status !== "OPEN") {
        issues.push("部分店铺不可用，未合并其游客商品");
        continue;
      }
      const old = await tx.cart.findUnique({
        where: { userId_storeId: { userId: actor.id, storeId: draft.storeId } },
      });
      const saved = items(old),
        products = await cartProducts(
          draft.storeId,
          draft.items.map((item) => item.productId),
          tx,
        );
      for (const line of draft.items) {
        const p = products.find((product) => product.id === line.productId);
        if (!p || p.status !== "ON" || p.forcedOff) {
          issues.push("部分商品已失效，未合并");
          continue;
        }
        const before = saved.find((item) => item.productId === p.id),
          quantity = before?.qty ?? 0;
        const ceiling = Math.min(999, p.stock, p.limitPerOrder ?? 999);
        const next = Math.max(quantity, Math.min(ceiling, quantity + line.qty));
        if (next < quantity + line.qty)
          issues.push(`${p.name} 已按库存或限购调整合并数量`);
        if (before) before.qty = next;
        else if (next && saved.length < 100)
          saved.push({
            productId: p.id,
            qty: next,
            name: p.name,
            images: p.images,
          });
        else if (saved.length >= 100)
          issues.push("单店商品种类已达上限，部分游客商品未合并");
      }
      if (old)
        await tx.cart.update({
          where: { id: old.id },
          data: { items: JSON.stringify(saved), version: { increment: 1 } },
        });
      else if (saved.length)
        await tx.cart.create({
          data: {
            userId: actor.id,
            storeId: draft.storeId,
            type: draft.type,
            note: draft.note,
            items: JSON.stringify(saved),
          },
        });
    }
    const messages = [...new Set(issues)];
    await tx.cartMerge.create({
      data: {
        guestId: input.guestId,
        userId: actor.id,
        issues: JSON.stringify(messages),
      },
    });
    return { snapshot: await listCart(actor.id, tx), issues: messages };
  });
}

export async function checkOrderCart(
  userId: string,
  input: {
    storeId: string;
    cartRevision?: number;
    type: string;
    addressId?: string;
    note: string;
    items: { productId: string; qty: number }[];
  },
  tx: Prisma.TransactionClient,
) {
  if (input.cartRevision === undefined) return;
  const cart = await tx.cart.findUnique({
    where: { userId_storeId: { userId, storeId: input.storeId } },
  });
  const addressId =
    cart?.addressId && (await ownedAddress(cart.addressId, userId, tx))
      ? cart.addressId
      : "";
  assert(
    cart &&
      cart.version === input.cartRevision &&
      same({ ...cart, addressId }, input),
    409,
    "购物车已更新，请核对最新商品后提交",
  );
}
export async function consumeOrderCart(
  userId: string,
  storeId: string,
  revision: number | undefined,
  tx: Prisma.TransactionClient,
) {
  if (revision === undefined) return;
  const updated = await tx.cart.updateMany({
    where: { userId, storeId, version: revision },
    data: { items: "[]", note: "", version: { increment: 1 } },
  });
  assert(updated.count === 1, 409, "购物车已更新，请重新提交");
}
