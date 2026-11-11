# 开发计划

## 阶段

0. 初始化 workspace、严格 TypeScript、ESLint 隔离规则和环境变量。
1. 原样复制 tokens 与 bundle.css，移植共享组件，建立状态映射、接口类型和客户端。
2. Prisma 数据模型、迁移和种子，完成鉴权、店铺、分类、商品、订单、统计、上传和审计模块。
3. 手机端三角色页面、登录、下单、商品管理和审核，提供开发画廊。
4. PC 端对应页面、侧栏、表格、订单看板和审核抽屉，提供开发画廊。
5. SSE、提示音、主题、设备分流、静态托管及部署说明。
6. lint、无产物类型检查和业务测试，记录人工验收项目。

遵循本次指令，编译和 UI 验收由用户安排。阶段提交需注明实际执行的检查。

## 组件移植清单

- 共享组件包括 Icon、Button、Tag、Price、Thumb、Input、Switch、Stepper、SearchBar、Checkbox、Select、Tabs、CategoryNav、ListCell、ListCellGroup、Dialog、StatCard、StoreCard、DishCard、OrderCard。
- 手机组件包括 MobilePage、NavBar、NavBarIcon、TabBar、CartBar、ProductRow、MerchantRow。
- PC 组件包括 DesktopShell、SideNav、PageHeader、SiteHeader、DataTable、DataTableMedia、Pagination、FilterBar、InfoList、TrendChart、CartPanel。

## 路由与 API

完整路由与接口沿用 SPEC.md 第 1、3 节。PC 基址为 /，手机基址为 /mobile/，角色前缀为 user、merchant、admin。公开浏览免登录，受保护页面按角色校验。API 前缀为 /api/v1。

## 数据模型

User、Address、Category、Store、DishCategory、Product、Promotion、Order、OrderItem、Review、AuditLog，增加 RefreshSession 保存可撤销的刷新令牌摘要。订单保存价格与地址快照，商家保存冻结前状态，退款保存申请前状态。金额全部使用整数分。

## 开发入口

PC 监听 0.0.0.0:13599，手机监听 0.0.0.0:5174，API 监听 0.0.0.0:3000。PC 代理 API、上传和手机资源，统一从 13599 访问。

## 已实现路由

下表路径用于 PC，手机应用为相同路径加 /mobile 前缀，商家和管理员根路径分别重定向到工作台和总览。

| 角色 | 路由                                                                    | 页面                           |
| ---- | ----------------------------------------------------------------------- | ------------------------------ |
| 用户 | /、/store/:id                                                           | 首页、店铺点餐                 |
| 用户 | /checkout、/orders、/orders/:id                                         | 结算、订单列表、详情与模拟支付 |
| 用户 | /me、/addresses、/login                                                 | 我的、地址管理、登录           |
| 商家 | /merchant、/merchant/dashboard                                          | 工作台                         |
| 商家 | /merchant/orders                                                        | 接单、出餐、退款               |
| 商家 | /merchant/products、/merchant/products/new、/merchant/products/:id/edit | 商品管理与编辑                 |
| 商家 | /merchant/store、/merchant/apply、/merchant/me、/merchant/login         | 设置、入驻、我的、登录         |
| 管理 | /admin、/admin/overview                                                 | 数据总览                       |
| 管理 | /admin/merchants、/admin/audit、/admin/audit/:id                        | 商家管理与审核                 |
| 管理 | /admin/products、/admin/orders、/admin/disputes、/admin/categories      | 巡检、监管、纠纷、类目         |
| 管理 | /admin/me、/admin/login                                                 | 我的与登录                     |
| 开发 | /__ui                                                                   | 对应应用的组件画廊             |

## 已实现 API

所有路径加 /api/v1 前缀，参数与响应模型沿用 SPEC.md。

| 模块     | 接口                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 公开     | GET /public/categories、/public/stores、/public/stores/:id                                                                       |
| 用户鉴权 | POST /auth/user/code、/auth/user/login                                                                                           |
| 商家鉴权 | POST /auth/merchant/register、/auth/merchant/login                                                                               |
| 管理鉴权 | POST /auth/admin/login                                                                                                           |
| 会话     | POST /auth/refresh、/auth/logout                                                                                                 |
| 地址     | GET、POST、PUT、DELETE /user/addresses，支持 /:id 形式的更新和删除                                                               |
| 用户订单 | POST /user/orders/preview、/user/orders，GET /user/orders、/user/orders/:id                                                      |
| 用户操作 | POST /user/orders/:id/pay、cancel、refund、review、complete、dispute                                                             |
| 商家资料 | GET、PUT /merchant/application、/merchant/store，PUT /merchant/store/open                                                        |
| 店内分类 | GET、POST、PUT、DELETE /merchant/dish-categories，支持 /:id                                                                      |
| 商家商品 | GET、POST /merchant/products，GET、PUT /merchant/products/:id，PUT /merchant/products/:id/listing，POST /merchant/products/batch |
| 商家订单 | GET /merchant/orders、/merchant/orders/stream，POST /merchant/orders/:id/accept、reject、ready、refund-approve、refund-reject    |
| 商家统计 | GET /merchant/stats/today、/merchant/stats/trend、/merchant/todos                                                                |
| 平台统计 | GET /admin/stats/overview、/admin/stats/trend、/admin/stats/ranking、/admin/todos                                                |
| 商家监管 | GET /admin/merchants、/admin/merchants/:id，POST /admin/merchants/:id/approve、reject、freeze、unfreeze                          |
| 商品巡检 | GET /admin/products，POST /admin/products/:id/approve、reject、force-off                                                         |
| 交易监管 | GET /admin/orders、/admin/disputes，POST /admin/disputes/:id/resolve                                                             |
| 平台类目 | GET、POST、PUT、DELETE /admin/categories，支持 /:id                                                                              |
| 审计     | GET /admin/audit-logs                                                                                                            |
| 上传     | POST /uploads，certificate 用途限制文件读取身份                                                                                  |
| 健康     | GET /health                                                                                                                      |

## 当前检查范围

代码和数据层检查见 CHECKS.md。生产编译、生产静态托管运行与页面视觉一致性仍由人工验收。当前本地 API 因端口占用使用 3001，默认模板仍保留 3000。
