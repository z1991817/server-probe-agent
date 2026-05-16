# 功能清单与开发留痕

本文件用于记录项目功能拆分、开发顺序、验收标准和开发留痕。后续开发必须按清单逐项推进：一次只开发一个功能，完成后更新留痕，等待用户确认后再进入下一项。

## 状态说明

| 状态 | 含义 |
| --- | --- |
| `TODO` | 未开始 |
| `IN_PROGRESS` | 正在开发 |
| `READY_FOR_REVIEW` | 已完成实现和自检，等待用户确认 |
| `CONFIRMED` | 用户已确认，可进入下一项 |
| `BLOCKED` | 被依赖、环境或需求问题阻塞 |

## 开发流程

1. 开始一个功能前，将该功能状态改为 `IN_PROGRESS`。
2. 实现范围必须只覆盖当前功能，避免夹带无关重构或额外功能。
3. 完成后补充开发留痕：完成内容、变更文件、验证命令、遗留风险。
4. 将状态改为 `READY_FOR_REVIEW`，并停止继续开发。
5. 用户确认后，将状态改为 `CONFIRMED`，再开始下一项功能。

## P0 功能清单

| 编号 | 功能 | 范围 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| F0.0 | 功能清单与流程留痕 | 建立本文件，并把逐项开发流程写入项目规范 | 文档中存在功能清单、状态说明、开发流程和首条留痕 | `CONFIRMED` |
| F0.1 | 技术骨架 | pnpm workspace、`apps/web`、`apps/api`、`packages/shared`、固定端口配置 | `pnpm install` 成功；前端端口 `5100`；后端端口 `5000`；基础脚本存在 | `CONFIRMED` |
| F0.2 | 健康检查与统一响应 | 后端 `GET /health`、`GET /api/system/summary` 雏形、统一成功/失败响应工具、traceId | 接口返回统一结构；包含 traceId；错误响应格式一致 | `CONFIRMED` |
| F0.3 | 登录认证基础 | 用户模型、登录、登出、当前用户、基础会话或 Token | 未登录不能访问写操作；登录成功/失败有明确响应 | `CONFIRMED` |
| F0.4 | 审计存储基础 | Prisma + SQLite、AuditLog 模型、审计写入工具 | 登录和后续写操作可落审计；数据库路径符合 `data/server-probe.sqlite` | `CONFIRMED` |
| F0.5 | 服务器状态只读探针 | CPU、内存、磁盘、OS、运行时间摘要采集 | 总览接口 3 秒内返回；异常或采集失败有可读错误 | `CONFIRMED` |
| F0.6 | 项目纳管配置加载 | 读取并校验 `config/projects.yaml`，暴露项目配置错误 | id 唯一；路径校验；配置失败时禁用写操作 | `CONFIRMED` |
| F0.7 | 项目列表与状态查看 | 项目列表、详情、端口/进程/健康检查状态 | 项目状态包含运行中、已停止、异常、未知 | `CONFIRMED` |
| F0.8 | 受控项目操作 | start/stop/restart 白名单执行、超时、输出限制、操作锁、二次确认接口契约 | 前端不传任意命令；同项目并发操作被拒绝；操作写审计 | `CONFIRMED` |
| F0.9 | 历史日志搜索 | 按项目、关键词、时间和 limit 读取声明日志文件 | 单次读取限制行数和大小；关键词可筛选 | `CONFIRMED` |
| F0.10 | 实时日志 SSE | `GET /api/logs/stream?projectId=`，事件类型 log/heartbeat/error | 使用 SSE；断线可重连；日志路径只来自配置 | `CONFIRMED` |
| F0.11 | 前端登录页 | Nuxt 登录页面、错误提示、登录后跳转 | 使用 Vue Composition API；表单可提交；失败提示清晰 | `CONFIRMED` |
| F0.12 | 前端总览页 | 按 `demo1.html` 风格实现服务器状态、项目摘要、最近审计入口 | 首屏展示核心状态；布局贴近视觉参考；移动端不溢出 | `CONFIRMED` |
| F0.13 | 前端项目页 | 项目表格、筛选、状态、操作按钮、确认弹窗 | 危险操作显示目标项目；执行中有 loading 和结果反馈 | `CONFIRMED` |
| F0.14 | 前端日志页 | 历史日志搜索、实时日志查看、暂停滚动 | SSE 使用 `EventSource`；搜索关键词高亮；支持暂停自动滚动 | `READY_FOR_REVIEW` |
| F0.15 | 前端审计页 | 审计列表、筛选、分页 | 写操作审计可查询；普通用户不可删除审计 | `READY_FOR_REVIEW` |

## P1 功能清单

| 编号 | 功能 | 范围 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| F1.1 | 进程列表 | 进程 PID、名称、CPU、内存、启动时间、命令摘要 | 支持按 CPU、内存排序；默认不提供 kill | `TODO` |
| F1.2 | 端口占用 | 端口列表和指定端口查询 | 支持按端口定位进程 | `TODO` |
| F1.3 | 环境变量脱敏查看 | 只读环境变量，敏感键默认隐藏 | KEY/SECRET/TOKEN/PASSWORD/PRIVATE 默认脱敏 | `TODO` |
| F1.4 | 目录占用 | 白名单路径目录占用查看 | 禁止遍历敏感目录；路径校验明确 | `TODO` |
| F1.5 | 指标历史趋势 | 内存 ring buffer 和趋势图 | 至少保留最近 1 小时实时指标 | `TODO` |
| F1.6 | Agent 自检 | 本机探针运行状态、配置状态、权限状态 | 自检失败有明确修复提示 | `TODO` |
| F1.7 | 安全暴露检测 | 监听地址、开放端口、磁盘风险、日志膨胀检测 | 风险项有等级和说明 | `TODO` |

## P2 功能清单

| 编号 | 功能 | 范围 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| F2.1 | 告警规则 | CPU、内存、磁盘阈值和持续时间 | 支持触发和恢复状态 | `TODO` |
| F2.2 | 告警通知 | 邮件、企业微信、飞书、Webhook | 发送失败有记录；支持静默周期 | `TODO` |
| F2.3 | Docker / Compose 纳管 | 容器状态、日志、重启服务 | 操作仍需白名单和审计 | `TODO` |
| F2.4 | 多服务器管理 | 独立 Agent、中心管控、心跳 | Agent 注册鉴权和离线检测完整 | `TODO` |
| F2.5 | 操作审批 | 高风险操作审批流 | 未审批不能执行写操作 | `TODO` |

## 开发留痕

### F0.0 功能清单与流程留痕

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：建立功能清单和逐项开发流程，后续所有功能按本文件留痕。
- 变更文件：
  - `docs/FEATURES.md`
  - `AGENTS.md`
  - `docs/TECH_SPEC.md`
- 验证方式：
  - 文档检查
- 遗留风险：
  - 无代码变更，不涉及运行时验证。

### F0.1 技术骨架

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：创建 pnpm workspace monorepo，建立 `apps/web`、`apps/api`、`packages/shared` 基础骨架，并固定前端 `5100`、后端 `5000` 开发端口。
- 范围：
  - 根目录 workspace 与 TypeScript 基础配置。
  - `apps/api` Nitro/h3 应用基础配置与脚本。
  - `apps/web` Nuxt 4 应用基础配置与脚本。
  - `packages/shared` 共享类型包基础结构。
  - `config/`、`data/` 目录占位。
- 不包含：
  - `/health` 或业务 API。
  - 登录认证、数据库、项目配置加载。
  - 服务器指标、日志、审计。
- 完成内容：
  - 新增 pnpm workspace 根配置、TypeScript strict 基础配置、`.npmrc`、`.gitignore`、`.env.example`。
  - 新增 `apps/api` Nitro/h3 应用骨架，`dev` 脚本固定 `--port 5000`。
  - 新增 `apps/web` Nuxt 4 + Pinia 应用骨架，`dev` 和 `preview` 脚本固定 `--port 5100`。
  - 新增 `packages/shared` 共享包，导出 `WEB_PORT`、`API_PORT`、`DEFAULT_API_BASE` 基础常量。
  - 新增 `config/projects.yaml` 空项目配置和 `data/.gitkeep`。
  - 更新 `README.md` 开发启动说明。
- 变更文件：
  - `package.json`
  - `pnpm-workspace.yaml`
  - `pnpm-lock.yaml`
  - `tsconfig.base.json`
  - `.npmrc`
  - `.gitignore`
  - `.env.example`
  - `apps/api/**`
  - `apps/web/**`
  - `packages/shared/**`
  - `config/projects.yaml`
  - `data/.gitkeep`
  - `README.md`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm install`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm --filter @server-probe/api dev`，确认监听 `5000`
  - `pnpm --filter @server-probe/web dev`，确认监听 `5100`
- 验证结果：
  - 依赖安装成功。
  - 类型检查通过。
  - 构建通过。
  - API 开发服务确认监听 `5000`。
  - Web 开发服务确认监听 `5100`。
- 遗留风险：
  - pnpm 安装时提示 `@parcel/watcher`、`esbuild` 构建脚本未批准；当前 typecheck/build/dev 验证均可通过，后续如遇原生 watcher 或 esbuild 安装问题再按需执行 `pnpm approve-builds`。
  - Nuxt 构建时出现上游依赖的 Node `DEP0155` deprecation warning，不影响当前构建结果。

### F0.2 健康检查与统一响应

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：实现后端健康检查、统一 API 成功/失败响应结构、traceId 贯穿和系统摘要接口雏形。
- 范围：
  - `packages/shared` 增加 API 响应与系统摘要基础类型。
  - `apps/api` 增加 traceId 中间件和响应工具。
  - `GET /health`。
  - `GET /api/system/summary` 雏形。
- 不包含：
  - 登录认证。
  - 数据库和审计。
  - 真实 CPU、内存、磁盘采集。
  - 前端页面接入 API。
- 完成内容：
  - `packages/shared` 新增统一 API 响应类型、健康检查类型和系统摘要类型。
  - `apps/api` 新增 traceId 中间件，支持接收 `x-trace-id` 或自动生成 UUID，并回写响应头。
  - `apps/api` 新增统一成功响应、失败响应和抛错工具。
  - `apps/api` 新增 Nitro 全局错误处理，将 404 等错误格式化为项目统一错误结构。
  - 新增 `GET /health`。
  - 新增 `GET /api/system/summary` 雏形，真实指标采集保留到 F0.5。
  - 将 `apps/api` 的 h3 依赖对齐到 Nitro 当前使用的 h3 1.x，避免 rc 版本和 Nitro 运行时类型混用。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `apps/api/package.json`
  - `apps/api/nitro.config.ts`
  - `apps/api/tsconfig.json`
  - `apps/api/server/middleware/trace.ts`
  - `apps/api/server/utils/response.ts`
  - `apps/api/server/error.ts`
  - `apps/api/server/routes/health.get.ts`
  - `apps/api/server/api/system/summary.get.ts`
  - `pnpm-lock.yaml`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm build`
  - `curl.exe -i --max-time 10 http://127.0.0.1:5000/health`
  - `curl.exe -i --max-time 10 -H "x-trace-id: custom-trace-001" http://127.0.0.1:5000/api/system/summary`
  - `curl.exe -i --max-time 10 http://127.0.0.1:5000/not-found`
- 验证结果：
  - 类型检查通过。
  - 构建通过。
  - `/health` 返回 `success: true`、`service: server-probe-api`、`status: ok` 和 traceId。
  - `/api/system/summary` 返回 `success: true`，并保留调用方传入的 `x-trace-id`。
  - 不存在路由返回 HTTP `404 Not Found`，响应体为统一错误结构。
- 遗留风险：
  - `/api/system/summary` 当前仅提供响应契约，真实 CPU、内存、磁盘和负载采集在 F0.5 实现。

### F0.3 登录认证基础

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：实现后端基础登录认证能力，提供登录、登出、当前用户接口和写操作认证工具。
- 范围：
  - 共享认证 DTO 和用户角色类型。
  - 基于运行时配置的内置管理员账号。
  - HTTP-only Cookie 会话。
  - `POST /api/auth/login`。
  - `POST /api/auth/logout`。
  - `GET /api/auth/me`。
  - 后端 `requireAuth` / `requireRole` 基础工具，供后续写操作复用。
- 不包含：
  - Prisma/SQLite 用户表。
  - 密码哈希存储。
  - 审计记录。
  - 前端登录页。
- 完成内容：
  - `packages/shared` 新增认证用户、角色、登录请求、登录响应、当前用户和登出响应类型。
  - `apps/api` 新增基于运行时配置的内置管理员认证，默认开发账号为 `admin` / `admin123456`。
  - 新增 HTTP-only Cookie 会话，使用 HMAC SHA256 签名，包含过期时间校验。
  - 新增 `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/me`。
  - 新增 `requireAuth` 和 `requireRole` 工具，供后续写操作接口复用。
  - 统一错误处理补充 `400`、`401`、`403` 错误码映射。
  - `.env.example` 补充认证相关环境变量。
  - `.gitignore` 忽略本地运行日志目录 `logs/`。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `apps/api/nitro.config.ts`
  - `apps/api/server/utils/auth.ts`
  - `apps/api/server/api/auth/login.post.ts`
  - `apps/api/server/api/auth/logout.post.ts`
  - `apps/api/server/api/auth/me.get.ts`
  - `apps/api/server/error.ts`
  - `.env.example`
  - `.gitignore`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm exec node -e "...fetch auth endpoints..."`
- 验证结果：
  - 类型检查通过。
  - 构建通过。
  - `GET /api/auth/me` 未登录返回 `user: null`。
  - 坏密码登录返回 HTTP `401`，统一错误码 `INVALID_CREDENTIALS`。
  - 正确登录返回内置管理员用户和 `expiresAt`，并设置会话 Cookie。
  - 登录后 `GET /api/auth/me` 返回当前管理员用户。
  - `POST /api/auth/logout` 返回 `loggedOut: true`，之后当前用户恢复为 `null`。
- 遗留风险：
  - 当前用户来源仍是运行时配置的内置管理员，数据库用户、密码哈希和角色持久化留到后续阶段。
  - F0.3 只提供写操作鉴权工具；实际项目 start/stop/restart 等写接口在 F0.8 开发时必须调用并接入二次确认与审计。
  - 登录和登出审计已在 F0.4 引入 Prisma + SQLite 后补齐。

### F0.4 审计存储基础

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：引入 Prisma + SQLite 审计存储，建立 `AuditLog` 模型和审计写入工具，并让登录、登出先落审计。
- 范围：
  - `apps/api` 引入 Prisma Client 与 Prisma CLI。
  - SQLite 数据库默认路径固定为 `data/server-probe.sqlite`。
  - 新增 `AuditLog` 模型。
  - 新增 Prisma 单例和审计写入工具。
  - 登录成功、登录失败、登出写入审计。
- 不包含：
  - 审计列表查询接口和前端审计页。
  - 数据库用户表、密码哈希和角色持久化。
  - 项目 start/stop/restart 等写操作审计，留到对应功能接入。
- 完成内容：
  - 新增 `apps/api/prisma/schema.prisma`，定义 `AuditLog` 字段和常用索引。
  - `apps/api` 新增 `prisma:generate` 与 `db:push` 脚本；`dev`、`typecheck`、`build` 前自动生成 Prisma Client。
  - 新增 `usePrisma` 数据库工具，按运行时配置解析 SQLite URL，并确保数据库目录存在。
  - 新增 `writeAuditLog` 工具，记录用户、动作、目标、参数摘要、结果、错误、IP、User-Agent 和 traceId。
  - `POST /api/auth/login` 登录成功和失败均写审计，且只记录用户名，不记录密码。
  - `POST /api/auth/logout` 写入登出审计。
  - `.env.example` 补充 `DATABASE_URL`。
  - 已初始化本地 SQLite 文件 `data/server-probe.sqlite`。
- 变更文件：
  - `apps/api/package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/nitro.config.ts`
  - `apps/api/server/utils/database.ts`
  - `apps/api/server/utils/audit.ts`
  - `apps/api/server/api/auth/login.post.ts`
  - `apps/api/server/api/auth/logout.post.ts`
  - `.env.example`
  - `pnpm-lock.yaml`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm install`
  - `pnpm --filter @server-probe/api prisma:generate`
  - `pnpm --filter @server-probe/api db:push`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 临时启动 `pnpm --filter @server-probe/api dev` 后，用脚本请求登录失败、登录成功和登出，并查询 `AuditLog`。
- 验证结果：
  - Prisma Client 生成成功。
  - SQLite schema 同步成功，数据库文件位于 `data/server-probe.sqlite`。
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 坏密码登录返回 HTTP `401`；正确登录返回 HTTP `200`；登出返回 HTTP `200`。
  - 上述 3 次请求新增 3 条审计记录：`auth.login` failure、`auth.login` success、`auth.logout` success。
- 遗留风险：
  - 当前用户仍来自运行时配置的内置管理员；用户持久化留到后续阶段。
  - 审计查询接口和前端审计页尚未实现，后续 F0.15 接入。
  - 本次接口验证时本机 `5000` 端口已被其他进程占用，临时 Nitro 服务回落到 `3000` 验证；项目脚本和配置仍固定后端端口 `5000`。
  - Prisma/Nuxt 构建过程中仍有上游依赖的 `DEP0155` deprecation warning，不影响当前验证结果。

### F0.5 服务器状态只读探针

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：实现服务器 CPU、内存、磁盘、OS 和运行时间只读采集，让总览接口返回真实指标并在采集失败时给出可读错误。
- 范围：
  - 共享系统状态 DTO。
  - CPU 使用率采样、核心数、型号、负载。
  - 内存总量、已用、可用、使用率。
  - 本地磁盘分区容量、已用、可用、使用率。
  - OS 平台、内核/系统版本、架构、主机名、运行时间、Node 版本。
  - 系统摘要和只读详情接口。
- 不包含：
  - 网络吞吐采集。
  - SSE 指标流。
  - 指标历史趋势或 ring buffer。
  - 前端总览页接入。
- 完成内容：
  - `packages/shared` 新增 `SystemCpuData`、`SystemMemoryData`、`SystemDisksData`、`DiskUsageData`、`SystemOsData` 和 `SystemProbeError` 类型。
  - 新增 `apps/api/server/modules/system/collector.ts`，集中实现只读系统采集。
  - `GET /api/system/summary` 改为真实指标摘要，保留统一响应结构和 traceId。
  - 新增 `GET /api/system/cpu`、`GET /api/system/memory`、`GET /api/system/disks`、`GET /api/system/os`。
  - 磁盘采集使用固定白名单命令：Windows 使用 `powershell.exe` 读取 `Win32_LogicalDisk`，Linux 使用 `df -kP -T`，macOS 使用 `df -kP`；不接收任何前端命令输入。
  - 磁盘命令设置 1.5 秒超时和输出大小限制；采集失败会进入 `errors` 和 `notes`，摘要状态降级为 `degraded`。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `apps/api/server/modules/system/collector.ts`
  - `apps/api/server/api/system/summary.get.ts`
  - `apps/api/server/api/system/cpu.get.ts`
  - `apps/api/server/api/system/memory.get.ts`
  - `apps/api/server/api/system/disks.get.ts`
  - `apps/api/server/api/system/os.get.ts`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 临时启动 `pnpm --filter @server-probe/api dev` 后，用脚本请求 `/api/system/summary`、`/api/system/cpu`、`/api/system/memory`、`/api/system/disks`、`/api/system/os`。
- 验证结果：
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - `/api/system/summary` 返回 HTTP `200`，本机验证耗时约 `243ms`，低于 3 秒验收要求。
  - `/api/system/cpu`、`/api/system/memory`、`/api/system/disks`、`/api/system/os` 均返回 HTTP `200`。
  - 本机 Windows 验证采集到 3 个本地磁盘分区，`errors` 数量为 0。
- 遗留风险：
  - Windows 磁盘采集依赖 PowerShell `Get-CimInstance`；Linux 生产环境依赖 `df` 命令。
  - 当前只做实时只读采集，不缓存历史指标；指标历史趋势留到 F1.5。
  - 网络吞吐、指标 SSE 流不在 F0.5 范围。
  - 本次接口验证时本机 `5000` 端口仍被其他进程占用，临时 Nitro 服务回落到 `3000` 验证；项目脚本和配置仍固定后端端口 `5000`。
  - Prisma/Nuxt 构建过程中仍有上游依赖的 `DEP0155` deprecation warning，不影响当前验证结果。

### F0.6 项目纳管配置加载

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：读取并校验 `config/projects.yaml`，暴露配置加载状态和校验错误；当配置加载失败时明确禁用后续项目写操作。
- 范围：
  - `config/projects.yaml` YAML 解析。
  - 项目配置 schema 校验。
  - 项目 id 唯一校验。
  - `deploy_path` 和 `log_files` 绝对路径校验。
  - 配置状态只读接口。
- 不包含：
  - 项目列表正式接口。
  - 项目运行状态检测。
  - start/stop/restart 等项目写操作。
  - 在线编辑项目配置。
- 完成内容：
  - `apps/api` 新增 `yaml` 和 `zod` 依赖，用于结构化解析与 schema 校验。
  - `packages/shared` 新增项目纳管配置、健康检查、配置问题和配置状态 DTO。
  - 新增 `apps/api/server/modules/projects/config.ts`，实现 `loadProjectsConfig` 与 `ensureProjectsConfigWritable`。
  - 新增 `GET /api/projects/config/status`，返回 `loaded`、`writeEnabled`、`configPath`、`projects` 和 `issues`。
  - `.env.example` 和 Nitro runtime config 支持 `PROBE_PROJECTS_CONFIG_PATH` 覆盖配置路径。
  - 合法空配置 `version: 1, projects: []` 可加载，且 `writeEnabled: true`。
  - 配置缺失、YAML/schema 错误、重复 id、相对路径等问题会返回 `loaded: false`、`writeEnabled: false` 和可读 issues。
- 变更文件：
  - `apps/api/package.json`
  - `apps/api/nitro.config.ts`
  - `apps/api/server/modules/projects/config.ts`
  - `apps/api/server/api/projects/config/status.get.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `.env.example`
  - `pnpm-lock.yaml`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 临时启动 `pnpm --filter @server-probe/api dev` 后请求 `GET /api/projects/config/status`。
  - 使用临时坏配置覆盖 `PROBE_PROJECTS_CONFIG_PATH` 后再次请求 `GET /api/projects/config/status`。
- 验证结果：
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 默认 `config/projects.yaml` 返回 HTTP `200`，`loaded: true`、`writeEnabled: true`、`projectCount: 0`、`issues: []`。
  - 临时坏配置返回 HTTP `200`，`loaded: false`、`writeEnabled: false`，并暴露 `DUPLICATE_PROJECT_ID`、`DEPLOY_PATH_NOT_ABSOLUTE`、`LOG_FILE_NOT_ABSOLUTE`。
- 遗留风险：
  - 当前只暴露配置状态，正式项目列表和详情留到 F0.7。
  - `ensureProjectsConfigWritable` 已预留给后续写操作，但 start/stop/restart 在 F0.8 才接入。
  - 本次接口验证时本机 `5000` 端口仍被其他进程占用，临时 Nitro 服务回落到 `3000` 验证；项目脚本和配置仍固定后端端口 `5000`。
  - Prisma/Nuxt 构建过程中仍有上游依赖的 `DEP0155` deprecation warning，不影响当前验证结果。

### F0.7 项目列表与状态查看

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-15
- 状态：`CONFIRMED`
- 目标：实现项目列表、项目详情和项目状态只读接口，基于纳管配置返回端口、进程和健康检查状态。
- 范围：
  - `GET /api/projects`。
  - `GET /api/projects/:id`。
  - `GET /api/projects/:id/status`。
  - 项目状态归一为运行中、已停止、异常、未知。
- 不包含：
  - start/stop/restart 等项目写操作。
  - 前端项目页。
  - 日志搜索或实时日志流。
- 完成内容：
  - `packages/shared` 新增项目列表、详情、状态、端口、进程和健康检查 DTO。
  - 新增 `apps/api/server/modules/projects/status.ts`，集中实现项目状态只读探测。
  - 新增 `GET /api/projects`，返回配置元信息、项目列表和每个项目的当前状态。
  - 新增 `GET /api/projects/:id`，返回单个项目配置和状态。
  - 新增 `GET /api/projects/:id/status`，返回单个项目状态。
  - 项目状态归一为 `running`、`stopped`、`error`、`unknown`。
  - 端口探测使用 Node TCP 连接；健康检查支持配置中的 HTTP/TCP/none；端口进程识别使用固定只读命令，Windows 使用 `Get-NetTCPConnection`，Linux 优先 `ss`，其他环境回退 `lsof`。
  - 配置加载失败时项目列表仍暴露配置问题和 `writeEnabled: false`，项目状态降级为 `unknown`，不继续探测端口或健康检查。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `apps/api/server/modules/projects/status.ts`
  - `apps/api/server/api/projects/index.get.ts`
  - `apps/api/server/api/projects/[id]/index.get.ts`
  - `apps/api/server/api/projects/[id]/status.get.ts`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 使用临时合法项目配置启动构建后的 API，验证 `GET /api/projects/config/status`、`GET /api/projects`、`GET /api/projects/:id`、`GET /api/projects/:id/status`。
  - 使用临时坏配置启动构建后的 API，验证 `GET /api/projects` 暴露配置问题并禁用写操作。
- 验证结果：
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 合法配置下项目列表返回 3 个项目；状态分别验证为 `running`、`stopped`、`unknown`。
  - `GET /api/projects/running-api` 返回项目详情；不存在项目的 `GET /api/projects/missing/status` 返回 HTTP `404`。
  - 坏配置下项目列表返回 `loaded: false`、`writeEnabled: false`、3 条配置问题，项目状态降级为 `unknown`。
- 遗留风险：
  - 端口进程识别依赖系统只读工具；权限不足或系统缺少 `ss`/`lsof` 时仍可返回端口与健康状态，但 `processStatus` 可能为空并在 `reasons` 中说明。
  - HTTP 健康检查当前以 `2xx/3xx` 为健康，非 `2xx/3xx` 或请求失败判为不健康。
  - start/stop/restart、操作锁、二次确认和写操作审计仍留到 F0.8。
  - 本次构建仍出现上游依赖的 `DEP0155` deprecation warning，不影响验证结果。

### F0.8 受控项目操作

- 开始时间：2026-05-15
- 完成时间：2026-05-15
- 确认时间：2026-05-16
- 状态：`CONFIRMED`
- 目标：实现基于纳管配置的 start/stop/restart 受控项目写操作，包含白名单执行、超时、输出限制、项目级操作锁、二次确认和审计。
- 范围：
  - `POST /api/projects/:id/start`。
  - `POST /api/projects/:id/stop`。
  - `POST /api/projects/:id/restart`。
  - 只执行项目配置中的对应命令。
  - 写操作必须登录、鉴权、审计。
  - 同一项目同一时间只允许一个操作执行。
- 不包含：
  - 前端确认弹窗。
  - 项目操作队列或后台任务。
  - 在线编辑项目配置。
- 完成内容：
  - `packages/shared` 新增项目操作请求、确认、执行结果和响应 DTO。
  - 新增 `apps/api/server/modules/projects/operations.ts`，集中实现受控项目操作。
  - 新增 `POST /api/projects/:id/start`、`POST /api/projects/:id/stop`、`POST /api/projects/:id/restart`。
  - 写操作要求已登录且角色为 `admin` 或 `operator`。
  - 请求体只接受二次确认信息：`confirmation.projectId` 和 `confirmation.projectName` 必须与目标项目匹配；不接受任意命令字段。
  - 命令只来自 `projects.yaml` 中对应项目的 `start_cmd`、`stop_cmd`、`restart_cmd`。
  - 命令执行使用固定工作目录 `deploy_path`，并校验该路径必须存在且为目录。
  - 命令行解析后使用 `child_process.spawn` 且 `shell: false` 执行；未加引号的 shell 控制符会被拒绝。
  - 命令设置 30 秒超时，超时后终止进程，并限制 stdout/stderr 各 32 KiB。
  - 使用项目级内存锁拒绝同一项目并发操作。
  - 写操作成功、失败、确认错误、命令失败和锁冲突都会写入审计记录。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `apps/api/server/modules/projects/operations.ts`
  - `apps/api/server/api/projects/[id]/start.post.ts`
  - `apps/api/server/api/projects/[id]/stop.post.ts`
  - `apps/api/server/api/projects/[id]/restart.post.ts`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 使用临时项目配置和临时 SQLite 副本启动构建后的 API，验证未登录、二次确认、成功命令、失败命令、并发锁和审计记录。
- 验证结果：
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 未登录调用项目操作返回 HTTP `401`。
  - 登录后二次确认项目名不匹配返回 HTTP `400`。
  - `start` 测试命令返回 `operation.status: succeeded`。
  - `stop` 测试命令以退出码 `2` 返回 `operation.status: failed`。
  - 两个并发 `restart` 请求返回一个 HTTP `200`、一个 HTTP `409`，验证项目级操作锁生效。
  - 临时数据库中写入 5 条项目操作审计，包含成功和失败结果。
- 遗留风险：
  - 操作锁为当前 Node 进程内存锁；多实例部署时需要后续迁移到数据库或分布式锁。
  - 当前命令行解析支持常见可执行文件加参数场景；复杂 shell 管道、重定向和未加引号的控制符会被拒绝，生产中可通过受控脚本封装复杂动作。
  - stdout/stderr 仅保留前 32 KiB，完整命令日志应由后续日志功能读取项目声明日志文件。
  - 本次构建仍出现上游依赖的 `DEP0155` deprecation warning，不影响验证结果。

### F0.9 历史日志搜索

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 确认时间：2026-05-16
- 状态：`CONFIRMED`
- 目标：实现按项目、关键词、时间和 limit 检索历史日志，只读取 `projects.yaml` 声明的日志文件，并限制单次读取行数和大小。
- 范围：
  - `GET /api/logs?projectId=&keyword=&from=&to=&limit=`。
  - 只读取项目配置中的 `log_files`。
  - 支持关键词筛选和时间区间筛选。
  - 限制单次读取大小和返回行数。
- 不包含：
  - 实时日志 SSE。
  - 前端日志页。
  - 日志内容入库。
- 完成内容：
  - `packages/shared` 新增历史日志搜索查询、日志条目、文件读取摘要和响应 DTO。
  - 新增 `apps/api/server/modules/logs/search.ts`，集中实现历史日志只读搜索。
  - 新增 `GET /api/logs?projectId=&keyword=&from=&to=&limit=`。
  - 日志文件只来自已加载项目配置中的 `log_files`，不接受前端传入任意路径。
  - 支持按 `projectId` 限定项目；未传 `projectId` 时按配置项目顺序搜索全部项目。
  - 支持关键词过滤，大小写不敏感。
  - 支持 `from` / `to` 时间过滤；日志行会识别 ISO 时间戳和常见 `YYYY-MM-DD HH:mm:ss` / `YYYY/MM/DD HH:mm:ss` 时间戳。
  - 单文件最多读取尾部 1 MiB，单次请求最多读取 5 MiB，单文件最多扫描 5000 行，返回 limit 默认 200、最大 1000。
  - 缺失或不可读日志文件不会让整个请求失败，会在文件摘要中返回错误。
  - 如果项目配置加载失败，接口返回 HTTP `409`，不读取任何日志文件。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `apps/api/server/modules/logs/search.ts`
  - `apps/api/server/api/logs.get.ts`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 使用临时 `projects.yaml` 和临时日志文件启动构建后的 API，验证关键词、时间区间、limit、项目过滤、缺失日志文件摘要、未知项目和非法 limit。
- 验证结果：
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - `projectId=app-one&keyword=needle&from=2026-05-16T01:30:00.000Z&to=2026-05-16T02:30:00.000Z` 返回 1 条匹配日志。
  - `keyword=needle&limit=2` 返回 2 条并标记 `truncated: true`。
  - `projectId=app-two&keyword=needle` 只返回 `app-two` 日志。
  - 缺失日志文件出现在文件读取摘要中，不影响其他文件结果。
  - 不存在项目返回 HTTP `404`。
  - `limit=1001` 返回 HTTP `400`。
- 遗留风险：
  - 时间过滤依赖日志行中可解析的时间戳；启用 `from` / `to` 时，没有可解析时间戳的日志行会被排除。
  - 当前只读取文件尾部固定大小，超大日志文件的更早内容不会被扫描；后续可增加游标、分页或按时间索引。
  - 当前历史日志接口未做审计记录；日志只读访问审计可在后续安全增强中统一设计。
  - 构建时仍出现 Prisma 7 更新提示和上游依赖 `DEP0155` deprecation warning，不影响验证结果。

### F0.10 实时日志 SSE

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 确认时间：2026-05-16
- 状态：`CONFIRMED`
- 目标：实现单项目实时日志 SSE，浏览器可用 `EventSource` 订阅 `GET /api/logs/stream?projectId=`，事件类型包含 `log`、`heartbeat` 和 `error`。
- 范围：
  - `GET /api/logs/stream?projectId=`。
  - 使用 SSE。
  - SSE 必须鉴权。
  - 日志路径只来自项目配置中的 `log_files`。
  - 断线后前端可通过 EventSource 自动重连。
- 不包含：
  - 前端日志页。
  - 历史日志补发。
  - 多项目合并实时流。
- 完成内容：
  - `packages/shared` 新增实时日志 SSE 事件 DTO，包含 `log`、`heartbeat` 和 `error` 三类事件数据结构。
  - 新增 `apps/api/server/modules/logs/stream.ts`，集中实现单项目日志文件 tail、SSE 写入、心跳、错误事件和连接清理。
  - 新增 `GET /api/logs/stream?projectId=`，要求已登录后才能通过 Cookie 会话订阅，兼容浏览器 `EventSource`。
  - `projectId` 为必填，当前只支持单项目实时流；日志文件只来自项目配置中的 `log_files`。
  - 新连接从当前文件末尾开始监听，不补发历史内容；历史日志继续由 F0.9 的 `GET /api/logs` 负责。
  - SSE 初始写入 `retry: 3000`，每 15 秒发送 `heartbeat`，每 1 秒轮询文件增量。
  - 单文件单次最多读取 64 KiB、最多发送 500 行，单行最多 8000 字符；超过限制会发送 `error` 事件提示截断。
  - 日志文件缺失、不可用、路径非文件、截断或轮转时会发送 `error` 事件，并在可恢复场景下继续监听。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `apps/api/server/modules/logs/stream.ts`
  - `apps/api/server/api/logs/stream.get.ts`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 使用临时 `projects.yaml`、临时日志文件和临时 SQLite 副本启动构建后的 API，验证未登录、登录后未知项目、SSE 心跳和追加日志推送。
- 验证结果：
  - 类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 未登录订阅 `GET /api/logs/stream?projectId=app-one` 返回 HTTP `401`，错误码为 `UNAUTHORIZED`。
  - 登录后订阅不存在项目返回 HTTP `404`，错误码为 `PROJECT_NOT_FOUND`。
  - 登录后订阅存在项目返回 HTTP `200`，响应 `content-type` 为 `text/event-stream`，首先收到 `heartbeat` 事件。
  - 向临时日志文件追加新行后收到 `log` 事件，事件中的 `projectId`、`filePath` 和日志内容符合预期。
  - 自测结束后已清理临时 API 进程，临时端口确认未继续监听。
- 遗留风险：
  - 当前实时监听使用轮询 tail，日志推送通常存在最多约 1 秒延迟。
  - SSE 断线重连会从新连接时的文件末尾继续，不补发断线期间遗漏内容；需要回看时使用历史日志搜索接口。
  - 高吞吐日志在单 tick 超过读取或发送上限时会被跳过部分内容，并通过 `error` 事件提示截断。
  - `EventSource` 依赖浏览器自动携带同源 Cookie；后续跨域部署前端时需要配合反向代理或 CORS 凭据策略。

### F0.11 前端登录页

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 确认时间：2026-05-16
- 状态：`CONFIRMED`
- 目标：实现 Nuxt 登录页面、错误提示和登录成功跳转。
- 范围：
  - 登录页面。
  - 调用后端 `POST /api/auth/login`。
  - 登录失败提示。
  - 登录成功后跳转到总览页。
- 不包含：
  - 完整前端鉴权中间件。
  - 用户管理、密码修改或角色管理。
  - 前端总览页真实数据接入。
- 完成内容：
  - 新增 `app/pages/login.vue`，使用独立布局实现登录首屏，不显示默认侧边栏。
  - 新增 `app/components/auth/LoginPanel.vue`，负责登录表单 UI、加载状态和错误提示，使用 `<script setup lang="ts">` 与显式 props/emits。
  - 新增 `app/composables/useLoginForm.ts`，封装用户名、密码、提交状态、错误归一和登录成功跳转。
  - 登录表单调用同源 `/api/auth/login`，并携带 `credentials: "include"`，成功后跳转到 `/`。
  - `apps/web/nuxt.config.ts` 新增 `/api/**` 代理到 `NUXT_PUBLIC_API_BASE`，避免开发环境前端 `5100` 直连后端 `5000` 时出现跨端口 Cookie/CORS 问题。
  - 登录页视觉贴近 `demo1.html` 的深色运维控制台风格，保留紧凑面板、深色背景、蓝/绿/紫状态点和小圆角表单控件。
- 变更文件：
  - `apps/web/nuxt.config.ts`
  - `apps/web/app/pages/login.vue`
  - `apps/web/app/components/auth/LoginPanel.vue`
  - `apps/web/app/composables/useLoginForm.ts`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm --filter @server-probe/web typecheck`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - 临时启动构建后的 API `5000` 和 Web `5100`，请求登录页和 Web 同源登录代理。
  - 使用本机 Chrome headless/CDP 打开 `http://127.0.0.1:5100/login`，验证页面渲染、错误密码提示和正确密码跳转。
- 验证结果：
  - Web 类型检查通过。
  - 全仓库类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - `GET /login` 返回 HTTP `200`，页面包含“服务器探针”“用户名”“密码”“登录”等登录表单文本。
  - 通过 Web 同源 `/api/auth/login` 提交错误密码返回 HTTP `401`，错误码 `INVALID_CREDENTIALS`。
  - 通过 Web 同源 `/api/auth/login` 提交正确账号返回 HTTP `200`，并设置 `server_probe_session` Cookie。
  - Chrome headless/CDP 页面交互验证通过：错误密码显示“用户名或密码错误”，正确密码登录后跳转到 `/`，并落到总览页。
  - 临时 API/Web/Chrome 进程已清理，`5000` 和 `5100` 端口确认释放。
- 遗留风险：
  - 当前仅实现登录页本身，尚未实现全局鉴权中间件；未登录访问其他前端页面的重定向留到后续前端鉴权增强。
  - 登录成功后跳转到现有总览骨架页，真实总览数据接入属于 F0.12。
  - 当前仍使用 F0.3 的内置管理员认证；用户持久化和密码管理不在 F0.11 范围。
  - 构建时仍出现既有的 Nuxt sourcemap warning 和上游依赖 `DEP0155` deprecation warning，不影响当前验证结果。

### F0.12 前端总览页

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 确认时间：2026-05-16
- 状态：`CONFIRMED`
- 目标：按 `demo1.html` 风格实现总览页，展示服务器核心状态、项目健康摘要和最近审计入口。
- 范围：
  - 总览页主视觉和卡片布局。
  - 接入后端系统摘要与项目摘要接口。
  - 最近审计入口和占位摘要区。
  - 移动端布局不溢出。
- 不包含：
  - 实时网络吞吐图表。
  - 后端审计列表接口（`F0.15` 实现）。
  - 全局前端鉴权中间件。
- 完成内容：
  - 新增 `app/composables/useOverviewDashboard.ts`，统一并发拉取 `/api/system/summary` 与 `/api/projects`，支持部分失败降级、状态聚合和手动刷新。
  - 新增 `app/components/overview/SystemMetricsGrid.vue`，展示 CPU、内存、磁盘、负载 4 张指标卡，风格贴近 `demo1.html`。
  - 新增 `app/components/overview/ProjectSummaryCard.vue`，展示项目总数、运行中、异常/停止和配置可写状态。
  - 新增 `app/components/overview/OverviewHighlights.vue`，展示最近项目状态列表和摘要信息。
  - 新增 `app/components/overview/RecentAuditsCard.vue`，提供“进入审计页”入口和最近审计占位摘要。
  - 新增 `app/utils/format.ts`，统一字节、百分比、负载和时间格式化。
  - 重写 `app/pages/index.vue`：新增头部状态条、刷新按钮、错误/告警区、总览分栏布局。
  - 更新 `app/layouts/default.vue` 与 `app/assets/css/main.css`，补充顶部“最近审计”入口和状态样式。
- 变更文件：
  - `apps/web/app/composables/useOverviewDashboard.ts`
  - `apps/web/app/utils/format.ts`
  - `apps/web/app/components/overview/SystemMetricsGrid.vue`
  - `apps/web/app/components/overview/ProjectSummaryCard.vue`
  - `apps/web/app/components/overview/OverviewHighlights.vue`
  - `apps/web/app/components/overview/RecentAuditsCard.vue`
  - `apps/web/app/pages/index.vue`
  - `apps/web/app/layouts/default.vue`
  - `apps/web/app/assets/css/main.css`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm --filter @server-probe/web typecheck`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- 验证结果：
  - Web 类型检查通过。
  - 全仓库类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 构建产物包含新的总览组件切片（`SystemMetricsGrid`、`ProjectSummaryCard`、`OverviewHighlights`、`RecentAuditsCard`）。
- 遗留风险：
  - “最近审计”目前为入口+占位摘要，真实审计列表接口和筛选功能依赖 `F0.15`。
  - 当前总览页未接入自动轮询刷新，默认依赖手动刷新按钮。
  - 构建时仍出现既有 Nuxt sourcemap warning 和 `DEP0155` deprecation warning，不影响当前验证结果。

### F0.13 前端项目页

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 确认时间：2026-05-16
- 状态：`CONFIRMED`
- 目标：实现项目页项目表格、筛选、状态、操作按钮和确认弹窗，保证危险操作显示明确目标且执行中有 loading 与结果反馈。
- 范围：
  - 项目列表数据加载与错误反馈。
  - 关键词 + 状态筛选。
  - 项目状态摘要展示。
  - 启动/停止/重启操作按钮。
  - 二次确认弹窗。
  - 操作执行中的 loading 与结果提示。
- 不包含：
  - 项目详情独立页面。
  - 批量操作。
  - 全局鉴权中间件。
- 完成内容：
  - 新增 `app/composables/useProjectsPage.ts`，封装项目列表加载、筛选、操作请求、弹窗状态和结果反馈逻辑。
  - 新增 `app/components/projects/ProjectsStatusChips.vue`，展示总项目数与运行状态统计。
  - 新增 `app/components/projects/ProjectsFilterBar.vue`，支持关键词输入、状态筛选和手动刷新。
  - 新增 `app/components/projects/ProjectsTable.vue`，展示项目表格和操作按钮；按钮在执行中显示 loading 状态。
  - 新增 `app/components/projects/ProjectOperationDialog.vue`，实现 start/stop/restart 的二次确认弹窗，明确展示目标项目名和项目 ID。
  - 新增 `app/components/projects/ProjectsToast.vue`，显示操作成功/失败反馈。
  - 重写 `app/pages/projects.vue`，完成页面组装、配置异常展示、操作闭环和移动端适配。
- 变更文件：
  - `apps/web/app/composables/useProjectsPage.ts`
  - `apps/web/app/components/projects/ProjectsStatusChips.vue`
  - `apps/web/app/components/projects/ProjectsFilterBar.vue`
  - `apps/web/app/components/projects/ProjectsTable.vue`
  - `apps/web/app/components/projects/ProjectOperationDialog.vue`
  - `apps/web/app/components/projects/ProjectsToast.vue`
  - `apps/web/app/pages/projects.vue`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm --filter @server-probe/web typecheck`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- 验证结果：
  - Web 类型检查通过。
  - 全仓库类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - 构建产物包含新的项目页组件切片（`ProjectsFilterBar`、`ProjectsStatusChips`、`ProjectsTable`、`ProjectOperationDialog`、`ProjectsToast`）。
- 遗留风险：
  - 当前操作成功/失败反馈以内存态展示，页面刷新后不会保留历史操作结果。
  - 项目页默认调用列表接口并发状态探测，项目规模增大后可考虑分页或按需刷新优化。
  - 构建时仍出现既有 Nuxt sourcemap warning 和 `DEP0155` deprecation warning，不影响本次功能验证结果。

### F0.14 前端日志页

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 状态：`READY_FOR_REVIEW`
- 目标：实现日志页历史日志搜索与实时日志查看，支持关键词高亮与暂停自动滚动。
- 范围：
  - 日志页 UI 与交互。
  - 历史日志筛选与查询。
  - 实时日志 SSE 订阅状态展示。
  - 暂停自动滚动与清空实时流。
- 不包含：
  - 多项目合并实时流。
  - 实时日志断线期间补发。
  - 日志下载导出。
- 完成内容：
  - 新增 `app/composables/useLogViewer.ts`，封装项目加载、历史查询、SSE 连接、重连状态、错误事件和清理逻辑。
  - 重写 `app/pages/logs.vue`，提供项目选择、关键词/时间/limit 条件筛选、历史日志列表、文件读取摘要和实时日志分栏。
  - 历史日志消息支持关键词高亮，使用 HTML 转义后再做高亮替换，避免未转义内容注入。
  - 实时区支持“暂停滚动 / 继续滚动”和“清空”操作；暂停滚动仅停止自动滚动，不停止日志接收。
  - 实时区展示连接状态（已连接/重连中/未连接）和 SSE `error` 事件摘要，便于排障。
- 变更文件：
  - `apps/web/app/composables/useLogViewer.ts`
  - `apps/web/app/pages/logs.vue`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm --filter @server-probe/web typecheck`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- 验证结果：
  - Web 类型检查通过。
  - 全仓库类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 构建通过。
  - Web 构建产物包含新的日志页入口与样式分片（`logs-*.mjs`、`logs*.css`）。
- 遗留风险：
  - 当前实时日志按内存列表保留最近 500 条；刷新页面后不会保留。
  - 暂停滚动期间仍持续接收日志，长时间暂停可能较快达到内存条目上限。
  - 构建时仍出现既有 Nuxt sourcemap warning 和 `DEP0155` deprecation warning，不影响本次功能验证结果。

### F0.15 前端审计页

- 开始时间：2026-05-16
- 完成时间：2026-05-16
- 状态：`READY_FOR_REVIEW`
- 目标：实现审计列表页，支持筛选、分页和写操作审计可查。
- 范围：
  - 后端审计查询接口。
  - 前端审计页筛选与分页。
  - 审计结果可视化（成功/失败、错误、traceId）。
- 不包含：
  - 审计删除能力（普通用户不可删除，且当前不提供删除接口）。
  - 审计统计图表。
  - 审计导出。
- 完成内容：
  - `packages/shared` 新增审计 DTO：`AuditLogItemData`、`AuditListQueryData`、`AuditListData`。
  - 新增 `apps/api/server/modules/audit/list.ts`，实现审计查询参数解析、Zod 校验、时间区间校验、Prisma 分页查询。
  - 新增 `GET /api/audits`，要求登录后访问并返回统一成功响应结构。
  - 新增 `app/composables/useAuditsPage.ts`，封装筛选状态、分页、请求与错误处理。
  - 重写 `app/pages/audits.vue`，实现筛选表单、审计表格、结果态样式、分页导航和当前筛选摘要。
  - 为兼容 Nitro 构建链路，调整 `apps/api/server/utils/auth.ts`、`apps/api/server/utils/database.ts`、`apps/api/server/modules/projects/config.ts`、`apps/api/server/error.ts` 的运行时配置与错误处理导入方式，恢复 `pnpm typecheck/build` 可用性。
- 变更文件：
  - `packages/shared/src/index.ts`
  - `packages/shared/dist/index.js`
  - `packages/shared/dist/index.d.ts`
  - `packages/shared/dist/index.d.ts.map`
  - `apps/api/server/modules/audit/list.ts`
  - `apps/api/server/api/audits.get.ts`
  - `apps/api/server/utils/auth.ts`
  - `apps/api/server/utils/database.ts`
  - `apps/api/server/modules/projects/config.ts`
  - `apps/api/server/error.ts`
  - `apps/web/app/composables/useAuditsPage.ts`
  - `apps/web/app/pages/audits.vue`
  - `docs/FEATURES.md`
- 验证命令：
  - `pnpm --filter @server-probe/shared build`
  - `pnpm --filter @server-probe/web typecheck`
  - `pnpm --filter @server-probe/api build`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- 验证结果：
  - Shared 构建通过，导出类型产物已更新。
  - Web 类型检查通过。
  - API 构建通过。
  - 全仓库类型检查通过。
  - 测试脚本通过；当前测试数为 0。
  - 全仓库构建通过；Web 构建产物包含新的审计页入口与样式分片（`audits-*.mjs`、`audits*.css`）。
- 遗留风险：
  - 当前审计查询未提供排序切换，固定按 `createdAt desc` 返回。
  - 审计列表为页码分页，尚未提供游标分页与高并发数据优化。
  - 构建时仍存在既有 `DEP0155` deprecation warning 与 Nuxt sourcemap warning，不影响本次功能验证结果。
