# 宠物图片生成与优化指南

> 目标：为班级宠物园系统生成高质量的宠物图片，并优化加载性能
> 技术：SiliconFlow FLUX.1-dev + pngquant 压缩

---

## 一、图片生成

### 核心原则
- **一品种一设计**：每个品种独立设计装饰，符合品种特性
- **严格画风统一**：所有图片使用完全相同的风格描述词
- **装饰升级体现成长**：从简单到华丽，体现等级提升

### 画风规范（严格统一）
```
STYLE = "flat cartoon illustration, kawaii chibi style, consistent character design,
cute friendly expression, big round sparkling eyes with white highlights,
soft rounded shapes, smooth clean outlines, no sharp edges,
bright saturated warm colors, soft shading, 2D vector art style,
children book illustration style, standing pose, front facing,
white background, masterpiece, best quality"

NEGATIVE = "3D, realistic, photograph, scary, dark, complex background,
busy background, text, watermark, signature, blurry, low quality,
different style, inconsistent design"
```

### Prompt模板
```
A cute [品种名称] with [品种特征], wearing [等级装饰], [装饰元素], [严格统一风格词], [背景], masterpiece, best quality, 8k
```

### 生成工具
```bash
python3 /root/.openclaw/workspace/tools/generate_image.py "prompt" --output ./output.png --model flux-dev
```

---

## 二、图片压缩（重要！）

### 为什么需要压缩？
- 原始 PNG 图片约 200KB/张
- 192 张图片约 40MB
- 1Mb 带宽下加载很慢

### 压缩效果
- **压缩前**：50MB
- **压缩后**：14MB
- **减少**：72%

### 压缩命令
```bash
cd /root/.openclaw/workspace/projects/class-pet-garden
bash compress-images.sh
```

### 压缩参数
```bash
pngquant --quality=65-80 --speed 1 --force --output "$file" "$file"
```

- `--quality=65-80`：质量范围，65为最低可接受质量，80为目标质量
- `--speed 1`：最慢但最好的压缩
- 视觉无损，文件大小减少 60-70%

### 压缩后检查
```bash
# 查看压缩后大小
du -sh public/pets/

# 查看单张图片大小
ls -lh public/pets/bichon/
```

---

## 三、图片规范

### 文件结构
```
public/pets/
├── {pet_id}/
│   ├── lv1.png
│   ├── lv2.png
│   ├── lv3.png
│   ├── lv4.png
│   ├── lv5.png
│   ├── lv6.png
│   ├── lv7.png
│   └── lv8.png
```

### 命名规范
- 文件夹：小写，连字符分隔（如 `golden-retriever`）
- 图片：`lv{level}.png`（如 `lv1.png`）

### 尺寸要求
- 推荐：512x512 像素
- 格式：PNG（压缩后）

---

## 四、性能优化

### 1. 懒加载（已实现）
```html
<img loading="lazy" src="..." />
```

### 2. 浏览器缓存
Nginx 配置：
```nginx
location ~* \.(png|jpg|jpeg|gif|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Gzip 压缩
Nginx 配置：
```nginx
gzip on;
gzip_types image/png image/jpeg image/gif;
```

---

## 五、常见问题

### 压缩后图片模糊？
- 提高质量参数：`--quality=80-95`
- 或改用无损压缩：`--quality=100`

### 压缩后颜色变化？
- pngquant 使用调色板优化，可能有轻微色差
- 一般肉眼难以察觉

### 如何回退？
```bash
# 从 git 恢复原始图片
git checkout public/pets/
```

---

## 六、工作流程

1. **生成图片**：使用 FLUX.1-dev 生成 512x512 PNG
2. **审核质量**：检查画风、装饰、美观度
3. **保存图片**：放入 `public/pets/{pet_id}/`
4. **压缩图片**：运行 `compress-images.sh`
5. **提交代码**：`git add -A && git commit && git push`
6. **部署更新**：更新服务器上的图片

---

## 七、品种清单

### 普通动物（18种）
- west-highland, bichon, border-collie, shiba, golden-retriever, samoyed, husky
- tabby-cat, persian-cat, ragdoll-cat, orange-cat
- lop-rabbit, angora-rabbit, hamster, winter-hamster
- call-duck, alpaca, red-panda

### 神兽（7种）
- white-tiger, unicorn, pixiu, azure-dragon, vermilion-bird, suanni, succulent-spirit

---

**提示：定期执行压缩脚本，确保图片保持最优大小！**
