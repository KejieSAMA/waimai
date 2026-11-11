import { assert } from "../http";
export function productTransition(
  status: string,
  action: string,
  forcedOff = false,
): string {
  assert(!(forcedOff && action === "on"), 409, "商品需修改后重新审核");
  const transitions: Record<string, Record<string, string>> = {
    ON: { off: "OFF", "force-off": "OFF" },
    OFF: { on: "ON", "force-off": "OFF" },
    REVIEW: { approve: "ON", reject: "REJECTED", "force-off": "OFF" },
    REJECTED: { submit: "REVIEW", "force-off": "OFF" },
  };
  const next = transitions[status]?.[action];
  assert(next, 409, "商品状态不允许此操作");
  return next;
}
