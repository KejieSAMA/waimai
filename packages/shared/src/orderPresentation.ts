import { money, orderStatuses, phoneTail, type Order } from "./index";
export type OrderUiAction =
  | "details"
  | "evaluate"
  | "reorder"
  | "pay"
  | "cancel"
  | "complete"
  | "refund"
  | "dispute";
export interface OrderAction {
  key: OrderUiAction;
  label: string;
  primary: boolean;
}
const action = (
  key: OrderUiAction,
  label: string,
  primary = false,
): OrderAction => ({ key, label, primary });
export function orderPresentation(order: Order) {
  const state = orderStatuses[order.status];
  const pickup = order.type === "PICKUP";
  const description =
    order.status === "REFUNDING"
      ? order.disputed
        ? "平台正在处理退款申请"
        : order.refundRejected
          ? "商家已拒绝退款，可申请平台介入"
          : "等待商家处理退款申请"
      : {
          PENDING_PAY: "请在支付期限内完成模拟支付",
          PENDING: "订单已支付，等待商家接单",
          PREPARING: "商家正在准备商品",
          DELIVERING: "商品正在配送，请留意收货",
          PICKUP: "商品已备好，请到店自提",
          DONE: "订单已完成，感谢惠顾",
          CANCELLED: "订单已取消",
        }[order.status];
  const amountLabel =
    order.status === "PENDING_PAY"
      ? "应付金额"
      : order.status === "CANCELLED"
        ? "订单金额"
        : "实付金额";
  const listActions =
    order.status === "DONE"
      ? [
          ...(!order.review ? [action("evaluate", "评价", true)] : []),
          action("details", "查看订单"),
          action("reorder", "再来一单"),
        ]
      : order.status === "CANCELLED"
        ? [action("details", "查看订单"), action("reorder", "再来一单")]
        : [
            action(
              "details",
              order.status === "PENDING_PAY"
                ? "去支付"
                : order.status === "REFUNDING"
                  ? "查看进度"
                  : "查看订单",
              order.status === "PENDING_PAY",
            ),
          ];
  const detailActions: OrderAction[] = [];
  if (order.status === "PENDING_PAY")
    detailActions.push(action("pay", "模拟支付", true));
  if (["DELIVERING", "PICKUP"].includes(order.status))
    detailActions.push(action("complete", "确认完成", true));
  if (order.status === "DONE" && !order.review)
    detailActions.push(action("evaluate", "评价订单", true));
  if (order.status === "REFUNDING" && order.refundRejected && !order.disputed)
    detailActions.push(action("dispute", "申请介入", true));
  if (["PENDING_PAY", "PENDING"].includes(order.status))
    detailActions.push(action("cancel", "取消订单"));
  if (["PENDING", "PREPARING", "DELIVERING", "PICKUP"].includes(order.status))
    detailActions.push(action("refund", "申请退款"));
  const phases = [
    "PENDING_PAY",
    "PENDING",
    "PREPARING",
    pickup ? "PICKUP" : "DELIVERING",
    "DONE",
  ];
  const progress = phases.indexOf(order.status);
  let address: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(order.addressSnapshot);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      address = parsed as Record<string, unknown>;
  } catch {
    /* Damaged historical snapshots must not break order viewing. */
  }
  const deliveryInfo = [
    { label: "配送方式", value: pickup ? "到店自提" : "外卖配送" },
    ...(pickup
      ? [{ label: "自提地址", value: order.store.address || "—" }]
      : [
          {
            label: "收货人",
            value:
              [
                String(address.contact ?? ""),
                address.phone ? phoneTail(String(address.phone)) : "",
              ]
                .filter(Boolean)
                .join(" · ") || "—",
          },
          { label: "收货地址", value: String(address.detail ?? "—") },
        ]),
    ...(order.note ? [{ label: "订单备注", value: order.note }] : []),
  ];
  const fees = [
    { label: "商品小计", value: money(order.itemsCents) },
    {
      label: "配送费",
      value: order.deliveryFeeCents
        ? money(order.deliveryFeeCents)
        : "免配送费",
    },
    ...(order.discountCents > 0
      ? [{ label: "满减优惠", value: "-" + money(order.discountCents) }]
      : []),
  ];
  return {
    state,
    description,
    amountLabel,
    listAmountLabel:
      amountLabel === "订单金额" ? amountLabel : amountLabel.slice(0, 2),
    listActions,
    detailActions,
    progress,
    steps:
      progress < 0
        ? []
        : phases.map((key) => ({
            title: orderStatuses[key as Order["status"]].label,
          })),
    quantity: order.items.reduce((n, i) => n + i.qty, 0),
    deliveryInfo,
    fees,
  };
}
