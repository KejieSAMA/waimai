export type IconName =
  | "home"
  | "order"
  | "user"
  | "store"
  | "search"
  | "cart"
  | "plus"
  | "minus"
  | "back"
  | "chevron-right"
  | "chevron-down"
  | "chart"
  | "box"
  | "shield"
  | "bell"
  | "settings"
  | "clock"
  | "location"
  | "star"
  | "edit"
  | "filter"
  | "more"
  | "grid"
  | "check"
  | "close"
  | "wallet"
  | "bowl"
  | "alert"
  | "camera"
  | "sun"
  | "moon";
export interface NavItem {
  disabled?: boolean;
  key: string;
  label: string;
  icon?: IconName;
  count?: number | string;
  alert?: boolean;
  badge?: boolean | number | string;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}
export interface TagItem {
  label: string;
  tone?:
    "neutral" | "brand" | "success" | "warning" | "info" | "danger" | "accent";
  variant?: "soft" | "outline" | "solid";
}
export const normItems = (items: (string | NavItem)[]) =>
  items.map((item) =>
    typeof item === "string" ? { key: item, label: item } : item,
  );
