#!/usr/bin/env python3
"""
批量调整图片分辨率到 512x512
"""

from PIL import Image
from pathlib import Path
import os

def resize_image(input_path, output_path, size=(512, 512)):
    """调整图片分辨率"""
    with Image.open(input_path) as img:
        # 转换为 RGBA 模式（保留透明度）
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # 调整大小（使用 LANCZOS 算法保持质量）
        resized = img.resize(size, Image.LANCZOS)
        
        # 保存
        resized.save(output_path, 'PNG')
        
    return output_path

def main():
    pets_dir = Path("public/pets")
    target_size = (512, 512)
    
    total_processed = 0
    total_skipped = 0
    
    print("=== 开始统一图片分辨率到 512×512 ===\n")
    
    for pet_dir in sorted(pets_dir.iterdir()):
        if not pet_dir.is_dir():
            continue
        
        pet_name = pet_dir.name
        print(f"处理: {pet_name}")
        
        for img_path in sorted(pet_dir.glob("*.png")):
            try:
                # 检查当前分辨率
                with Image.open(img_path) as img:
                    current_size = img.size
                
                if current_size == target_size:
                    print(f"  ○ {img_path.name} - 已是 512×512，跳过")
                    total_skipped += 1
                    continue
                
                # 调整分辨率
                resize_image(img_path, img_path, target_size)
                print(f"  ✓ {img_path.name} - {current_size[0]}×{current_size[1]} → 512×512")
                total_processed += 1
                
            except Exception as e:
                print(f"  ✗ {img_path.name} - 错误: {e}")
    
    print(f"\n{'='*60}")
    print(f"处理完成!")
    print(f"  调整: {total_processed} 张")
    print(f"  跳过: {total_skipped} 张")
    print(f"  总计: {total_processed + total_skipped} 张")

if __name__ == "__main__":
    main()
