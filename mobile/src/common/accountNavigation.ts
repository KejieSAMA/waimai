import type { Role } from "@waimai/shared";
import type { IconName } from "@waimai/ui";

export const identityLabels: Record<Role, string> = {
  USER: "用户",
  MERCHANT: "商家",
  ADMIN: "管理员",
};
export const accountMePath = (role?: Role) =>
  role === "USER" || !role ? "/me" : `/${role.toLowerCase()}/me`;
export const accountLoginPath = (role?: Role) =>
  role === "USER" || !role ? "/login" : `/${role.toLowerCase()}/login`;
export function accountPageRole(
  routeRole: unknown,
  accountArea: unknown,
  activeRole?: Role,
): Role {
  return ((accountArea ? activeRole : routeRole) as Role) || "USER";
}
export interface AccountLink {
  path: string;
  label: string;
  icon: IconName;
}
export const accountShortcuts: Record<Role, AccountLink[]> = {
  USER: [
    { path: "/orders", label: "我的订单", icon: "order" },
    { path: "/addresses", label: "收货地址", icon: "location" },
  ],
  MERCHANT: [
    { path: "/merchant/dashboard", label: "工作台", icon: "grid" },
    { path: "/merchant/orders", label: "订单", icon: "order" },
    { path: "/merchant/products", label: "商品", icon: "box" },
  ],
  ADMIN: [
    { path: "/admin/accounts", label: "账号管理", icon: "user" },
    { path: "/admin/merchants", label: "商家管理", icon: "store" },
    { path: "/admin/audit", label: "入驻审核", icon: "shield" },
  ],
};
export const adminAccountTools: AccountLink[] = [
  { path: "/admin/products", label: "商品巡检", icon: "box" },
  { path: "/admin/orders", label: "订单监管", icon: "order" },
  { path: "/admin/disputes", label: "退款纠纷", icon: "alert" },
  { path: "/admin/categories", label: "类目管理", icon: "grid" },
];
