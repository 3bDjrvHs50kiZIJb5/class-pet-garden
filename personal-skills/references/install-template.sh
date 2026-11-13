#!/usr/bin/env bash
# 模板：复制到目标仓库 .cursor/cloud-agent-install.sh 后按项目修改
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- 可选：系统依赖（示例 MariaDB）---
# sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
# sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
#   mariadb-server mariadb-client

# --- 示例：Node monorepo ---
# command -v node >/dev/null || { echo "需要 Node"; exit 1; }
# npm ci
# npm ci --prefix server   # 若有子包

# --- 示例：Python ---
# python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

echo ">>> Cloud Agent install 完成"
