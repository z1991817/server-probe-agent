FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @server-probe/shared build
RUN test -f /app/packages/shared/dist/index.d.ts && test -f /app/packages/shared/dist/index.js
RUN pnpm --filter @server-probe/api build
RUN pnpm --filter @server-probe/web build
RUN pnpm --filter @server-probe/api db:push

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git procps iproute2 lsof net-tools docker.io \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2@latest

COPY --from=build /app/apps/api/.output /app/apps/api/.output
COPY --from=build /app/apps/web/.output /app/apps/web/.output
COPY --from=build /app/config /app/config
COPY --from=build /app/data /app/data
COPY scripts/docker/entrypoint.sh /usr/local/bin/server-probe-entrypoint.sh
RUN chmod +x /usr/local/bin/server-probe-entrypoint.sh

EXPOSE 5000 5100

CMD ["/usr/local/bin/server-probe-entrypoint.sh"]
