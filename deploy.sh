#!/bin/bash

# 班级宠物花园部署脚本
# 将构建后的 dist 文件夹部署到服务器

PROJECT_DIR="/root/.openclaw/workspace/projects/class-pet-garden"
SERVER_HOST="8.147.56.12"
SERVER_USER="root"
SERVER_PATH="/var/www/html/pet-garden"

echo "🚀 开始部署班级宠物花园..."

# 1. 确保在正确目录
cd $PROJECT_DIR

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git pull

# 3. 构建项目
echo "🔨 构建项目..."
npm run build

# 4. 部署到服务器
echo "📤 部署到服务器..."
rsync -avz --delete $PROJECT_DIR/dist/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/

# 5. 确保服务器文件权限正确
echo "🔧 设置文件权限..."
ssh $SERVER_USER@$SERVER_HOST "chown -R www-data:www-data $SERVER_PATH && chmod -R 755 $SERVER_PATH"

echo "✅ 部署完成！"
echo "🌐 访问地址: https://$SERVER_HOST/pet-garden/"
