# 小灶外卖平台 · 开发总规范（Codex 必读）

你要在本仓库里从零实现一个餐饮外卖 / 到店平台，三端：**用户端**（点餐）、**商家端**（经营、上下架商品、处理订单）、**管理端**（统筹所有商家：审核、冻结、监管）。每一端都有 **PC 版** 和 **手机版**。界面、交互、文案全部以 `design-system/` 为准，你只负责把它变成可运行的产品。

详细的路由表、API 清单、数据模型、状态机和验收清单在 `docs/SPEC.md`，开始前必须读完。

## 0. 工作方式

- **一个会话做完。** 按第 7 节的阶段顺序连续推进，不要停下来等确认，也不要建议用户开新会话。只有真正无法继续（缺少只有用户能给的东西）时才提问。
- 每个阶段结束：运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`（该阶段已存在的部分），全部通过后 `git commit -m "phase N: …"`，然后直接进入下一阶段。
- 遇到规范没写到的决定，自己按“最简单、可替换”的原则决定，并追加到 `docs/DECISIONS.md`（一行一条：日期、决定、理由）。
- 运行环境是 **Windows + PowerShell**。脚本必须跨平台：用 `rimraf`、`cross-env`、`concurrently`，不要写 `rm -rf`、`export`、`&&` 依赖 bash 的语法。
- 不要修改 `design-system/` 里的任何文件；它是只读的规范来源。ESLint、Prettier、TypeScript 都要忽略 `design-system/`。
- 节省上下文：截图按需查看（`design-system/screenshots/`），不要一次性全部读入。

## 1. 设计规范：唯一来源

| 文件 | 用途 |
|---|---|
| `design-system/README.md` | 品牌手册：三端如何区分、文案规则、色彩、状态色表、字体、间距、桌面规则、组件清单。**必读** |
| `design-system/architecture.md` | 三端权限分工、各端页面、商家入驻 / 商品上下架 / 订单状态流转。**必读** |
| `design-system/tokens.json` / `tokens.css` | 全部 token。`tokens.css` 是编译好的 CSS 变量 + 字体样式类（`.title` `.body-md` `.price` …），浅色 / 深色由 `<html data-theme="light|dark">` 切换 |
| `design-system/components/bundle.css` | 全部组件样式（`xz-` 前缀）。**原样复用**，只允许按区块拆文件，不改选择器和数值 |
| `design-system/components/bundle.js` | 组件的 React 参考实现。**移植为 Vue 3 SFC**：组件名、props、DOM 结构、`xz-` 类名保持一致，这样 `bundle.css` 无需改动即可生效 |
| `design-system/components/index.d.ts` | 每个组件的 props 规格 |
| `design-system/components/<Name>/README.md` | 组件用法与约束 |
| `design-system/components/<Name>/preview.html` | 组件 / 页面的示例数据与组合方式（`React.createElement` 写法，照着翻成 Vue 模板） |
| `design-system/screenshots/<Name>-light.png` / `-dark.png` | 每个组件和页面的渲染截图 = 视觉验收标准 |
| `design-system/demo/index.html` | 全部组件与页面的可运行参考（离线，双击打开；`?theme=dark` 看深色）。只作对照，不要复制 React 运行时进产品 |

页面视觉稿（各有 preview.html + 截图）：
- 手机端：`UserHome` `UserStore` `UserOrders` `MerchantDashboard` `MerchantOrders` `MerchantProducts` `MerchantProductEdit` `AdminDashboard` `AdminMerchants` `AdminMerchantAudit`
- PC 端：`DeskUserHome` `DeskUserStore` `DeskUserOrders` `DeskMerchantDashboard` `DeskMerchantOrders` `DeskMerchantProducts` `DeskMerchantProductEdit` `DeskAdminDashboard` `DeskAdminMerchants` `DeskAdminAudit`

硬性规则：
- 业务代码里**不写死颜色、字号、圆角、阴影**：一律用 `var(--token)` 和 tokens.css 的样式类。缺 token 就记到 `docs/DECISIONS.md`，不要私自加颜色。
- 状态文字和颜色只用 README「状态色」表里的固定词（在售 / 已下架 / 审核中 / 审核驳回 / 已售罄；待审核 / 营业中 / 休息中 / 已冻结 / 已驳回；待接单 / 备餐中 / 配送中 / 待自提 / 已完成 / 已取消 / 退款中）。
- 文案规则照 README：按钮 2–4 字动词、不用感叹号和 emoji、`¥28` / `¥28.5` 价格格式、手机号只显示尾号。
- 不引入任何第三方 UI 组件库（Element Plus、Vant、Ant Design Vue 等）。图表用设计系统的 `TrendChart`（自己移植的 SVG），不引入 ECharts。
- `.xz-demo` `.xz-stage` `.xz-device` `.xz-desk-stage` `.xz-desk-frame` 是预览脚手架，产品代码不用（组件画廊页可以用）。

## 2. 技术栈

- **pnpm workspace** 单仓库，Node ≥ 20（`.nvmrc` 写 22），全部 TypeScript（`strict: true`）。
- **前端（PC 与手机两个应用）**：Vue 3 `<script setup lang="ts">` + Vite + Vue Router 4 + Pinia。
- **后端**：Node.js + Express + TypeScript + Prisma + **SQLite**（`DATABASE_URL` 换成 MySQL 即可切换，schema 不要用 SQLite 专有特性）+ zod 校验 + JWT + bcryptjs + multer。测试用 Vitest + Supertest。
- 字体：数字字体 Barlow 用 `@fontsource/barlow`（500、600）本地打包，**不要用 Google Fonts / jsDelivr 等 CDN**（国内访问不稳定）；中文用 tokens 里的系统字体栈，不打包中文字体。

## 3. 目录结构（高内聚、低耦合）

```
waimai/
  design-system/            只读设计规范
  packages/
    tokens/                 @waimai/tokens：tokens.css、拆分后的组件样式、字体、主题切换（useTheme）
    ui/                     @waimai/ui：两端共用的基础组件（Vue SFC）
    shared/                 @waimai/shared：与界面无关的 TS —— 类型、状态枚举与“文案 + 色调”映射、金额 / 时间 / 手机号格式化、API 客户端、通用 composables
  frontend/                 PC 端 Vue 应用：/ 用户网页、/merchant 商家后台、/admin 运营后台
  mobile/                   手机端 Vue 应用（Vite base = /mobile/）：/mobile 用户、/mobile/merchant、/mobile/admin
  backend/                  Express API（/api/v1）+ 生产环境静态托管
  docs/                     SPEC.md、PLAN.md、DECISIONS.md、DEPLOY.md
```

组件归属（与 README「手机组件在桌面上换成什么」一致）：

| 位置 | 组件 |
|---|---|
| `packages/ui`（两端共用） | Icon Button Tag Price Thumb Input Switch Stepper SearchBar Checkbox Select Tabs CategoryNav ListCell Dialog StatCard StoreCard DishCard OrderCard |
| `mobile/src/components`（仅手机） | MobilePage NavBar TabBar CartBar ProductRow MerchantRow |
| `frontend/src/components`（仅 PC） | DesktopShell SideNav PageHeader SiteHeader DataTable Pagination FilterBar InfoList TrendChart CartPanel |

隔离规则（用 ESLint `no-restricted-imports` + tsconfig paths 强制）：
- `frontend` 与 `mobile` **互相不得 import**；两者只能依赖 `packages/*`。
- `packages/ui` 不得 import 任何应用代码；`packages/shared` 不得 import Vue 组件或 DOM API（composables 可以用 Vue 响应式）。
- 每个应用内按角色分目录：`src/roles/user|merchant|admin/{pages,components,router.ts,store}`；角色之间不互相 import，公共的东西上提到应用的 `src/common/` 或 `packages/`。
- 状态机、金额计算、权限判断只在后端做；前端只读 `@waimai/shared` 的枚举和映射来显示。

## 4. 路由与入口

- 开发：`pnpm dev` 同时启动 backend（:3000）、frontend（:5173）、mobile（:5174）。**统一从 http://localhost:5173 访问**：frontend 的 Vite 把 `/api`、`/uploads` 代理到 :3000，把 `/mobile` 代理到 :5174（含 HMR websocket）。
- PC：`/` 用户网页（默认入口）、`/merchant/*` 商家后台、`/admin/*` 运营后台。
- 手机：`/mobile/*` 用户、`/mobile/merchant/*` 商家、`/mobile/admin/*` 管理。
- 设备分流：PC 应用检测到手机 UA 且不是 `/mobile` 时，跳转到对应的 `/mobile` 路径；页面提供“电脑版 / 手机版”切换，用户选择记住（localStorage）后不再自动跳。
- 每个角色路由懒加载（独立 chunk），`meta.role` + 路由守卫：未登录跳该角色自己的登录页；角色不符跳回该角色首页。
- 生产：`pnpm build && pnpm start` 由 backend 在 :3000 托管 `frontend/dist`（`/`）和 `mobile/dist`（`/mobile`），并做 history fallback：`/mobile/*` → mobile 的 index.html，其余非 `/api`、`/uploads` 路径 → frontend 的 index.html。另写 `docs/DEPLOY.md` 附 Nginx 等价配置。
- 完整路由表见 `docs/SPEC.md`。

## 5. Vue 移植约定

- React `value` + `onChange` → Vue `v-model`（`modelValue` / `update:modelValue`）；`defaultValue` / `defaultChecked` → 无 v-model 时的内部状态；回调型 props（`onCheckout`、`onEdit`）→ `emit`。
- `children` → 默认插槽；`right` `left` `actions` `footer` `overlay` `extra` `tag` 等节点 props → 同名具名插槽（同时允许简单字符串 prop）。
- `NavBar.Icon`、`ListCell.Group`、`DataTable.Media` → 独立组件 `NavBarIcon`、`ListCellGroup`、`DataTableMedia`。
- `Icon` 的 SVG 路径从 bundle.js 的 `ICONS` 原样复制。
- 移植完成后，每个应用都要有组件画廊页（仅开发环境）：PC `/__ui`、手机 `/mobile/__ui`，用 preview.html 里的示例数据渲染每个组件，逐个和截图对照（浅色 + 深色）。
- 主题：`useTheme()` 跟随系统 `prefers-color-scheme`，允许手动切换并记住。

## 6. 后端约定（详见 docs/SPEC.md）

- 按业务模块分目录（高内聚）：`src/modules/<auth|users|stores|categories|products|orders|uploads|stats|audit>/{router,controller,service,schema,*.test}.ts`；模块之间只通过 service 调用，不跨模块直接查表。
- 统一响应：`{ code: 0, message: 'ok', data }`；错误 `{ code, message, details? }` + 合适的 HTTP 状态码；分页 `{ list, total, page, pageSize }`。
- 角色命名空间：`/api/v1/public`、`/api/v1/user`、`/api/v1/merchant`、`/api/v1/admin`。商家接口的店铺 ID **只从登录态取**，绝不信任前端传入，防止越权访问其他商家数据。
- 金额一律存“分”（整数），总价由后端计算，订单项保存价格快照。
- 状态流转集中在 `src/domain/*Machine.ts`，与 architecture.md 完全一致，非法流转返回 409。

## 7. 阶段

0. 读完规范 → 写 `docs/PLAN.md`（组件移植清单、路由表、API 清单、数据模型）→ 初始化 git、pnpm workspace、TS / ESLint / Prettier / Vitest、`.gitignore` `.gitattributes`（`* text=auto eol=lf`）`.editorconfig` `.nvmrc` `.env.example`。
1. `packages/tokens` + `packages/shared` + `packages/ui`（共享组件移植 + 单元测试）。
2. `backend`：Prisma schema、迁移、种子数据、鉴权、全部模块、状态机、测试。
3. `mobile`：手机端三角色 10 个页面 + 画廊页 + 接口联调。
4. `frontend`：PC 端用户网页、商家后台、运营后台 10 个页面 + 画廊页 + 接口联调。
5. 实时新订单推送（SSE）+ 提示音、图片上传、设备分流、生产构建与托管、`README.md`（启动方式、测试账号）、`docs/DEPLOY.md`。
6. 自查：所有检查通过；每个页面浅色 / 深色对照截图修正；按 `docs/SPEC.md` 的验收清单逐条确认；最终提交。
