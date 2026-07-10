#!/usr/bin/env python3
"""
自动重生成脚本 - AI审核不通过时自动重新生成
"""

import json
import sys
import time
from pathlib import Path
from generate_pets import generate, download, OUTPUT_DIR, PETS

# 优化后的装饰定义（更强调可见性）
DECORATIONS_V2 = {
    1: {
        "item": "prominently displayed pink ribbon bow on head, clearly visible small decoration",
        "effect": "soft pastel colors, cute accessories",
        "bg": "peaceful meadow with small flowers"
    },
    2: {
        "item": "golden bell collar around neck, clearly visible bell pendant",
        "effect": "gentle glow, shiny metal",
        "bg": "colorful garden with butterflies"
    },
    3: {
        "item": "shiny star-shaped collar around neck, prominently displayed star charm",
        "effect": "subtle magical aura, sparkling",
        "bg": "enchanted forest with glowing mushrooms"
    },
    4: {
        "item": "golden necklace with clearly visible gemstones and jewels, ornate jewelry",
        "effect": "soft golden aura, sparkling gems",
        "bg": "ancient forest with waterfall"
    },
    5: {
        "item": "small golden crown on head with jewels, clearly visible royal crown",
        "effect": "glowing particles, royal aura",
        "bg": "mountain peak above clouds"
    },
    6: {
        "item": "golden crown on head AND angel wings on back, clearly visible halo above head",
        "effect": "golden halo glow, floating particles, divine light",
        "bg": "floating islands in golden clouds"
    },
    7: {
        "item": "ornate royal crown on head AND large majestic wings on back, strong aura",
        "effect": "intense golden glow, majestic aura, radiant",
        "bg": "celestial temple in clouds with aurora"
    },
    8: {
        "item": "divine crown on head AND large angel wings on back AND floating above ground AND sacred symbols floating around",
        "effect": "radiant golden light beams, divine halo, ethereal glow, heavenly aura",
        "bg": "cosmic realm with stars and nebula, heavenly gates"
    }
}

def build_prompt_v2(pet_id: str, level: int) -> str:
    """优化后的Prompt，更强调装饰可见性"""
    pet = PETS[pet_id]
    dec = DECORATIONS_V2[level]
    
    return f"{pet['base']}, wearing {dec['item']}, {dec['effect']}, prominently displayed, clearly visible, detailed, masterpiece, {dec['bg']}, 8k"

def regenerate_level(pet: str, level: int, attempt: int) -> bool:
    """重新生成单张图片"""
    print(f"\n  🔄 第{attempt}次重生成 Lv.{level}...")
    
    prompt = build_prompt_v2(pet, level)
    print(f"     优化Prompt: {prompt[:80]}...")
    
    result = generate(prompt, "flux-dev")
    
    if 'images' in result:
        url = result['images'][0]['url']
        path = OUTPUT_DIR / pet / f"lv{level}.png"
        download(url, path)
        print(f"     ✅ 已保存")
        return True
    else:
        print(f"     ❌ 失败: {result.get('error', 'unknown')}")
        return False

def auto_regenerate(pet: str = "cat", max_retry: int = 3):
    """自动重生成审核不通过的图片"""
    
    # 读取审核报告
    report_path = OUTPUT_DIR / pet / "strict_audit_report.json"
    if not report_path.exists():
        print("❌ 未找到审核报告，请先运行严格审核")
        return
    
    with open(report_path) as f:
        report = json.load(f)
    
    need_regen = report.get('need_regenerate', [])
    
    if not need_regen:
        print("✅ 无需重生成，所有图片已通过审核")
        return
    
    print(f"🔄 开始自动重生成，共{len(need_regen)}张图片")
    print(f"   每张最多重试{max_retry}次\n")
    
    final_results = []
    still_failed = []
    
    for item in need_regen:
        level = item['level']
        print(f"【Lv.{level} - {item['decoration']}】")
        print(f"   失败原因: {item['reason']}")
        
        success = False
        for attempt in range(1, max_retry + 1):
            if regenerate_level(pet, level, attempt):
                success = True
                break
            time.sleep(2)
        
        if success:
            final_results.append({"level": level, "status": "regenerated"})
        else:
            final_results.append({"level": level, "status": "failed_after_retry"})
            still_failed.append(item)
    
    # 输出结果
    print(f"\n" + "="*60)
    print(f"📊 重生成结果:")
    print(f"   ✅ 成功: {len([r for r in final_results if r['status'] == 'regenerated'])}/{len(need_regen)}")
    print(f"   ❌ 仍失败: {len(still_failed)}/{len(need_regen)}")
    
    if still_failed:
        print(f"\n⚠️ 以下等级重试{max_retry}次后仍失败，需人工处理:")
        for item in still_failed:
            print(f"   Lv.{item['level']}: {item['reason']}")
    else:
        print(f"\n🎉 全部重生成成功！建议重新运行严格审核确认")
    
    # 保存结果
    result_path = OUTPUT_DIR / pet / "regenerate_result.json"
    with open(result_path, 'w') as f:
        json.dump({
            "regenerated": [r for r in final_results if r['status'] == 'regenerated'],
            "still_failed": still_failed,
            "total": len(need_regen),
            "success": len([r for r in final_results if r['status'] == 'regenerated']),
            "failed": len(still_failed)
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📝 结果已保存: {result_path}")

if __name__ == "__main__":
    auto_regenerate()
