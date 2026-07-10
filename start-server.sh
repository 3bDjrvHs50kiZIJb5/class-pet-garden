#!/bin/bash

# 班级宠物花园服务启动脚本
# 使用 nohup 确保进程在网关重启后仍然运行

PROJECT_DIR="/root/.openclaw/workspace/projects/class-pet-garden"
LOG_DIR="$PROJECT_DIR/logs"

# 创建日志目录
mkdir -p $LOG_DIR

# 清理旧日志
rm -f $LOG_DIR/*.log

echo "🐾 启动班级宠物花园服务..."

# 检查并停止旧进程
echo "检查旧进程..."
pkill -f "node.*pet-garden/server" 2>/dev/null
pkill -f "vite.*pet-garden" 2>/dev/null
sleep 1

# 启动后端 API 服务器
echo "启动后端 API 服务器 (端口 3002)..."
nohup node $PROJECT_DIR/server/index.js > $LOG_DIR/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > $PROJECT_DIR/server.pid
echo "后端服务 PID: $SERVER_PID"

# 等待后端启动
sleep 2

# 检查后端是否成功启动
if curl -s http://localhost:3002/api/classes > /dev/null 2>&1; then
    echo "✅ 后端 API 服务启动成功"
else
    echo "⚠️ 后端 API 服务可能启动失败，请检查日志"
fi

echo ""
echo "📋 服务状态:"
echo "  - 后端 API: http://localhost:3002"
echo "  - 日志文件: $LOG_DIR/server.log"
echo ""
echo "📝 查看日志: tail -f $LOG_DIR/server.log"
