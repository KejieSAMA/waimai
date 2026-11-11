import { describe, expect, it } from "vitest";
import { storeTransition } from "./storeMachine";
import { productTransition } from "./productMachine";
import { orderTransition } from "./orderMachine";
describe("领域状态机", () => {
  it("解冻恢复原状态", () =>
    expect(storeTransition("FROZEN", "unfreeze", "CLOSED")).toBe("CLOSED"));
  it("强制下架后禁止商家上架", () =>
    expect(() => productTransition("OFF", "on", true)).toThrow());
  it("外卖与自提出餐进入对应状态", () => {
    expect(orderTransition("PREPARING", "ready", "DELIVERY")).toBe(
      "DELIVERING",
    );
    expect(orderTransition("PREPARING", "ready", "PICKUP")).toBe("PICKUP");
  });
  it("拒绝非法流转", () =>
    expect(() => orderTransition("DONE", "pay", "DELIVERY")).toThrow());
});
