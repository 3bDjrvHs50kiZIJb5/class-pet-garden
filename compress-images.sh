#!/bin/bash

# 宠物图片压缩脚本
# 使用 pngquant 进行无损压缩

echo "🖼️ 开始压缩宠物图片..."

# 检查是否安装了 pngquant
if ! command -v pngquant &> /dev/null; then
    echo "正在安装 pngquant..."
    apt-get update && apt-get install -y pngquant
fi

# 压缩所有 PNG 图片
cd /root/.openclaw/workspace/projects/class-pet-garden/public/pets

# 统计压缩前大小
BEFORE_SIZE=$(du -sh . | cut -f1)
echo "压缩前总大小: $BEFORE_SIZE"

# 使用 pngquant 压缩
# --quality=65-80 表示最低质量65，目标质量80
# --speed 1 表示最慢但最好的压缩
# --force 表示覆盖原文件
find . -name "*.png" -type f | while read file; do
    echo "压缩: $file"
    pngquant --quality=65-80 --speed 1 --force --output "$file" "$file"
done

# 统计压缩后大小
AFTER_SIZE=$(du -sh . | cut -f1)
echo "压缩后总大小: $AFTER_SIZE"
echo "✅ 压缩完成！"
