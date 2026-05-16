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
