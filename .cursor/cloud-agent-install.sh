#!/usr/bin/env bash
# Cloud Agent build：安装系统依赖与 npm 包（会写入环境快照）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 未找到，请使用带 Node 的基础镜像或在 Dockerfile 中安装 Node"
  exit 1
fi

echo ">>> 安装 MariaDB（开发用）..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  mariadb-server \
  mariadb-client

echo ">>> 安装前端依赖..."
npm ci

echo ">>> 安装后端依赖..."
npm ci --prefix server

echo ">>> Cloud Agent install 完成"
