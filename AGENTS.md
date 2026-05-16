# AGENTS.md

本文件是 Codex 和其他代码代理在本仓库工作的项目级规范。后续所有实现、重构、脚本和部署配置都必须遵守这里的约束。

## 项目背景

本项目是一个服务器探针与轻量运维面板，用于查看服务器状态、管理已部署项目、查看日志、检查进程端口、执行受控运维操作并记录审计。

第一阶段目标是单服务器版本：前端 Web 和后端 API 部署在同一台服务器，探针 Agent 等同于本机运行的 Nitro/h3 后端进程。后续可扩展为独立 Agent + 中心管控架构。

## 固定技术栈

### 前端

- 框架：Nuxt 4
- UI：Vue 3 + TypeScript
- 状态管理：Pinia
- 数据请求：Nuxt `$fetch` 或封装 API Client
- 图表：优先 ECharts
- 实时通信：日志流和指标流使用 SSE，WebSocket 仅用于后续双向交互场景

### 后端

- 运行时：Node.js 24 LTS，最低支持 Node.js 22 LTS
- 框架：Nitro + h3，即 Nuxt 自带的后端技术栈
- 语言：TypeScript
- API 文档：OpenAPI 3.1
- 数据校验：优先 Zod
- ORM：Prisma
- 默认数据库：SQLite
- 可选数据库：PostgreSQL
- 项目纳管配置：`config/projects.yaml`
- 日志：Pino
- 系统命令执行：Node `child_process`，必须经过白名单封装

### 工程

- 包管理器：pnpm
- 项目形态：pnpm workspace monorepo
- 默认开发系统：Windows 可以用于开发，但生产目标优先 Linux

强制规则：

- 本仓库所有依赖安装、脚本执行、项目初始化、workspace 管理都必须使用 `pnpm`。
- 禁止使用 `npm install`、`npm add`、`yarn`、`bun install` 修改依赖或 lockfile。
- 如第三方文档示例使用 `npm`、`yarn`、`bun`，必须等价转换为 `pnpm` 命令后再执行。
- Node 一次性工具优先使用 `pnpm dlx`，除非用户明确要求使用 `npx` 安装或执行特定工具。
- 依赖锁文件以 `pnpm-lock.yaml` 为准，不得新增 `package-lock.json`、`yarn.lock` 或 `bun.lockb`。

## 已安装 Skills 与开发规范

本仓库已安装以下项目内 Skills。后续开发、重构、评审和问题排查时，凡任务命中对应范围，必须优先读取并遵守对应 `SKILL.md` 中的规范。

| Skill | 本地路径 | 适用范围 |
| --- | --- | --- |
| `nuxt` | `.agents/skills/nuxt/SKILL.md` | Nuxt、Nitro、h3、路由、server routes、`useFetch`、`$fetch`、SSR/水合、Nuxt 配置与部署 |
| `vue-best-practices` | `.agents/skills/vue-best-practices/SKILL.md` | Vue 3、`.vue` 单文件组件、Composition API、Pinia、Vue Router、Volar、`vue-tsc` |
| `typescript-expert` | `.agents/skills/typescript-expert/SKILL.md` | TypeScript/JavaScript 类型设计、类型安全、monorepo TS 配置、类型检查、构建与测试验证 |

强制规则：

- Nuxt 相关开发必须结合 `nuxt` skill 的目录结构、配置、路由、数据请求、服务端接口、SSR/水合和 Nitro 部署规范；同时不得违背本文件固定的 Nuxt 4、Nitro/h3、端口和目录约束。
- Vue 相关开发必须结合 `vue-best-practices` skill。默认使用 Vue 3 Composition API 与 `<script setup lang="ts">`；非平凡功能开始前先规划组件边界；路由级页面保持为组合层；优先拆分聚焦组件与 composables；遵循 props down、events up，并保持 props/emits 类型显式。
- TypeScript 相关开发必须结合 `typescript-expert` skill。优先保持 strict 类型安全，避免隐式 `any` 和无依据的类型断言；公共 API、共享 DTO、服务端响应和前后端共享类型要有清晰类型边界；优先使用项目已有脚本执行 `typecheck`、测试和构建验证。
- 如果 skill 建议与本 `AGENTS.md`、`docs/TECH_SPEC.md` 或 `docs/PRD.md` 冲突，以本项目文档为准；如确需调整项目约束，必须先说明原因并同步更新相关文档。

## 固定端口规范

| 服务 | 端口 | 说明 |
| --- | ---: | --- |
| 后端 API | 5000 | Nitro/h3 API、SSE、WebSocket、命令执行入口 |
| 前端 Web | 5100 | Nuxt 应用 |

强制规则：

- 前端必须监听 `5100`。
- 后端必须监听 `5000`。
- 前端访问后端默认使用 `NUXT_PUBLIC_API_BASE=http://localhost:5000`。
- 所有代码、文档、脚本、Docker、部署配置都必须遵守以上端口。

## 推荐目录结构

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
  AGENTS.md
```

后端模块建议：

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

## API 草案

### 基础约定

- API 前缀：`/api`
- 后端健康检查：`GET /health`
- API 实现使用 Nitro server routes 和 h3 event handlers。
- 成功响应：

```json
{
  "success": true,
  "data": {},
  "traceId": "trace-id"
}
```

- 失败响应：

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

### 系统状态

- `GET /api/system/summary`
- `GET /api/system/cpu`
- `GET /api/system/memory`
- `GET /api/system/disks`
- `GET /api/system/network`
- `GET /api/system/os`
- `GET /api/system/stream`

### 项目

- `GET /api/projects`
- `GET /api/projects/:id`
- `GET /api/projects/:id/status`
- `POST /api/projects/:id/start`
- `POST /api/projects/:id/stop`
- `POST /api/projects/:id/restart`

### 日志

- `GET /api/logs?projectId=&keyword=&from=&to=&limit=`
- `GET /api/logs/stream?projectId=`
- 实时日志传输固定使用 SSE，前端使用浏览器 `EventSource`。

### 进程与端口

- `GET /api/processes`
- `GET /api/ports`
- `GET /api/ports/:port`

### 运维

- `GET /api/ops/env`
- `GET /api/ops/disk-usage?path=`
- `POST /api/ops/cache/clean`

### 审计

- `GET /api/audits`

### 认证

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## 安全规则

服务器探针具备高风险能力，安全规则优先级高于便利性。

### 默认只读，操作显式授权

- 状态、进程、端口、日志查看属于只读能力。
- 启动、停止、重启、清理缓存属于写操作。
- 写操作必须登录、鉴权、审计。
- 写操作必须有明确目标和二次确认。
- 同一项目同一时间只允许一个操作执行。

### 禁止任意命令执行

- 禁止提供浏览器内交互式 Shell。
- 禁止前端传入任意命令由后端直接执行。
- 后端只允许执行已纳管项目中配置过的动作。
- 命令执行必须有白名单、超时时间、stdout/stderr 长度限制、固定工作目录和审计记录。

### 项目纳管

项目启动、停止、重启必须基于 `config/projects.yaml`。MVP 阶段该文件是项目配置的事实来源。

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

规则：

- `id` 必须全局唯一。
- `deploy_path` 和 `log_files` 必须使用绝对路径。
- 前端不得传入任意命令，只能触发配置中已有的动作。
- 配置加载失败时必须禁用项目写操作。
- 后续若增加后台编辑功能，也必须写入同一 schema 或提供兼容导入导出。

## 数据存储

- 项目配置：`config/projects.yaml`。
- 用户、角色、会话：SQLite，默认文件 `data/server-probe.sqlite`。
- 审计记录：SQLite，所有写操作必须落库。
- 指标实时数据：内存 ring buffer。
- 指标历史数据：P1 阶段落 SQLite。
- 日志内容：不复制入数据库，只从 `projects.yaml` 声明的日志文件读取和 SSE 推送。

## 部署约束

- MVP 推荐部署方式：Docker Compose，暴露前端 `5100` 和后端 `5000`。
- MVP 备选部署方式：pnpm 构建后用 systemd 管理前后端进程。
- Docker 部署必须挂载 `config/`、`data/` 和需要读取的日志目录。
- 单二进制分发不进入 MVP。

## 前端样式约束

- 前端页面样式以仓库中的 `demo1.html` 为视觉参考开发。
- Nuxt 页面实现时可组件化和工程化改写，但整体配色、布局密度、间距、圆角、阴影、表格/卡片/按钮风格应贴近 `demo1.html`。
- 如果 `demo1.html` 尚未存在，开始前端实现前需要先补充该文件或向用户确认视觉参考。

### 敏感信息保护

- 环境变量查看必须默认脱敏。
- 包含 `KEY`、`SECRET`、`TOKEN`、`PASSWORD`、`PRIVATE` 的变量默认隐藏。
- 日志查看必须限制单次读取大小和行数。
- SSE 必须鉴权，WebSocket 仅在后续双向交互场景中使用。
- 审计记录不可由普通用户删除。

## MVP 优先级

P0：

- 登录认证
- 服务器状态看板
- 项目纳管配置
- 项目列表
- 项目状态查看
- 项目启动、停止、重启
- 实时日志查看
- 历史日志搜索
- 操作审计

P1：

- 进程列表
- 端口占用
- 目录占用
- 环境变量脱敏查看
- 指标历史趋势
- Agent 心跳与自检
- 安全暴露检测

P2：

- 告警通知
- Docker / Docker Compose 项目纳管
- 多服务器管理
- 操作审批

## 开发要求

- 优先遵循 `docs/TECH_SPEC.md` 和 `docs/PRD.md`。
- 功能开发必须按 `docs/FEATURES.md` 逐项推进：一次只开发一个功能，完成后更新留痕并等待用户确认，再开始下一项。
- 所有新增功能要保持前后端类型一致，优先把共享类型放入 `packages/shared`。
- 后端写操作必须同时实现审计记录。
- 不要引入 Web Shell 或任意命令执行能力。
- 不要随意改变端口、目录规划和技术栈。
- 如果必须调整本文件中的约束，需要先说明原因并同步更新相关文档。
