小灶是一个餐饮外卖 / 到店平台，由三端组成：**用户端**点餐、**商家端**经营、**管理端**统筹所有商家。三端共用一套色彩、字体、间距和组件，每一端都有手机版（基准宽度 375pt）和桌面版（基准宽度 1440px）。“小灶”是占位品牌名，换成正式名称时只改文案，不改规则。

## 三端怎么区分

三端用同一套 token，靠“顶栏”和“信息密度”区分身份，不换主色。

| | 用户端 | 商家端 | 管理端 |
|---|---|---|---|
| 首页顶栏 | `NavBar tone="brand"`：`brand` 底 + `on-brand` 字 | `NavBar tone="light"`：`surface-raised` 底 | `NavBar tone="admin"`：`chrome` 底 + `on-chrome` 字 |
| 内页顶栏 | `light` | `light` | `admin` |
| 底部 Tab | 首页 / 订单 / 我的 | 工作台 / 订单 / 商品 / 我的 | 总览 / 商家 / 审核 / 我的 |
| 密度 | 宽松，大图（`size-thumb` 88px） | 紧凑，每行带操作 | 紧凑，列表 + 状态 |
| 主色用量 | 最多：顶栏、价格、主按钮 | 中：主按钮、开关、选中态 | 最少：只在主按钮和选中态 |

- 用户端首页顶栏用 `brand` 填充，进入店铺、订单等内页后改回 `light`。
- 管理端每一页的顶栏都用 `chrome`，让运营人员一眼知道自己在后台。
- 桌面版延续同样的身份：用户端网页顶栏 `SiteHeader` 为 `brand` 底；商家端侧栏 `surface-raised`；管理端侧栏 `chrome`。
- 三端的信息架构、权限和状态流转见「三端信息架构」一节。

## 文案

- 用户端对用户称“你”，语气亲切但不撒娇：“你的订单已送达”，不说“亲”。
- 商家端、管理端不用人称，直接说事：“3 个新订单待处理”“营业执照即将过期”。
- 按钮用 2–4 个字的动词：`去结算`、`接单`、`上架`、`下架`、`通过`、`驳回`、`再来一单`。确认弹窗的主按钮重复动作本身（“确认下架”），不写“确定”。
- 不用感叹号，不用 emoji，不用“！！”“~”。
- 价格统一 `¥` + 数字，整数不补 `.00`：`¥28`、`¥28.5`。看板金额保留两位小数并加千分位：`12,846.50`。
- 销量写区间：`月售 1200+`；时间写 `30 分钟`；距离写 `1.2km`。中文与数字之间留一个空格。
- 状态只用下面「状态色」表里的固定词，不要自造同义词（不写“已上架”，写“在售”；不写“封禁”，写“已冻结”）。

## 色彩

- 页面底用 `surface`，卡片、导航栏、Tab 栏用 `surface-raised`，输入框和搜索框用 `surface-sunken`。卡片之间留 `space-2`，靠底色差区分，不加描边。
- 主文字 `ink`，次要文字 `ink-muted`。这两个可以放在 `surface`、`surface-raised`、`surface-sunken`、`brand-soft` 上。
- `brand` 只做填充：主按钮、用户端首页顶栏、开关开启、购物车角标。填充上的字用 `on-brand`，不要写死白色——深色主题里品牌色变亮，`on-brand` 是深色字。
- 品牌色文字（价格、评分、选中 Tab、文字按钮）一律用 `brand-text`，不用 `brand`。
- `accent` 暖黄只用于促销角标和评分星形，字用 `on-accent`；它不能当文字色，也不能单独表达信息。
- `chrome` 是深色栏：管理端顶栏与桌面侧栏、用户端购物车栏。字用 `on-chrome`，次要字用 `on-chrome-muted`；侧栏选中与悬停用 `chrome-raised`。
- 桌面端悬停底色用 `surface-hover`，表格选中行用 `brand-soft`。
- 分隔线用 `line`；控件边框（描边按钮、关闭态开关、步进器减号）用 `line-strong`，它在所有底色上 ≥3:1。
- 遮罩用 `scrim`。

### 状态色

状态永远是“颜色 + 文字”，颜色只是辅助。标签用 `Tag`：软底 `*-soft` + 同色文字；订单卡片右上角的状态只用文字色。

| 语义 | token | 商品（商家端） | 商家（管理端） | 订单（三端） |
|---|---|---|---|---|
| 品牌 / 待处理 | `brand-text` + `brand-soft` | — | — | 待接单 |
| 成功 / 正常 | `success` + `success-soft` | 在售 | 营业中 | 已完成 |
| 提醒 / 进行中 | `warning` + `warning-soft` | 已售罄 | 待审核 | 备餐中 |
| 信息 / 流转中 | `info` + `info-soft` | 审核中 | — | 配送中、待自提 |
| 危险 / 异常 | `danger` + `danger-soft` | 审核驳回 | 已冻结、已驳回 | 退款中 |
| 中性 / 结束 | `ink-muted` + `surface-sunken` | 已下架 | 休息中 | 已取消 |

`danger` 和 `brand` 同属红色系，所以 `danger` 只用于真正的异常，并且一定配文字或图标。`success` 偏青绿，与 `danger` 明度相差明显，色弱用户也能分辨。

## 字体

- 中文用 `sans`：iOS 落到苹方，Android 落到系统黑体或 Noto Sans SC，Windows 落到微软雅黑。App 内不要打包中文字体文件。
- 价格和数据用 `num`（Barlow，等宽数字感强，接近 DIN）。只用于数字和 `¥`，不要用它排中文。
- 字号阶梯：`display` 28 / `title-lg` 20 / `title` 17 / `title-sm` 15 / `body` 15 / `body-md` 14 / `body-sm` 13 / `caption` 12。`caption` 是下限，不要再小。`body-md` 只用于桌面端。
- 导航栏标题 `title`；卡片标题（商品名、店名、商家名）`title-sm`；描述、月售、时间 `body-sm` + `ink-muted`；标签 `caption`。
- 价格：列表 `price`，结算 / 详情 `price-lg`，划线原价 `price-sm` + `ink-muted` + 删除线。`¥` 符号比数字小一号。
- 一个卡片里最多两种字重：600 做标题，400 做其余。

## 间距与布局

- 4px 网格。页面左右边距与卡片内边距统一 `space-3`（12px）；卡片之间 `space-2`；区块之间 `space-4`。
- 顶部：状态栏 44pt + 导航栏 `size-navbar`。底部：Tab 栏 `size-tabbar` + 安全区 `size-safe-bottom`。用 `MobilePage` 组件，它已处理好这些。
- 可点区域不小于 `size-tap`（44px）。卡片内按钮用 `size-button-sm`（32px）时，行高本身要 ≥44px。
- 页面底部的主操作（提交订单、保存并上架、审核通过）做成通栏 `size-button-lg` 按钮，固定在底部栏里，不要放在长表单的末尾。
- 列表一律单列。用户端“推荐菜品”允许两列网格；商家端、管理端不用网格卡片。

## 桌面端

### 断点

| 宽度 | 用什么 |
|---|---|
| < 768px | 手机版：`MobilePage` + `NavBar` + `TabBar` |
| 768–1279px | 桌面版，商家端 / 管理端侧栏收成 `size-sidebar-collapsed`（只有图标） |
| ≥ 1280px | 桌面版完整布局，设计稿按 1440 × 900 |

### 三端的桌面骨架

- **用户端网页**：顶部 `SiteHeader`（`brand` 底），内容在 `size-content`（1200px）内居中，左右内边距 `space-6`。
- **商家端后台**：`DesktopShell role="merchant"`，左侧 `SideNav`（`surface-raised`，底部放营业开关），顶栏放搜索、消息、账号。
- **管理端后台**：`DesktopShell role="admin"`，侧栏 `chrome`，选中项 `chrome-raised`。
- 每个后台页面以 `PageHeader` 开头，内容区内边距 `space-6`，卡片间距 `space-4`。

### 手机组件在桌面上换成什么

| 手机 | 桌面 |
|---|---|
| `TabBar` | 商家端 / 管理端 `SideNav`；用户端 `SiteHeader` 里的导航 |
| `NavBar` | `PageHeader`（标题行 + 页面操作） |
| 页面底部通栏主按钮 | `PageHeader` 右侧的按钮 |
| `ProductRow`、`MerchantRow` 卡片列表 | `DataTable` + `FilterBar` + `Pagination` |
| 订单状态 `Tabs` + 卡片列表（商家端） | 按状态分列的订单看板，卡片仍是 `OrderCard` |
| `ListCell`（详情信息） | `InfoList` |
| `Dialog variant="sheet"` | `Dialog variant="modal"`（选择原因）或 `drawer`（查看并处理一条记录） |
| `CartBar` | `CartPanel` |

`StatCard`、`OrderCard`、`StoreCard`、`DishCard`、`Tag`、`Button`、`Switch`、`Tabs` 两端通用。

### 桌面规则

- 正文与表格用 `body-md`（14px）；页面标题 `title-lg`。
- 输入框、下拉、按钮统一 `size-button-md`（40px）高；表格行至少 `size-row`；不再要求 44px 触控区。
- 鼠标悬停：表格行和菜单项用 `surface-hover`；可点卡片用 `shadow-raise` 抬起；主按钮换 `brand-pressed`。
- 金额、数量列右对齐，用 `num` 字体等宽数字；状态列用 `Tag`。
- 行内操作用文字按钮（`text`、`danger-text`），一行最多 3 个。
- 趋势图用 `TrendChart`：一张图一个指标、一个纵轴，柱子 `brand`，文字用 `ink` / `ink-muted`。

## 圆角、阴影、边框

- 按钮、搜索框、步进器、开关、筛选胶囊全部 `radius-pill`。
- 卡片 `radius-lg`；商品图、Logo、输入框 `radius-md`；标签 `radius-sm`；弹窗和底部面板 `radius-xl`。
- 卡片只用 `shadow-card`（深色主题为无）；底部栏用 `shadow-bar` 一条细线；只有悬浮元素（购物车栏、弹窗、悬浮按钮）用 `shadow-float`。
- 不给卡片加彩色描边或左侧色条。

## 交互状态

- 按下：品牌填充换 `brand-pressed`；其余按钮和列表行叠一层 `surface-sunken`。
- 禁用：`surface-sunken` 底 + `ink-muted` 字，不用降透明度（会掉对比度）。
- 键盘焦点：2px `surface` 间隙 + 2px `focus-ring` 实线，所有可交互组件一致。
- 动效克制：按下反馈 120ms，底部面板与弹窗 240ms ease-out 进入，不做弹跳。

## 图标

- 用 `Icon` 组件：24px 网格、1.75px 线宽、圆角端点，颜色继承 `currentColor`。
- 这套图标是为小灶临时绘制的基础线性图标（29 个），没有对应任何现成图标库。接入正式图标库时保持同样的线宽与网格，替换 `Icon` 的路径即可。
- 底部 Tab 图标 22px，导航栏图标 22px，卡片内图标 16px。图标旁必须有文字，管理端顶栏的“更多”除外。

## 图片

- 菜品图 1:1，`radius-md`。没有图时组件显示 `surface-sunken` 底 + 碗形图标的占位，不要用网图或 AI 图冒充菜品。
- 店铺 / 商家 Logo 1:1，`radius-md`；没有 Logo 时显示店名首字，`brand-soft` 底 + `brand-text` 字。

## 组件的使用

组件在 `components/bundle.js` 中，挂在 `window.Xiaozao` 上，需要页面先加载 React 18。样式在 `components/bundle.css`，类名前缀 `xz-`，全部只引用本系统的 token。

- 基础：`Icon` `Button` `Tag` `Price` `Thumb`
- 表单：`Input` `Switch` `Stepper` `SearchBar` `Checkbox` `Select`
- 手机导航与布局：`MobilePage` `NavBar` `TabBar` `Tabs` `CategoryNav` `ListCell` `Dialog`
- 桌面布局与导航：`DesktopShell` `SideNav` `PageHeader` `SiteHeader`
- 桌面数据：`DataTable` `Pagination` `FilterBar` `InfoList` `TrendChart`
- 用户端：`StoreCard` `DishCard` `CartBar` `CartPanel`
- 商家端：`ProductRow`；管理端：`MerchantRow`；通用：`OrderCard` `StatCard`

「页面」分组是 10 张手机界面，「桌面页面」分组是 10 张桌面界面（1440 × 900），都由这些组件组合而成，展示每一端的关键页面，可直接作为开发的视觉稿。
