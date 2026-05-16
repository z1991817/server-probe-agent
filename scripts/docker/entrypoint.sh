#!/bin/sh
set -eu

cd /app

: "${PROBE_API_PORT:=5000}"
: "${PROBE_WEB_PORT:=5100}"
: "${NUXT_PUBLIC_API_BASE:=http://127.0.0.1:${PROBE_API_PORT}}"
: "${PROBE_PROJECTS_CONFIG_PATH:=/app/config/projects.yaml}"
: "${DATABASE_URL:=file:/app/data/server-probe.sqlite}"

export PM2_HOME=/tmp/pm2
export NITRO_HOST=0.0.0.0
export NITRO_PORT="${PROBE_API_PORT}"
export HOST=0.0.0.0
export PORT="${PROBE_WEB_PORT}"
export NUXT_PUBLIC_API_BASE
export PROBE_PROJECTS_CONFIG_PATH
export DATABASE_URL

mkdir -p /tmp/pm2

pm2 start /app/apps/api/.output/server/index.mjs --name server-probe-api --cwd /app/apps/api
pm2 start /app/apps/web/.output/server/index.mjs --name server-probe-web --cwd /app/apps/web

exec pm2-runtime list
