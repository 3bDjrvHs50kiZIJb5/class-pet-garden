#!/usr/bin/env bash
# 每次 Cloud Agent 启动时运行：MariaDB + 前后端开发服务
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG_DIR="/tmp/class-pet-garden"
mkdir -p "$LOG_DIR"
SESSION="class_pet_garden"

start_mariadb() {
  if sudo mariadb-admin ping --silent 2>/dev/null; then
    echo "MariaDB 已在运行"
    return
  fi
  echo ">>> 启动 MariaDB..."
  sudo service mariadb start 2>/dev/null || sudo service mysql start 2>/dev/null || true
  for _ in $(seq 1 60); do
    if sudo mariadb-admin ping --silent 2>/dev/null; then
      return
    fi
    sleep 1
  done
  echo "MariaDB 启动超时" >&2
  exit 1
}

ensure_database() {
  echo ">>> 初始化数据库与用户..."
  sudo mariadb <<'SQL'
CREATE DATABASE IF NOT EXISTS classpets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'classpets'@'localhost' IDENTIFIED BY 'classpets';
GRANT ALL PRIVILEGES ON classpets.* TO 'classpets'@'localhost';
FLUSH PRIVILEGES;
SQL
}

export_db_env() {
  export DB_HOST=127.0.0.1
  export DB_PORT=3306
  export DB_USER=classpets
  export DB_PASSWORD=classpets
  export DB_NAME=classpets
  # 可在 Cursor 环境 Secrets 中设置 TOKEN_SECRET 覆盖默认值
  export TOKEN_SECRET="${TOKEN_SECRET:-cursor-cloud-dev-only-secret}"
}

start_app() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "开发服务已在 tmux 会话 $SESSION 中运行"
    return
  fi
  echo ">>> 启动 npm start（前端 3001 + 后端 3002）..."
  tmux new-session -d -s "$SESSION" -c "$ROOT" \
    "DB_HOST='$DB_HOST' DB_PORT='$DB_PORT' DB_USER='$DB_USER' DB_PASSWORD='$DB_PASSWORD' DB_NAME='$DB_NAME' TOKEN_SECRET='$TOKEN_SECRET' npm start 2>&1 | tee $LOG_DIR/dev.log"
}

start_mariadb
ensure_database
export_db_env
start_app

echo ">>> 就绪：前端 http://127.0.0.1:3001  后端 http://127.0.0.1:3002"
echo ">>> 日志: $LOG_DIR/dev.log  或: tmux attach -t $SESSION"
