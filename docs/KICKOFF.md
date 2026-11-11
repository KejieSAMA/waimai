# 启动 Codex 开发

## 准备

- 已安装 Node.js 20 或更高版本、Git。
- 启用 pnpm：在 PowerShell 里运行 `corepack enable`（只需一次）。
- 开发过程中 Codex 需要联网安装依赖、运行命令和写文件。它请求批准时请允许；也可以在启动时给它本目录内的自动执行权限，减少打断。

## 启动

1. 打开 PowerShell，进入项目目录：

   ```powershell
   cd C:\Users\kejiekejie0826\Desktop\waimai
   codex
   ```

2. 在 Codex 里选好模型（gpt-6.1-sol，推理强度 high）和 fast 模式。
3. 把下面整段作为第一条消息发给它。之后尽量都在这一个会话里继续，不要新开会话。

## 第一条消息（整段复制）

```text
你是这个仓库的唯一开发者。请先完整阅读 AGENTS.md、docs/SPEC.md、design-system/README.md、design-system/architecture.md，再浏览 design-system/components/index.d.ts 和 design-system/demo/index.html，了解全部组件与页面。

然后从阶段 0 开始，按 AGENTS.md 第 7 节在本会话内一次性完成全部阶段：
- 每个阶段结束运行 lint / typecheck / test / build，全部通过后 git commit，然后直接进入下一阶段，不要停下来等我确认；
- 组件从 design-system/components/bundle.js 移植为 Vue 3，原样复用 tokens.css 和 bundle.css；视觉以 design-system/screenshots 为验收标准，浅色和深色都要对照；
- frontend（PC）与 mobile（手机）互不引用，两端共用的代码放 packages/，保持高内聚、低耦合；
- 只有缺少只有我能提供的东西时才提问，其余决定记录到 docs/DECISIONS.md。

全部完成后，按 docs/SPEC.md 第 8 节逐条报告验收结果，并告诉我启动命令和测试账号。
```

## 中途需要继续时

如果会话被打断，在同一个会话里发：

```text
继续。先看 git log 和 docs/PLAN.md 确认做到哪个阶段，然后从未完成的地方接着做，规则不变。
```

## 文件夹里有什么

| 路径 | 内容 |
| --- | --- |
| `AGENTS.md` | 给 Codex 的总规范（Codex 每次会自动读取） |
| `docs/SPEC.md` | 路由表、接口清单、数据模型、状态机、注意事项、验收清单 |
| `design-system/` | 设计系统：品牌手册、信息架构、tokens、组件样式与参考实现、每个组件的说明 |
| `design-system/demo/index.html` | 离线演示：双击打开，可看全部组件和 20 张页面，链接里可切浅色 / 深色 |
| `design-system/screenshots/` | 全部组件和页面的浅色 / 深色截图 |
