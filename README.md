# server-probe-agent

服务器探针与轻量运维面板。

当前项目处于产品与技术规范阶段，核心约定：

- 前端：Nuxt 4，端口 `5100`
- 后端：Nitro/h3 + TypeScript，端口 `5000`
- 项目形态：pnpm workspace monorepo
- 默认数据库：SQLite，后续可扩展 PostgreSQL
- 项目纳管配置：`config/projects.yaml`
- 推荐部署方式：Docker Compose，备选 pnpm 构建 + systemd
- 前端样式参考：`demo1.html`

文档：

- [产品需求文档 PRD](docs/PRD.md)
- [技术规范](docs/TECH_SPEC.md)
- [功能清单与开发留痕](docs/FEATURES.md)

## 开发启动

本项目统一使用 `pnpm`。

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

- `pnpm dev:api`：启动 Nitro/h3 API，监听 `5000`。
- `pnpm dev:web`：启动 Nuxt Web，监听 `5100`。
- `NUXT_PUBLIC_API_BASE` 默认值为 `http://localhost:5000`，可参考 `.env.example`。

## Docker Compose 部署

生产环境推荐使用 Docker Compose。

1. 准备环境变量

```bash
cp .env.example .env
```

必改项：

- `PROBE_ADMIN_PASSWORD`
- `PROBE_SESSION_SECRET`

2. 若宿主机 PM2 不在 `/root/.pm2`，设置宿主机 PM2 路径

```bash
export HOST_PM2_HOME=/root/.pm2
```

3. 启动服务

```bash
docker compose build
docker compose up -d
```

4. 验证

```bash
curl -f http://127.0.0.1:5000/health
curl -I http://127.0.0.1:5100/
```

说明：

- Compose 使用 `host` 网络，固定监听端口：API `5000`、Web `5100`。
- 挂载了 `./config`、`./data`，以及宿主机 `docker.sock`、PM2 目录，便于探针纳管宿主机 Docker 与 PM2 项目。
- 如果纳管的是宿主机 PM2 进程，`config/projects.yaml` 中 PM2 命令建议显式带上 `PM2_HOME=/root/.pm2`。
