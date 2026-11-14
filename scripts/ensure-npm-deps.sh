#!/usr/bin/env bash
# 在缺少 node_modules 时自动安装根目录与 server 依赖（npm run dev/server/start 与 Cloud start 共用）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

root_ok() {
  [[ -f "$ROOT/node_modules/vite/package.json" ]]
}

server_ok() {
  [[ -f "$ROOT/server/node_modules/express/package.json" ]]
}

install_root() {
  echo ">>> 安装前端依赖..."
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

install_server() {
  echo ">>> 安装后端依赖..."
  if [[ -f server/package-lock.json ]]; then
    npm ci --prefix server
  else
    npm install --prefix server
  fi
}

if $FORCE; then
  install_root
  install_server
  exit 0
fi

if root_ok && server_ok; then
  exit 0
fi

echo ">>> 检测到缺少 npm 依赖，正在自动安装..."
if ! root_ok; then
  install_root
fi
if ! server_ok; then
  install_server
fi