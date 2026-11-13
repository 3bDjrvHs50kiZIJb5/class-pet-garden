#!/usr/bin/env bash
# 模板：复制到目标仓库 .cursor/start.sh 后按项目修改
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG_DIR="/tmp/${PROJECT_SLUG:-my-app}"
mkdir -p "$LOG_DIR"
SESSION="${TMUX_SESSION:-my_app_dev}"

start_database() {
  # 示例 MariaDB
  if sudo mariadb-admin ping --silent 2>/dev/null; then return; fi
  sudo service mariadb start 2>/dev/null || sudo service mysql start 2>/dev/null || true
  for _ in $(seq 1 60); do
    sudo mariadb-admin ping --silent 2>/dev/null && return
    sleep 1
  done
  echo "数据库启动超时" >&2
  exit 1
}

ensure_database() {
  # 按项目改库名/用户/密码
  sudo mariadb <<'SQL'
CREATE DATABASE IF NOT EXISTS appdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app'@'localhost' IDENTIFIED BY 'app';
GRANT ALL PRIVILEGES ON appdb.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
SQL
}

export_app_env() {
  export DB_HOST=127.0.0.1
  export DB_PORT=3306
  export DB_USER=app
  export DB_PASSWORD=app
  export DB_NAME=appdb
  # export TOKEN_SECRET="${TOKEN_SECRET:-dev-only}"
}

start_dev() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then return; fi
  tmux new-session -d -s "$SESSION" -c "$ROOT" \
    "npm run dev 2>&1 | tee $LOG_DIR/dev.log"
  # 或多服务：npm start / 分别开 tmux 会话
}

start_database
ensure_database
export_app_env
start_dev

echo ">>> 日志: $LOG_DIR/dev.log"
