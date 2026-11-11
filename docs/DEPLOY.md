# 部署说明

## 环境准备

使用 Node 22、pnpm 10 和可写的数据目录。根目录 `.env` 可从 `.env.example` 复制。生产环境的 `JWT_SECRET` 与 `JWT_REFRESH_SECRET` 必须替换为两个不同的随机密钥，长度至少 32 个字符。服务会校验这两个配置。

| 变量                 | 默认值或用途                                        |
| -------------------- | --------------------------------------------------- |
| `HOST`               | `0.0.0.0`                                           |
| `PORT`               | API 和生产静态托管端口，默认 `3000`                 |
| `FRONTEND_PORT`      | PC 开发入口，默认 `13599`                           |
| `MOBILE_PORT`        | 手机开发服务，默认 `5174`                           |
| `DATABASE_URL`       | `file:./dev.db`，相对 Prisma schema 目录            |
| `JWT_SECRET`         | access token 签名，2 小时有效                       |
| `JWT_REFRESH_SECRET` | refresh token 签名，7 天有效                        |
| `PRODUCT_REVIEW`     | `true` 时新增或编辑商品进入审核                     |
| `UPLOAD_DIR`         | 上传目录，相对 backend 工作目录，默认 `./uploads`   |
| `NODE_ENV`           | 本地为 `development`，start 脚本设置为 `production` |

## 初始化与运行

以下构建步骤供人工执行，本次开发未运行生产构建。

```powershell
pnpm install --frozen-lockfile
pnpm db:setup
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`db:setup` 生成 Prisma 客户端、部署迁移并写入演示种子。正式环境应先部署迁移，通过受控的种子创建管理员，并替换演示密码。增量部署使用以下命令保留已有业务数据。

```powershell
pnpm --filter @waimai/backend db:generate
pnpm --filter @waimai/backend db:migrate
```

`pnpm build` 生成两个前端的 `dist` 及后端的 `dist/server.js`。`pnpm start` 在 `0.0.0.0:3000` 提供 API、上传文件和两套前端，`/mobile/*` 返回手机版入口，其余页面返回 PC 入口。API 和上传的未知路径返回相应错误。

生产 refresh cookie 使用 `secure` 和 `httpOnly`，浏览器访问通过 HTTPS 入口进行。短信发送通过 `SmsProvider` 接口接入，生产环境需要配置真实短信实现。支付当前采用规格要求的模拟支付。

## Nginx

以下配置放入已配置 TLS 证书的 HTTPS server 块中，所有业务请求通过同一域名。

```nginx
client_max_body_size 6m;

location /api/v1/merchant/orders/stream {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}

location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}

location /mobile/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

也可以将 `/mobile/` 与 `/` 都代理到 backend，沿用应用内 history fallback。证照文件由 backend 校验所有者或管理员身份，Nginx 上传路径保持代理，以执行这项访问检查。

## 数据与维护

- SQLite 数据文件默认在 `backend/prisma/dev.db`。备份时暂停写入或使用 SQLite 在线备份，同时保存 `backend/uploads`，其中包含证照访问元数据。
- 后端每分钟取消超过 15 分钟未支付的订单，并在事务内回补库存。
- SSE 断线会重连，重连后补拉订单列表。浏览器先点击开启提醒，才能播放提示音。
- 切换 MySQL 时更改 Prisma datasource provider 和连接串，重新生成对应迁移与 Prisma 客户端，并迁移业务数据。
