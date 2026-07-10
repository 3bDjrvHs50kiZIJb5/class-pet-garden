#!/usr/bin/env python3
"""
图片质量检查脚本
"""

import os
import sys
from pathlib import Path
from PIL import Image
import json

OUTPUT_DIR = Path("/root/.openclaw/workspace/projects/class-pet-garden/public/pets")

def check_image(pet: str, level: int) -> dict:
    """检查单张图片"""
    path = OUTPUT_DIR / pet / f"lv{level}.png"
    result = {
        "level": level,
        "path": str(path),
        "exists": False,
        "readable": False,
        "size": None,
        "dimensions": None,
        "file_size_kb": 0,
        "issues": [],
        "status": "pending"
    }
    
    # 1. 文件存在性
    if not path.exists():
        result["issues"].append("文件不存在")
        result["status"] = "failed"
        return result
    result["exists"] = True
    
    # 2. 文件大小
    file_size = path.stat().st_size
    result["file_size_kb"] = round(file_size / 1024, 2)
    if file_size < 50 * 1024:  # < 50KB
        result["issues"].append(f"文件过小 ({result['file_size_kb']}KB)")
    elif file_size > 5 * 1024 * 1024:  # > 5MB
        result["issues"].append(f"文件过大 ({result['file_size_kb']}KB)")
    
    # 3. 可读性
    try:
        img = Image.open(path)
        result["readable"] = True
        result["format"] = img.format
        result["dimensions"] = img.size
        
        # 4. 尺寸检查
        if img.size != (512, 512):
            result["issues"].append(f"尺寸错误 {img.size}, 应为 (512, 512)")
        
        # 5. 格式检查
        if img.format != "PNG":
            result["issues"].append(f"格式错误 {img.format}, 应为 PNG")
        
        # 6. 内容检查（非纯色）
        img_gray = img.convert("L")
        pixels = list(img_gray.getdata())
        variance = sum((p - sum(pixels)/len(pixels))**2 for p in pixels) / len(pixels)
        if variance < 100:
            result["issues"].append("可能是纯色/空白图片")
        
        img.close()
        
    except Exception as e:
        result["issues"].append(f"无法读取: {e}")
        result["status"] = "failed"
        return result
    
    # 最终状态
    if result["issues"]:
        result["status"] = "warning" if len(result["issues"]) <= 1 else "failed"
    else:
        result["status"] = "passed"
    
    return result

def main():
    pet = "cat"
    print(f"🔍 开始检查 {pet} 的8个等级图片\n")
    
    results = []
    passed = 0
    warning = 0
    failed = 0
    
    for level in range(1, 9):
        result = check_image(pet, level)
        results.append(result)
        
        status_icon = {
            "passed": "✅",
            "warning": "🟡",
            "failed": "❌"
        }.get(result["status"], "❓")
        
        print(f"  Lv.{level}: {status_icon}", end="")
        
        if result["status"] == "passed":
            print(f" {result['dimensions']}, {result['file_size_kb']}KB")
            passed += 1
        elif result["status"] == "warning":
            print(f" 警告: {', '.join(result['issues'])}")
            warning += 1
        else:
            print(f" 失败: {', '.join(result['issues'])}")
            failed += 1
    
    print(f"\n📊 检查结果:")
    print(f"  ✅ 通过: {passed}/8")
    print(f"  🟡 警告: {warning}/8")
    print(f"  ❌ 失败: {failed}/8")
    
    # 保存详细报告
    report_path = OUTPUT_DIR / pet / "check_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n📝 详细报告已保存: {report_path}")
    
    # 返回码
    if failed > 0:
        sys.exit(1)
    elif warning > 0:
        sys.exit(0)  # 警告也返回0，但会显示
    else:
        print("\n🎉 全部检查通过！")
        sys.exit(0)

if __name__ == "__main__":
    main()
