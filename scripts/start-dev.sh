#!/usr/bin/env bash
# 一键开发：依赖 + 数据库 + 前后端（3001 / 3002）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/ensure-npm-deps.sh
bash scripts/ensure-dev-database.sh
# shellcheck source=scripts/dev-env.sh
source scripts/dev-env.sh

if ! command -v npx >/dev/null 2>&1; then
  echo "npx 未找到" >&2
  exit 1
fi

export API_HOST="${API_HOST:-127.0.0.1}"
export API_PORT="${API_PORT:-3002}"
echo ">>> 启动前后端（前端 3001，API ${API_PORT}；代理 → ${API_HOST}:${API_PORT}）..."
exec npx concurrently -k \
  -n vite,api \
  -c cyan,green \
  "vite" \
  "node --watch server/index.js"