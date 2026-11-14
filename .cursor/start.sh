#!/usr/bin/env bash
# 每次 Cloud Agent 启动时运行：MariaDB + 前后端开发服务
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG_DIR="/tmp/class-pet-garden"
mkdir -p "$LOG_DIR"
SESSION="class_pet_garden"

# shellcheck source=scripts/dev-env.sh
source "$ROOT/scripts/dev-env.sh"

start_app() {
  if tmux -f /exec-daemon/tmux.portal.conf has-session -t "$SESSION" 2>/dev/null; then
    echo "开发服务已在 tmux 会话 $SESSION 中运行"
    return
  fi
  bash "$ROOT/scripts/ensure-npm-deps.sh"
  bash "$ROOT/scripts/ensure-dev-database.sh"
  echo ">>> 启动 start-dev.sh（前端 3001 + 后端 3002）..."
  tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION" -c "$ROOT" \
    "bash scripts/start-dev.sh 2>&1 | tee $LOG_DIR/dev.log"
}

bash "$ROOT/scripts/ensure-dev-database.sh"
start_app

echo ">>> 就绪：前端 http://127.0.0.1:3001  后端 http://127.0.0.1:3002"
echo ">>> 日志: $LOG_DIR/dev.log  或: tmux -f /exec-daemon/tmux.portal.conf attach -t $SESSION"