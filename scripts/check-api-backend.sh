#!/usr/bin/env bash
# 开发时提示：Vite 3001 会把 /pet-garden/api 代理到本机 API 端口
set -euo pipefail

API_PORT="${API_PORT:-3002}"
API_HOST="${API_HOST:-127.0.0.1}"

if curl -sf "http://${API_HOST}:${API_PORT}/api/health" >/dev/null \
  || curl -sf "http://${API_HOST}:${API_PORT}/pet-garden/api/health" >/dev/null; then
  exit 0
fi

echo ""
echo ">>> 警告：后端未在 http://${API_HOST}:${API_PORT} 响应。"
echo ">>> 前端 (3001) 需要通过 Vite 代理访问 API，请另开终端执行："
echo ">>>   npm run server   或   npm start（同时起前后端）"
echo ">>> 并确保已配置 DB_* / MariaDB（见 .env.example 或 scripts/start-dev.sh）"
echo ""
exit 0