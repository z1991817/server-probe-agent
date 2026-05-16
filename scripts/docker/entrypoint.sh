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

PORT="${PROBE_API_PORT}" \
NITRO_HOST=0.0.0.0 \
NITRO_PORT="${PROBE_API_PORT}" \
node /app/apps/api/.output/server/index.mjs &
API_PID=$!

HOST=0.0.0.0 \
PORT="${PROBE_WEB_PORT}" \
NITRO_HOST=0.0.0.0 \
NITRO_PORT="${PROBE_WEB_PORT}" \
node /app/apps/web/.output/server/index.mjs &
WEB_PID=$!

echo "[entrypoint] server-probe-api pid=${API_PID} port=${PROBE_API_PORT}"
echo "[entrypoint] server-probe-web pid=${WEB_PID} port=${PROBE_WEB_PORT}"

shutdown() {
  kill "${API_PID}" "${WEB_PID}" 2>/dev/null || true
}

trap 'shutdown; exit 0' INT TERM

while :; do
  if ! kill -0 "${API_PID}" 2>/dev/null; then
    wait "${API_PID}" || true
    echo "[entrypoint] API process exited, stopping web process."
    kill "${WEB_PID}" 2>/dev/null || true
    wait "${WEB_PID}" 2>/dev/null || true
    exit 1
  fi

  if ! kill -0 "${WEB_PID}" 2>/dev/null; then
    wait "${WEB_PID}" || true
    echo "[entrypoint] Web process exited, stopping api process."
    kill "${API_PID}" 2>/dev/null || true
    wait "${API_PID}" 2>/dev/null || true
    exit 1
  fi

  sleep 2
done
