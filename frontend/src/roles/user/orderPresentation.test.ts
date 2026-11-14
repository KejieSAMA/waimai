import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { Order, OrderActivity, OrderStatus } from "@waimai/shared";
import { orderPresentation } from "./orderPresentation";
import { remainingPaymentSeconds, usePaymentClock } from "./paymentClock";
const order = (status: OrderStatus, extras: Partial<Order> = {}): Order => ({
  id: "o",
  status,
  orderNo: "long-order-number",
  store: { name: "店铺", address: "门店地址" } as Order["store"],
  type: "DELIVERY",
  items: [
    {
      id: "i",
      productId: "p",
      nameSnapshot: "商品快照",
      qty: 2,
      priceCentsSnapshot: 100,
      lineTotalCents: 200,
    },
  ],
  itemsCents: 200,
  deliveryFeeCents: 0,
  discountCents: 0,
  payCents: 200,
  note: "",
  addressSnapshot: JSON.stringify({
    contact: "张先生",
    phone: "13812345678",
    detail: "街道 1 号",
  }),
  createdAt: "2026-11-14T00:00:00Z",
  refundReason: null,
  refundRejected: false,
  disputed: false,
  review: null,
  storeId: "s",
  serialOfDay: 1,
  ...extras,
});
describe("PC 订单展示模型", () => {
  it.each([
    ["PENDING_PAY", "应付金额"],
    ["PENDING", "实付金额"],
    ["PREPARING", "实付金额"],
    ["DELIVERING", "实付金额"],
    ["PICKUP", "实付金额"],
    ["DONE", "实付金额"],
    ["CANCELLED", "订单金额"],
    ["REFUNDING", "实付金额"],
  ] as const)("%s 的金额标签为 %s", (status, label) => {
    const v = orderPresentation(order(status));
    expect(v.amountLabel).toBe(label);
    expect(v.listActions.filter((a) => a.primary).length).toBeLessThanOrEqual(
      1,
    );
    expect(v.detailActions.filter((a) => a.primary).length).toBeLessThanOrEqual(
      1,
    );
  });
  it.each([
    ["PENDING_PAY", ["pay", "cancel"]],
    ["PENDING", ["cancel", "refund"]],
    ["PREPARING", ["refund"]],
    ["DELIVERING", ["complete", "refund"]],
    ["PICKUP", ["complete", "refund"]],
    ["DONE", ["evaluate"]],
    ["CANCELLED", []],
    ["REFUNDING", []],
  ] as const)("%s 只显示真实可用的详情操作", (status, keys) =>
    expect(
      orderPresentation(order(status)).detailActions.map((a) => a.key),
    ).toEqual(keys),
  );
  it("已评价不再显示评价，列表再来一单及查看保持次级", () => {
    const v = orderPresentation(order("DONE", { review: { id: "r" } }));
    expect(v.detailActions).toEqual([]);
    expect(v.listActions.map((a) => a.key)).toEqual(["details", "reorder"]);
    expect(v.listActions.every((a) => !a.primary)).toBe(true);
  });
  it("待支付列表只导航去支付，不新增直接付款操作", () =>
    expect(orderPresentation(order("PENDING_PAY")).listActions).toEqual([
      { key: "details", label: "去支付", primary: true },
    ]));
  it("退款拒绝与平台处理中以真实标识显示，不伪造正常进度或退款到账", () => {
    const rejected = orderPresentation(
      order("REFUNDING", { refundRejected: true }),
    );
    expect(rejected.description).toContain("拒绝");
    expect(rejected.detailActions[0].key).toBe("dispute");
    const disputed = orderPresentation(
      order("REFUNDING", { refundRejected: true, disputed: true }),
    );
    expect(disputed.description).toContain("平台正在处理");
    expect(disputed.detailActions).toEqual([]);
    expect(disputed.steps).toEqual([]);
    expect(orderPresentation(order("CANCELLED")).steps).toEqual([]);
  });
  it("配送和自提正常进度分别映射，包含完成节点", () => {
    const delivery = orderPresentation(order("DELIVERING"));
    const pickup = orderPresentation(order("PICKUP", { type: "PICKUP" }));
    expect(delivery.progress).toBe(3);
    expect(delivery.steps[3].title).toBe("配送中");
    expect(pickup.steps[3].title).toBe("待自提");
    expect(orderPresentation(order("DONE")).progress).toBe(4);
  });
  it("零配送显示免配送费，无优惠和无备注不显示占位", () => {
    const v = orderPresentation(order("PENDING"));
    expect(v.fees).toEqual([
      { label: "商品小计", value: "¥2" },
      { label: "配送费", value: "免配送费" },
    ]);
    expect(v.deliveryInfo.some((i) => i.label === "订单备注")).toBe(false);
    expect(v.quantity).toBe(2);
  });
  it("费用来自订单快照，优惠单独标注负数，不重算金额", () => {
    const v = orderPresentation(
      order("PENDING", {
        deliveryFeeCents: 300,
        discountCents: 150,
        payCents: 999,
        note: "长备注",
      }),
    );
    expect(v.fees[1].value).toBe("¥3");
    expect(v.fees[2].value).toBe("-¥1.5");
    expect(v.deliveryInfo.at(-1)?.value).toBe("长备注");
  });
  it("历史地址损坏、空值或数组不抛错，自提不用收货信息，手机只显示尾号", () => {
    expect(orderPresentation(order("PENDING")).deliveryInfo[1].value).toBe(
      "张先生 · 尾号 5678",
    );
    for (const addressSnapshot of ["broken", "null", "[]"])
      expect(() =>
        orderPresentation(order("PENDING", { addressSnapshot })),
      ).not.toThrow();
    expect(
      orderPresentation(order("PICKUP", { type: "PICKUP" })).deliveryInfo,
    ).toEqual([
      { label: "配送方式", value: "到店自提" },
      { label: "自提地址", value: "门店地址" },
    ]);
  });
});
describe("PC 待支付倒计时", () => {
  const scopes: ReturnType<typeof effectScope>[] = [];
  afterEach(() => scopes.splice(0).forEach((s) => s.stop()));
  it("使用服务端期限并在等于截止时到期，不为缺失或无效日期补造期限", () => {
    expect(
      remainingPaymentSeconds(
        "2026-11-14T00:00:01Z",
        Date.parse("2026-11-14T00:00:00.001Z"),
      ),
    ).toBe(1);
    expect(
      remainingPaymentSeconds(
        "2026-11-14T00:00:01Z",
        Date.parse("2026-11-14T00:00:01Z"),
      ),
    ).toBe(0);
    expect(remainingPaymentSeconds(undefined, 0)).toBeUndefined();
    expect(remainingPaymentSeconds("bad", 0)).toBeUndefined();
  });
  it("仅可见待支付状态计时，到期仅刷新一次，结束、换单和卸载清理", async () => {
    let now = 0,
      visible = true;
    const ticks = new Set<() => void>(),
      listeners = new Set<() => void>();
    const activity: OrderActivity = {
      now: () => now,
      visible: () => visible,
      every: (fn) => {
        ticks.add(fn);
        return () => {
          ticks.delete(fn);
        };
      },
      listen: (fn) => {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
      later: () => () => {},
    };
    const target = ref<Order | undefined>(
      order("PENDING_PAY", { paymentExpiresAt: new Date(3000).toISOString() }),
    );
    const refresh = vi.fn(),
      scope = effectScope();
    scopes.push(scope);
    const c = scope.run(() => usePaymentClock(target, activity, refresh))!;
    expect(c.text.value).toBe("00:03");
    expect(ticks.size).toBe(1);
    visible = false;
    listeners.forEach((f) => f());
    expect(ticks.size).toBe(0);
    now = 3000;
    visible = true;
    listeners.forEach((f) => f());
    expect(c.expired.value).toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
    listeners.forEach((f) => f());
    expect(refresh).toHaveBeenCalledOnce();
    target.value = order("PENDING_PAY", {
      id: "next",
      paymentExpiresAt: new Date(9000).toISOString(),
    });
    await nextTick();
    expect(c.text.value).toBe("00:06");
    expect(ticks.size).toBe(1);
    target.value = order("DONE");
    await nextTick();
    expect(ticks.size).toBe(0);
    scope.stop();
    expect(listeners.size).toBe(0);
  });
});
