#!/bin/bash

# 班级宠物花园健康检查脚本
# 用于 OpenClaw 网关重启后自动恢复服务

PROJECT_DIR="/root/.openclaw/workspace/projects/class-pet-garden"
LOG_FILE="$PROJECT_DIR/logs/health-check.log"

# 创建日志目录
mkdir -p $PROJECT_DIR/logs

# 检查后端 API 是否响应
check_api() {
    curl -s http://localhost:3002/api/classes > /dev/null 2>&1
    return $?
}

# 记录日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# 检查服务状态
if ! check_api; then
    log "⚠️ 后端 API 未响应，尝试重启服务..."
    
    # 尝试启动服务
    if [ -f "$PROJECT_DIR/start-server.sh" ]; then
        cd $PROJECT_DIR
        bash start-server.sh >> $LOG_FILE 2>&1
        sleep 3
        
        if check_api; then
            log "✅ 服务重启成功"
        else
            log "❌ 服务重启失败"
        fi
    else
        log "❌ 启动脚本不存在: $PROJECT_DIR/start-server.sh"
    fi
else
    log "✅ 服务运行正常"
fi
