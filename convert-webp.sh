#!/bin/bash

# 将 PNG 转换为 WebP 格式
# WebP 比 PNG 小 50-70%

echo "🖼️ 开始转换 WebP 格式..."

# 检查是否安装了 cwebp
if ! command -v cwebp &> /dev/null; then
    echo "正在安装 webp..."
    apt-get update && apt-get install -y webp
fi

cd /root/.openclaw/workspace/projects/class-pet-garden/public/pets

# 统计转换前大小
BEFORE_SIZE=$(du -sh . | cut -f1)
echo "转换前总大小: $BEFORE_SIZE"

# 转换所有 PNG 为 WebP
find . -name "*.png" -type f | while read file; do
    webp_file="${file%.png}.webp"
    echo "转换: $file -> $webp_file"
    cwebp -q 80 "$file" -o "$webp_file"
done

# 统计转换后大小
AFTER_SIZE=$(du -sh . | cut -f1)
echo "转换后总大小: $AFTER_SIZE"
echo "✅ 转换完成！"
echo ""
echo "注意：需要修改代码以支持 WebP 格式"
