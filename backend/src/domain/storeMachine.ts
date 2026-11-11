import { assert } from "../http";
export function storeTransition(
  status: string,
  action: string,
  previous = "CLOSED",
): string {
  const transitions: Record<string, Record<string, string>> = {
    PENDING: { approve: "OPEN", reject: "REJECTED" },
    REJECTED: { submit: "PENDING" },
    OPEN: { close: "CLOSED", freeze: "FROZEN" },
    CLOSED: { open: "OPEN", freeze: "FROZEN" },
    FROZEN: { unfreeze: previous },
  };
  const next = transitions[status]?.[action];
  assert(next, 409, "商家状态不允许此操作");
  return next;
}
