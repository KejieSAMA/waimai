import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { Order, OrderStatus } from "@waimai/shared";
import { createBrowsingMemory } from "./browsingMemory";
import {
  mobileOrderActions,
  useGoodsDisclosure,
  useNoteDraft,
} from "./purchaseUi";

describe("手机购买清单", () => {
  it.each([1, 3, 6, 24])("%i 行默认最多显示三行，不按件数截断", (count) => {
    const scope = effectScope();
    const rows = ref(
      Array.from({ length: count }, (_, i) => ({ id: i, qty: 20 })),
    );
    const state = scope.run(() => useGoodsDisclosure(ref("a"), rows))!;
    expect(state.visible.value.length).toBe(Math.min(3, count));
    expect(state.canToggle.value).toBe(count > 3);
    state.toggle();
    expect(state.visible.value.length).toBe(count);
    scope.stop();
  });
  it("调整数量和报价不收起；换店回到三行；异常商品自动展开且不能被隐藏", async () => {
    const scope = effectScope(),
      key = ref("a"),
      issue = ref(false);
    const rows = ref([1, 2, 3, 4, 5, 6]);
    const state = scope.run(() =>
      useGoodsDisclosure(key, rows, () => issue.value),
    )!;
    state.toggle();
    rows.value = [...rows.value];
    await nextTick();
    expect(state.visible.value).toHaveLength(6);
    key.value = "b";
    await nextTick();
    expect(state.visible.value).toHaveLength(3);
    issue.value = true;
    await nextTick();
    expect(state.visible.value).toHaveLength(6);
    state.toggle();
    expect(state.visible.value).toHaveLength(6);
    issue.value = false;
    await nextTick();
    state.toggle();
    expect(state.visible.value).toHaveLength(6);
    scope.stop();
  });
  it("备注草稿取消不写回，保存只写当前店铺，提交期间不能覆盖", () => {
    const carts = { a: "少辣", b: "不要葱" };
    let key: "a" | "b" = "a",
      locked = false;
    const state = useNoteDraft(
      () => carts[key],
      (v) => {
        carts[key] = v;
      },
      () => locked,
    );
    state.begin();
    state.draft.value = "新备注";
    expect(carts.a).toBe("少辣");
    state.cancel();
    expect(carts.a).toBe("少辣");
    key = "b";
    state.begin();
    expect(state.draft.value).toBe("不要葱");
    state.draft.value = "自提备注";
    locked = true;
    state.save();
    expect(carts.b).toBe("不要葱");
    locked = false;
    state.save();
    expect(carts.b).toBe("自提备注");
    expect(carts.a).toBe("少辣");
    state.begin();
    state.draft.value = "字".repeat(301);
    state.save();
    expect(carts.b.length).toBe(300);
  });
});
describe("浏览返回状态", () => {
  it("首页和各店独立恢复，换账号清理，旧页面迟到写入无效，新文档无记录", () => {
    const memory = createBrowsingMemory(),
      owner = memory.forOwner(1);
    owner.write("home", {
      category: "c",
      keyword: "面",
      sort: "sales",
      top: 920,
    });
    owner.write("store:a", {
      view: "dishes",
      category: "c",
      keyword: "牛肉",
      dishesTop: 180,
    });
    owner.write("store:b", { view: "store", sectionTop: 22 });
    expect(memory.forOwner(1).read("home")).toEqual({
      category: "c",
      keyword: "面",
      sort: "sales",
      top: 920,
    });
    expect(memory.forOwner(1).read("store:a")).toHaveProperty("dishesTop", 180);
    const next = memory.forOwner(2);
    expect(next.read("home")).toBeUndefined();
    owner.write("home", "late");
    expect(next.read("home")).toBeUndefined();
    expect(createBrowsingMemory().forOwner(2).read("home")).toBeUndefined();
  });
});
describe("手机订单操作层级", () => {
  it.each([
    "PENDING_PAY",
    "PENDING",
    "PREPARING",
    "DELIVERING",
    "PICKUP",
    "DONE",
    "CANCELLED",
    "REFUNDING",
  ] as OrderStatus[])("%s 最多两按钮和一个主操作", (status) => {
    const actions = mobileOrderActions({
      status,
      id: "order",
      orderNo: "no",
      serialOfDay: 1,
      storeId: "store",
      type: "DELIVERY",
      items: [],
      itemsCents: 0,
      deliveryFeeCents: 0,
      discountCents: 0,
      payCents: 0,
      createdAt: new Date(0).toISOString(),
      note: "",
      refundReason: null,
      refundRejected: false,
      disputed: false,
      addressSnapshot: "{}",
      store: {} as Order["store"],
    } as Order);
    expect(actions.length).toBeLessThanOrEqual(2);
    expect(actions.filter((a) => a.primary).length).toBeLessThanOrEqual(1);
    if (status === "DONE")
      expect(actions.map((a) => a.key)).toEqual(["evaluate", "reorder"]);
    if (status === "PENDING_PAY")
      expect(actions[0]).toMatchObject({
        key: "details",
        label: "提交订单",
        primary: true,
      });
  });
});
