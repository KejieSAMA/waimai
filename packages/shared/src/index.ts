export * from "./device";
export * from "./userOrders";

export type Role = "USER" | "MERCHANT" | "ADMIN";
export type Tone =
  "neutral" | "brand" | "success" | "warning" | "info" | "danger";
export const storeStatuses = {
  PENDING: { label: "待审核", tone: "warning" },
  OPEN: { label: "营业中", tone: "success" },
  CLOSED: { label: "休息中", tone: "neutral" },
  FROZEN: { label: "已冻结", tone: "danger" },
  REJECTED: { label: "已驳回", tone: "danger" },
} as const;
export const productStatuses = {
  ON: { label: "在售", tone: "success" },
  SOLDOUT: { label: "已售罄", tone: "warning" },
  OFF: { label: "已下架", tone: "neutral" },
  REVIEW: { label: "审核中", tone: "info" },
  REJECTED: { label: "审核驳回", tone: "danger" },
} as const;
export const orderStatuses = {
  PENDING_PAY: { label: "待支付", tone: "neutral" },
  PENDING: { label: "待接单", tone: "brand" },
  PREPARING: { label: "备餐中", tone: "warning" },
  DELIVERING: { label: "配送中", tone: "info" },
  PICKUP: { label: "待自提", tone: "info" },
  DONE: { label: "已完成", tone: "success" },
  CANCELLED: { label: "已取消", tone: "neutral" },
  REFUNDING: { label: "退款中", tone: "danger" },
} as const;
export type StoreStatus = keyof typeof storeStatuses;
export type ProductStatus = keyof typeof productStatuses;
export type OrderStatus = keyof typeof orderStatuses;
export interface Account {
  id: string;
  phone: string;
  name: string;
  role: Role;
}
export interface Category {
  id: string;
  name: string;
  sort: number;
}
export interface Product {
  id: string;
  storeId: string;
  dishCategoryId: string;
  name: string;
  description: string;
  images: string;
  priceCents: number;
  originalPriceCents: number | null;
  stock: number;
  lowStock: number;
  limitPerOrder: number | null;
  status: ProductStatus;
  displayStatus: ProductStatus;
  forcedOff: boolean;
  rejectReason: string | null;
  monthlySales: number;
}
export interface Store {
  id: string;
  name: string;
  logo: string;
  categoryId: string;
  category?: Category;
  city: string;
  address: string;
  contactPhone: string;
  notice: string;
  openHours: string;
  minOrderCents: number;
  deliveryFeeCents: number;
  status: StoreStatus;
  rejectReason: string | null;
  frozenReason: string | null;
  rating: number;
  monthlySales: number;
  licenseImage?: string;
  foodPermitImage?: string;
  licenseExpireAt?: string;
  permitExpireAt?: string;
  products?: Product[];
  dishCategories?: Category[];
  promotions?: { thresholdCents: number; discountCents: number }[];
}
export interface Address {
  id: string;
  contact: string;
  phone: string;
  detail: string;
  isDefault: boolean;
}
export interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceCentsSnapshot: number;
  qty: number;
  spec?: string | null;
}
export interface Order {
  review?: { id: string } | null;
  id: string;
  orderNo: string;
  serialOfDay: number;
  storeId: string;
  store: Store;
  type: "DELIVERY" | "PICKUP";
  status: OrderStatus;
  items: OrderItem[];
  itemsCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  payCents: number;
  note: string;
  createdAt: string;
  addressSnapshot: string;
  refundReason: string | null;
  disputed: boolean;
  refundRejected: boolean;
}
export interface Page<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Quote {
  itemsCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  payCents: number;
  count: number;
  items: { name: string; qty: number; priceCents: number }[];
}
export interface Stats {
  revenueCents: number;
  orders: number;
  stores: number;
  pending: number;
  products: number;
}
export interface Action {
  label: string;
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "text"
    | "danger"
    | "danger-outline"
    | "danger-text";
  onClick?: () => void;
}
export const money = (cents: number) => `¥${Number((cents / 100).toFixed(2))}`;
export const dashboardMoney = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const phoneTail = (phone: string) => `尾号 ${phone.slice(-4)}`;
export const time = (value: string | Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
export function firstImage(images: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(images);
    return Array.isArray(parsed) && typeof parsed[0] === "string"
      ? parsed[0]
      : undefined;
  } catch {
    return undefined;
  }
}
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}
export interface TransportResponse {
  ok: boolean;
  json(): Promise<unknown>;
}
export type Transport = (
  path: string,
  init: {
    method: string;
    headers: Record<string, string>;
    credentials: "include";
    body?: string;
  },
) => Promise<TransportResponse>;
export function createApi(transport: Transport, getToken: () => string | null) {
  return async function request<T>(
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const token = getToken();
    const response = await transport(`/api/v1${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });
    const result = (await response.json()) as {
      code: number;
      message: string;
      data: T;
    };
    if (!response.ok || result.code !== 0)
      throw new ApiError(result.code, result.message);
    return result.data;
  };
}
