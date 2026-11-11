import type * as React from 'react';

export type IconName = 'home' | 'order' | 'user' | 'store' | 'search' | 'cart' | 'plus' | 'minus' | 'back' | 'chevron-right' | 'chevron-down' | 'chart' | 'box' | 'shield' | 'bell' | 'settings' | 'clock' | 'location' | 'star' | 'edit' | 'filter' | 'more' | 'grid' | 'check' | 'close' | 'wallet' | 'bowl' | 'alert' | 'camera';
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger';
export type Role = 'user' | 'merchant' | 'admin';
export interface Action { label: string; variant?: ButtonProps['variant']; onClick?: () => void }

/** 24px 线性图标，颜色继承 currentColor。 */
export interface IconProps { name: IconName; size?: number; strokeWidth?: number; title?: string; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;

/** 胶囊按钮。 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger' | 'danger-outline' | 'danger-text';
  size?: 'lg' | 'md' | 'sm';
  block?: boolean;
  icon?: IconName;
}
export declare function Button(props: ButtonProps): React.ReactElement;

/** 状态 / 促销标签。 */
export interface TagProps { tone?: Tone | 'accent'; variant?: 'soft' | 'outline' | 'solid'; icon?: IconName; children?: React.ReactNode; className?: string }
export declare function Tag(props: TagProps): React.ReactElement;

/** 人民币价格。 */
export interface PriceProps { value: number; original?: number; size?: 'sm' | 'md' | 'lg'; tone?: 'brand' | 'ink' | 'chrome' | 'on-brand'; className?: string }
export declare function Price(props: PriceProps): React.ReactElement;

/** 文本输入。 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode;
  prefix?: React.ReactNode; suffix?: React.ReactNode; required?: boolean; multiline?: boolean;
  layout?: 'vertical' | 'horizontal';
}
export declare function Input(props: InputProps): React.ReactElement;

/** 即时生效的开关。 */
export interface SwitchProps { checked?: boolean; defaultChecked?: boolean; onChange?: (next: boolean) => void; label?: React.ReactNode; disabled?: boolean; 'aria-label'?: string; className?: string }
export declare function Switch(props: SwitchProps): React.ReactElement;

/** 数量加减。 */
export interface StepperProps { value?: number; defaultValue?: number; onChange?: (n: number) => void; min?: number; max?: number; disabled?: boolean; collapse?: boolean; className?: string }
export declare function Stepper(props: StepperProps): React.ReactElement;

/** 胶囊搜索框。 */
export interface SearchBarProps { placeholder?: string; value?: string; tone?: 'default' | 'brand'; action?: React.ReactNode; onAction?: () => void; className?: string }
export declare function SearchBar(props: SearchBarProps): React.ReactElement;

/** 手机页面骨架。 */
export interface MobilePageProps {
  navBar?: React.ReactNode; bottom?: React.ReactNode; bottomTone?: 'raised' | 'clear';
  statusBar?: 'light' | 'brand' | 'admin' | 'surface' | false; overlay?: React.ReactNode;
  children?: React.ReactNode; className?: string;
}
export declare function MobilePage(props: MobilePageProps): React.ReactElement;

/** 顶部导航栏；NavBar.Icon 为图标按钮。 */
export interface NavBarProps {
  title?: React.ReactNode; subtitle?: React.ReactNode; tone?: 'light' | 'brand' | 'admin'; align?: 'center' | 'left';
  back?: boolean; onBack?: () => void; left?: React.ReactNode; right?: React.ReactNode; bordered?: boolean;
  children?: React.ReactNode; className?: string;
}
export interface NavBarIconProps { name: IconName; label: string; badge?: boolean | number | string; onClick?: () => void }
export declare const NavBar: ((props: NavBarProps) => React.ReactElement) & { Icon: (props: NavBarIconProps) => React.ReactElement };

/** 底部主导航。 */
export interface TabBarItem { key: string; label: string; icon: IconName; badge?: boolean | number | string }
export interface TabBarProps { role?: Role; items?: TabBarItem[]; value?: string; defaultValue?: string; onChange?: (key: string) => void; badges?: Record<string, boolean | number | string>; className?: string }
export declare const TabBar: ((props: TabBarProps) => React.ReactElement) & { presets: Record<Role, TabBarItem[]> };

/** 页面内切换。 */
export interface TabsItem { key: string; label: React.ReactNode; count?: number | string; alert?: boolean }
export interface TabsProps { items: Array<string | TabsItem>; value?: string; defaultValue?: string; onChange?: (key: string) => void; variant?: 'line' | 'chip'; className?: string }
export declare function Tabs(props: TabsProps): React.ReactElement;

/** 点餐页左侧分类。 */
export interface CategoryNavProps { items: Array<string | { key: string; label: string; count?: number }>; value?: string; defaultValue?: string; onChange?: (key: string) => void; className?: string }
export declare function CategoryNav(props: CategoryNavProps): React.ReactElement;

/** 设置类列表行；ListCell.Group 把多行装进一张卡片。 */
export interface ListCellProps { title: React.ReactNode; desc?: React.ReactNode; value?: React.ReactNode; icon?: IconName; extra?: React.ReactNode; arrow?: boolean; danger?: boolean; onClick?: () => void; className?: string }
export interface ListCellGroupProps { title?: React.ReactNode; children?: React.ReactNode; className?: string }
export declare const ListCell: ((props: ListCellProps) => React.ReactElement) & { Group: (props: ListCellGroupProps) => React.ReactElement };

/** 确认弹窗 / 底部面板；桌面端居中弹窗 / 右侧抽屉。 */
export interface DialogProps { open?: boolean; title?: React.ReactNode; children?: React.ReactNode; actions?: Action[]; variant?: 'center' | 'sheet' | 'modal' | 'drawer'; onClose?: () => void; className?: string }
export declare function Dialog(props: DialogProps): React.ReactElement | null;

/** 核心数字 + 环比。 */
export interface StatCardProps { label: React.ReactNode; value: React.ReactNode; unit?: React.ReactNode; prefix?: React.ReactNode; delta?: number; deltaLabel?: string; icon?: IconName; tone?: 'plain' | 'brand' | 'chrome'; size?: 'md' | 'sm'; className?: string }
export declare function StatCard(props: StatCardProps): React.ReactElement;

/** 用户端店铺卡片。 */
export interface StoreCardProps {
  name: string; logo?: string; rating?: number; sales?: string; time?: string; distance?: string;
  minOrder?: number; deliveryFee?: number; tags?: Array<string | (TagProps & { label: string })>;
  status?: 'open' | 'closed'; notice?: string; onClick?: () => void; className?: string;
}
export declare function StoreCard(props: StoreCardProps): React.ReactElement;

/** 用户端菜品卡片。 */
export interface DishCardProps {
  name: string; price: number; original?: number; image?: string; desc?: string; sales?: string;
  tags?: Array<string | (TagProps & { label: string })>; soldOut?: boolean; count?: number; value?: number;
  onChange?: (n: number) => void; max?: number; layout?: 'row' | 'grid'; className?: string;
}
export declare function DishCard(props: DishCardProps): React.ReactElement;

/** 悬浮购物车栏。 */
export interface CartBarProps { count: number; total?: number; deliveryFee?: number; minOrder?: number; label?: string; onCheckout?: () => void; className?: string }
export declare function CartBar(props: CartBarProps): React.ReactElement;

/** 订单卡片（三端共用）。 */
export type OrderStatus = 'pending' | 'preparing' | 'delivering' | 'pickup' | 'done' | 'cancelled' | 'refunding';
export interface OrderItem { name: string; qty?: number; price?: number; image?: string }
export interface OrderCardProps {
  view?: Role; title: React.ReactNode; status: OrderStatus; statusText?: string; items: OrderItem[]; total: number;
  serial?: number | string; meta?: React.ReactNode; time?: React.ReactNode; note?: string; count?: number; actions?: Action[]; className?: string;
}
export declare const OrderCard: ((props: OrderCardProps) => React.ReactElement) & { statuses: Record<OrderStatus, [string, Tone]> };

/** 商家端商品管理行。 */
export type ProductStatus = 'on' | 'soldout' | 'off' | 'review' | 'rejected';
export interface ProductRowProps {
  name: string; price: number; status?: ProductStatus; image?: string; original?: number; sales?: number | string;
  stock?: number; lowStock?: number; category?: string; reason?: string; locked?: boolean;
  onToggle?: (listed: boolean) => void; onEdit?: () => void; onMore?: () => void; className?: string;
}
export declare const ProductRow: ((props: ProductRowProps) => React.ReactElement) & { statuses: Record<ProductStatus, [string, Tone]> };

/** 管理端商家行。 */
export type MerchantStatus = 'pending' | 'open' | 'closed' | 'frozen' | 'rejected';
export interface MerchantRowProps {
  name: string; status?: MerchantStatus; logo?: string; category?: string; city?: string; owner?: string; joined?: string;
  orders?: number | string; rating?: number; reason?: string; actions?: Action[] | false; className?: string;
}
export declare const MerchantRow: ((props: MerchantRowProps) => React.ReactElement) & { statuses: Record<MerchantStatus, [string, Tone]> };

/* ================= 桌面 ================= */

/** 多选框。 */
export interface CheckboxProps { checked?: boolean; defaultChecked?: boolean; onChange?: (next: boolean) => void; indeterminate?: boolean; label?: React.ReactNode; disabled?: boolean; 'aria-label'?: string; className?: string }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;

/** 原生下拉选择。 */
export interface SelectOption { value: string; label: string }
export interface SelectProps { options: Array<string | SelectOption>; value?: string; defaultValue?: string; onChange?: (value: string) => void; label?: React.ReactNode; placeholder?: string; width?: number | string; disabled?: boolean; className?: string }
export declare function Select(props: SelectProps): React.ReactElement;

/** 菜品图或店铺 Logo 小图。 */
export interface ThumbProps { kind?: 'dish' | 'logo'; src?: string; name?: string; size?: 'md' | 'lg' }
export declare function Thumb(props: ThumbProps): React.ReactElement;

/** 桌面侧栏导航。 */
export interface SideNavItem { key: string; label: string; icon?: IconName; badge?: boolean | number | string }
export interface SideNavGroup { title?: string; items: SideNavItem[] }
export interface SideNavProps {
  role?: 'merchant' | 'admin'; groups?: SideNavGroup[]; value?: string; defaultValue?: string; onChange?: (key: string) => void;
  badges?: Record<string, boolean | number | string>; footer?: React.ReactNode; brand?: string | false; subtitle?: string; 'aria-label'?: string; className?: string;
}
export declare const SideNav: ((props: SideNavProps) => React.ReactElement) & { presets: Record<'merchant' | 'admin', SideNavGroup[]> };

/** 商家端 / 管理端桌面骨架。 */
export interface DesktopShellProps {
  role?: 'merchant' | 'admin'; nav?: SideNavProps; search?: string; topLeft?: React.ReactNode; topRight?: React.ReactNode;
  notices?: number | boolean; user?: { name: string; role?: string }; overlay?: React.ReactNode; children?: React.ReactNode; className?: string;
}
export declare function DesktopShell(props: DesktopShellProps): React.ReactElement;

/** 桌面页面标题行。 */
export interface PageHeaderProps { title: React.ReactNode; subtitle?: React.ReactNode; breadcrumb?: React.ReactNode[]; tag?: React.ReactNode; actions?: React.ReactNode; back?: boolean; onBack?: () => void; children?: React.ReactNode; className?: string }
export declare function PageHeader(props: PageHeaderProps): React.ReactElement;

/** 用户端网页顶栏。 */
export interface SiteHeaderProps {
  brand?: string; location?: string; search?: string; links?: Array<string | { key: string; label: string }>;
  value?: string; defaultValue?: string; onChange?: (key: string) => void; cartCount?: number; user?: { name: string }; className?: string;
}
export declare function SiteHeader(props: SiteHeaderProps): React.ReactElement;

/** 桌面数据表格；DataTable.Media 为“图片 + 名称 + 副标题”单元格。 */
export interface DataTableColumn<R = any> { key: string; title: React.ReactNode; width?: number | string; align?: 'left' | 'right' | 'center'; num?: boolean; render?: (row: R, index: number) => React.ReactNode }
export interface DataTableProps<R = any> {
  columns: DataTableColumn<R>[]; rows: R[]; rowKey?: string; selectable?: boolean; selected?: Array<string | number>; defaultSelected?: Array<string | number>;
  onSelect?: (keys: Array<string | number>) => void; batchActions?: Action[]; onRowClick?: (row: R) => void; activeKey?: string | number;
  toolbar?: React.ReactNode; footer?: React.ReactNode; empty?: React.ReactNode; className?: string;
}
export interface DataTableMediaProps { name: string; sub?: React.ReactNode; src?: string; kind?: 'dish' | 'logo' }
export declare const DataTable: ((props: DataTableProps) => React.ReactElement) & { Media: (props: DataTableMediaProps) => React.ReactElement };

/** 分页。 */
export interface PaginationProps { total: number; pageSize?: number; page?: number; defaultPage?: number; onChange?: (page: number) => void; className?: string }
export declare function Pagination(props: PaginationProps): React.ReactElement;

/** 桌面筛选栏。 */
export interface FilterBarProps { children?: React.ReactNode; onSearch?: () => void; onReset?: () => void; className?: string }
export declare function FilterBar(props: FilterBarProps): React.ReactElement;

/** 桌面键值详情。 */
export interface InfoListProps { items: Array<{ label: React.ReactNode; value: React.ReactNode }>; columns?: 1 | 2; className?: string }
export declare function InfoList(props: InfoListProps): React.ReactElement;

/** 单指标趋势柱状图。 */
export interface TrendChartProps {
  data: Array<{ label: string; value: number }>; title?: string; subtitle?: string; height?: number; width?: number;
  prefix?: string; unit?: string; tickFormat?: (v: number) => string; valueFormat?: (v: number) => string; className?: string;
}
export declare function TrendChart(props: TrendChartProps): React.ReactElement;

/** 用户端网页购物车面板。 */
export interface CartPanelItem { name: string; price: number; qty?: number; spec?: string }
export interface CartPanelProps { items: CartPanelItem[]; deliveryFee?: number; discount?: number; discountLabel?: string; minOrder?: number; label?: string; onCheckout?: () => void; onClear?: () => void; className?: string }
export declare function CartPanel(props: CartPanelProps): React.ReactElement;

declare global {
  interface Window {
    Xiaozao: {
      Icon: typeof Icon; Button: typeof Button; Tag: typeof Tag; Price: typeof Price; Input: typeof Input; Switch: typeof Switch;
      Stepper: typeof Stepper; SearchBar: typeof SearchBar; MobilePage: typeof MobilePage; NavBar: typeof NavBar; TabBar: typeof TabBar;
      Tabs: typeof Tabs; CategoryNav: typeof CategoryNav; ListCell: typeof ListCell; Dialog: typeof Dialog; StatCard: typeof StatCard;
      StoreCard: typeof StoreCard; DishCard: typeof DishCard; CartBar: typeof CartBar; OrderCard: typeof OrderCard;
      ProductRow: typeof ProductRow; MerchantRow: typeof MerchantRow;
      Checkbox: typeof Checkbox; Select: typeof Select; Thumb: typeof Thumb; DesktopShell: typeof DesktopShell; SideNav: typeof SideNav;
      PageHeader: typeof PageHeader; SiteHeader: typeof SiteHeader; DataTable: typeof DataTable; Pagination: typeof Pagination;
      FilterBar: typeof FilterBar; InfoList: typeof InfoList; TrendChart: typeof TrendChart; CartPanel: typeof CartPanel;
    };
  }
}
