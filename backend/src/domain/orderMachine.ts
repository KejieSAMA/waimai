import { assert } from "../http";
export function orderTransition(
  status: string,
  action: string,
  type: string,
): string {
  const transitions: Record<string, Record<string, string>> = {
    PENDING_PAY: { pay: "PENDING", cancel: "CANCELLED" },
    PENDING: {
      accept: "PREPARING",
      reject: "CANCELLED",
      cancel: "CANCELLED",
      refund: "REFUNDING",
    },
    PREPARING: {
      ready: type === "PICKUP" ? "PICKUP" : "DELIVERING",
      refund: "REFUNDING",
    },
    DELIVERING: { complete: "DONE", arrive: "DONE", refund: "REFUNDING" },
    PICKUP: { complete: "DONE", refund: "REFUNDING" },
    REFUNDING: { "refund-approve": "CANCELLED" },
  };
  const next = transitions[status]?.[action];
  assert(next, 409, "订单状态不允许此操作");
  return next;
}
