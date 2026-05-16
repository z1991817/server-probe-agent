# 服务器探针项目技术规范

## 1. 项目定位

本项目是一个面向个人服务器、小团队服务器和轻量运维场景的服务器探针与项目运维面板。

核心目标：

- 实时查看服务器健康状态。
- 发现当前部署项目、端口、进程和日志。
- 对已纳管项目执行启动、停止、重启、状态查看等操作。
- 记录所有敏感操作，支撑后续告警、权限和多服务器管理扩展。

## 2. 技术栈

### 2.1 前端

- 框架：Nuxt 4
- UI：Vue 3 + TypeScript
- 状态管理：Pinia
- 数据请求：Nuxt `$fetch` 或封装 API Client
- 样式：Tailwind CSS 或 UnoCSS，二选一，项目初始化时固定
- 图表：ECharts 或 Chart.js，优先 ECharts
- 实时通信：日志流和指标流使用 SSE，WebSocket 仅用于后续双向交互场景

### 2.2 后端

- 运行时：Node.js 24 LTS，最低支持 Node.js 22 LTS
- 框架：Nitro + h3，即 Nuxt 自带的后端技术栈
- 语言：TypeScript
- API 文档：OpenAPI 3.1
- 数据校验：Zod
- 数据库 ORM：Prisma
- 默认数据库：SQLite
- 可选数据库：PostgreSQL，用于多服务器、多用户或长期审计数据场景
- 项目纳管配置：`config/projects.yaml`
- 日志：Pino
- 进程执行：Node `child_process`，所有命令必须走白名单封装

### 2.3 部署与运行

- 包管理器：pnpm
- Monorepo：pnpm workspace
- 前端服务端口：5100
- 后端服务端口：5000
- 后端健康检查：`GET /health`
- 前端访问后端：默认通过 `NUXT_PUBLIC_API_BASE=http://localhost:5000`

包管理强制规范：

- 所有依赖安装、脚本执行、项目初始化和 workspace 管理统一使用 `pnpm`。
- 禁止使用 `npm install`、`npm add`、`yarn`、`bun install` 修改依赖或锁文件。
- 第三方文档中的 `npm`、`yarn`、`bun` 示例必须转换为等价 `pnpm` 命令。
- Node 一次性工具优先使用 `pnpm dlx`。
- 依赖锁文件固定为 `pnpm-lock.yaml`，不得新增 `package-lock.json`、`yarn.lock` 或 `bun.lockb`。

建议目录：

```text
server-probe-agent/
  apps/
    web/          # Nuxt 4 前端，端口 5100
    api/          # Nitro/h3 后端，端口 5000
  packages/
    shared/       # 共享类型、常量、DTO schema
  config/
    projects.yaml # 项目纳管配置源
  data/
    server-probe.sqlite
  docs/
    PRD.md
    TECH_SPEC.md
```

## 3. 端口规范

| 服务 | 端口 | 说明 |
| --- | ---: | --- |
| 后端 API | 5000 | Nitro/h3 API、SSE、WebSocket、命令执行入口 |
| 前端 Web | 5100 | Nuxt 应用 |

所有代码、文档、脚本和部署配置都必须遵守以上端口约定。

开发命令建议：

```bash
pnpm dev:web
pnpm dev:api
pnpm dev
```

其中：

- `pnpm dev:web` 启动 Nuxt，监听 `5100`。
- `pnpm dev:api` 启动 Nitro/h3 API 服务，监听 `5000`。
- `pnpm dev` 同时启动前后端。

## 4. 设计原则

### 4.1 探针与控制台分离

当前第一阶段做单机版本：前端和后端部署在同一台服务器上，探针 Agent 等同于本机运行的 Nitro/h3 后端进程。

但架构上建议预留：

- 控制台：用户登录、看板、审计、告警配置。
- Agent：运行在目标服务器上，采集指标并执行受控运维操作。

第一阶段可将控制台后端和 Agent 合并在 `apps/api`，但代码模块应拆分：

```text
apps/api/server/
  api/          # /api 前缀接口
  routes/       # 非 /api 前缀接口，例如 /health
  middleware/   # 认证、审计、请求追踪
  plugins/      # Nitro 插件
  utils/        # h3 工具函数、响应封装、命令执行封装
  modules/
    system/     # CPU、内存、磁盘、网络、负载、运行时间
    projects/   # 项目发现、项目配置、项目操作
    logs/       # 实时日志、历史日志、搜索
    processes/  # 进程、端口占用
    ops/        # 缓存清理、环境变量、目录占用
    audit/      # 审计记录
    alerts/     # 告警规则与通知渠道
    auth/       # 登录、权限、Token
```

### 4.2 默认只读，操作显式授权

服务器探针具备高风险能力，因此默认策略是：

- 状态、进程、端口、日志查看属于只读能力。
- 启动、停止、重启、清理缓存等属于写操作。
- 写操作必须登录、鉴权、审计。
- 所有 Shell 命令必须白名单化，禁止前端传任意命令后端直接执行。

### 4.3 项目操作必须基于纳管配置

项目启动、停止、重启不应通过用户临时输入命令执行。MVP 使用 `config/projects.yaml` 作为项目纳管配置源。

每个项目应有明确配置：

```yaml
version: 1
projects:
  - id: my-api
    name: My API
    deploy_path: /srv/my-api
    port: 3000
    process_manager: pm2
    start_cmd: "pm2 start ecosystem.config.cjs --only my-api"
    stop_cmd: "pm2 stop my-api"
    restart_cmd: "pm2 restart my-api"
    status_cmd: "pm2 describe my-api"
    log_files:
      - /var/log/my-api/app.log
    health_check:
      type: http
      url: http://127.0.0.1:3000/health
```

后端只允许执行已纳管项目中配置过的动作。

规则：

- `id` 必须全局唯一。
- `deploy_path` 和 `log_files` 必须使用绝对路径。
- 配置加载失败时必须禁用项目写操作。
- 后续若迁移到数据库，仍需保留 `projects.yaml` 导入/导出能力。

## 5. MVP 范围建议

第一阶段建议先做“好用的只读探针 + 少量可控项目操作”。

开发推进方式：

- 功能拆分、状态和开发留痕统一记录在 `docs/FEATURES.md`。
- 每次只开发一个功能，完成实现和自检后将状态更新为 `READY_FOR_REVIEW`。
- 等用户确认后，才将该功能标记为 `CONFIRMED` 并开始下一项。
- 若功能范围需要调整，必须同步更新 `docs/FEATURES.md`。

MVP 功能：

- 登录认证。
- 服务器状态看板。
- 项目列表。
- 项目状态查看。
- 项目启动、停止、重启。
- 实时日志查看。
- 历史日志按项目和关键词搜索。
- 进程列表与端口占用。
- 操作审计。

暂缓功能：

- 自动告警推送。
- 多服务器统一管理。
- 复杂权限体系。
- 在线编辑项目配置。
- 任意命令执行终端。

## 6. API 规范

### 6.1 基础约定

- API 前缀：`/api`
- API 使用 Nitro server routes 和 h3 event handlers 实现。
- 响应格式：

```json
{
  "success": true,
  "data": {},
  "traceId": "trace-id"
}
```

错误格式：

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "项目不存在"
  },
  "traceId": "trace-id"
}
```

### 6.2 核心接口草案

系统状态：

- `GET /api/system/summary`
- `GET /api/system/cpu`
- `GET /api/system/memory`
- `GET /api/system/disks`
- `GET /api/system/network`
- `GET /api/system/os`
- `GET /api/system/stream`

项目：

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/start`
- `POST /api/projects/:id/stop`
- `POST /api/projects/:id/restart`
- `GET /api/projects/:id/status`

日志：

- `GET /api/logs?projectId=&keyword=&from=&to=&limit=`
- `GET /api/logs/stream?projectId=`
- 实时日志固定使用 SSE，前端使用浏览器 `EventSource`。

进程：

- `GET /api/processes`
- `GET /api/ports`
- `GET /api/ports/:port`

运维：

- `GET /api/ops/env`
- `GET /api/ops/disk-usage?path=`
- `POST /api/ops/cache/clean`

审计：

- `GET /api/audits`

认证：

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## 7. 数据模型草案

### 7.0 存储策略

- 项目配置：`config/projects.yaml`，作为项目纳管事实来源。
- 用户、角色、会话：SQLite，默认文件 `data/server-probe.sqlite`。
- 审计记录：SQLite，所有写操作必须落库。
- 指标实时数据：内存 ring buffer。
- 指标历史数据：P1 阶段落 SQLite。
- 日志内容：不复制入数据库，只从项目配置声明的日志文件读取和 SSE 推送。

### 7.1 User

- `id`
- `username`
- `passwordHash`
- `role`
- `createdAt`
- `updatedAt`

### 7.2 Project

- `id`
- `name`
- `path`
- `port`
- `processManager`
- `startCommand`
- `stopCommand`
- `restartCommand`
- `statusCommand`
- `logPaths`
- `enabled`
- `createdAt`
- `updatedAt`

### 7.3 AuditLog

- `id`
- `userId`
- `username`
- `action`
- `targetType`
- `targetId`
- `targetName`
- `requestPayload`
- `result`
- `errorMessage`
- `ip`
- `userAgent`
- `createdAt`

### 7.4 AlertRule

- `id`
- `metric`
- `operator`
- `threshold`
- `durationSeconds`
- `enabled`
- `channels`
- `createdAt`
- `updatedAt`

## 8. 安全规范

- 禁止提供浏览器内交互式 Shell。
- 禁止前端传入任意命令由后端执行。
- 命令执行必须：
  - 来自项目配置或后端白名单。
  - 有超时时间。
  - 有 stdout/stderr 长度限制。
  - 记录审计日志。
  - 明确工作目录。
- 环境变量查看必须默认脱敏：
  - 包含 `KEY`、`SECRET`、`TOKEN`、`PASSWORD`、`PRIVATE` 的变量默认隐藏。
- 日志查看必须限制单次读取大小。
- SSE 必须有鉴权，WebSocket 仅在后续双向交互场景中使用。
- 写操作必须防重复提交，可以使用 operation id 或短时间锁。

## 9. 部署规范

- MVP 推荐部署方式：Docker Compose。
- MVP 备选部署方式：pnpm 构建后使用 systemd 管理前后端进程。
- Docker Compose 必须暴露前端 `5100` 和后端 `5000`。
- Docker Compose 必须挂载 `config/`、`data/` 和需要读取的日志目录。
- 单二进制分发不进入 MVP。

## 10. 前端页面规范

样式基准：

- 前端页面样式以仓库中的 `demo1.html` 为视觉参考开发。
- Nuxt 页面实现时可组件化和工程化改写，但整体配色、布局密度、间距、圆角、阴影、表格/卡片/按钮风格应贴近 `demo1.html`。
- 如果 `demo1.html` 尚未存在，开始前端实现前需要先补充该文件或向用户确认视觉参考。

建议页面：

- `/login`：登录页。
- `/`：服务器总览。
- `/projects`：项目列表。
- `/projects/:id`：项目详情、操作和日志。
- `/logs`：日志检索。
- `/processes`：进程与端口。
- `/ops`：运维工具。
- `/audits`：审计记录。
- `/alerts`：告警规则，后续阶段开启。
- `/settings`：系统设置。

布局建议：

- 左侧导航 + 顶部服务器状态摘要。
- 首页优先展示 CPU、内存、磁盘、负载、网络吞吐、运行时间。
- 危险操作使用确认弹窗，按钮文案明确显示目标项目。
- 所有执行中操作需要 loading、结果反馈和失败原因。

## 11. 测试要求

后端：

- 核心工具函数单元测试。
- API 集成测试。
- 命令执行白名单测试。
- 审计记录测试。

前端：

- 关键组件测试。
- 登录、项目操作、日志查看端到端测试。

最小验收：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 12. 后续扩展方向

- 多服务器 Agent 注册。
- Agent 心跳与离线检测。
- 告警通知渠道：邮件、企业微信、飞书、Webhook。
- 用户角色权限：管理员、运维、只读访客。
- 项目部署记录。
- 操作审批。
- 指标历史趋势。
- 容器支持：Docker、Docker Compose。
- systemd、pm2、supervisor 多启动方式适配。
