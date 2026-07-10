#!/usr/bin/env python3
"""
AI辅助图片审核脚本
使用多模态模型自动审核图片质量
"""

import json
import base64
import requests
from pathlib import Path

OUTPUT_DIR = Path("/root/.openclaw/workspace/projects/class-pet-garden/public/pets")

def get_api_key():
    with open("/root/.openclaw/openclaw.json") as f:
        config = json.load(f)
        return config.get('models', {}).get('providers', {}).get('siliconflow', {}).get('apiKey', '')

def image_to_base64(image_path: Path) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def analyze_image(image_path: Path, level: int) -> dict:
    """使用AI分析图片"""
    
    base64_image = image_to_base64(image_path)
    
    # 审核Prompt
    audit_prompt = f"""请审核这张宠物图片（等级{level}），从以下维度评分（1-10分）：

1. **可爱度**：是否符合小学生审美，是否可爱吸引人
2. **风格一致性**：是否符合扁平卡通、kawaii风格
3. **装饰可见性**：等级{level}的装饰（{get_decoration_desc(level)}）是否清晰可见
4. **背景合适度**：背景是否美观且不喧宾夺主
5. **整体质量**：是否有变形、模糊、错误等问题

请用JSON格式返回：
{{
  "cute_score": 数字,
  "style_score": 数字,
  "decoration_score": 数字,
  "background_score": 数字,
  "quality_score": 数字,
  "total_score": 数字,
  "issues": ["问题1", "问题2"],
  "suggestion": "改进建议",
  "pass": true/false
}}

评分标准：
- 8-10分：优秀
- 6-7分：可用但需优化
- <6分：不合格需重生成"""

    api_key = get_api_key()
    url = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "Qwen/Qwen2-VL-72B-Instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": audit_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.3
    }
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        result = resp.json()
        content = result['choices'][0]['message']['content']
        
        # 提取JSON
        import re
        json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            return {"error": "无法解析结果", "raw": content}
    except Exception as e:
        return {"error": str(e)}

def get_decoration_desc(level: int) -> str:
    descs = {
        1: "粉色丝带",
        2: "铃铛项圈",
        3: "星星项圈",
        4: "宝石项链",
        5: "小皇冠",
        6: "皇冠+翅膀",
        7: "华丽皇冠+大翅膀",
        8: "神圣皇冠+天使翅膀"
    }
    return descs.get(level, "装饰")

def main():
    pet = "cat"
    print(f"🤖 AI辅助审核 {pet} 的8个等级图片\n")
    
    results = []
    need_regenerate = []
    
    for level in range(1, 9):
        image_path = OUTPUT_DIR / pet / f"lv{level}.png"
        
        print(f"  🔍 分析 Lv.{level}...", end=" ", flush=True)
        
        result = analyze_image(image_path, level)
        results.append({"level": level, "result": result})
        
        if "error" in result:
            print(f"❌ 分析失败: {result['error']}")
            continue
        
        total = result.get('total_score', 0)
        passed = result.get('pass', False)
        
        if passed and total >= 7:
            print(f"✅ 通过 ({total}分)")
        elif total >= 6:
            print(f"🟡 可用 ({total}分) - {result.get('suggestion', '')}")
        else:
            print(f"❌ 不合格 ({total}分) - {result.get('suggestion', '')}")
            need_regenerate.append({
                "level": level,
                "reason": result.get('suggestion', '质量不达标'),
                "issues": result.get('issues', [])
            })
    
    # 保存报告
    report_path = OUTPUT_DIR / pet / "ai_audit_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 审核完成！")
    print(f"  ✅ 通过: {8 - len(need_regenerate)}/8")
    print(f"  ❌ 需重生成: {len(need_regenerate)}/8")
    
    if need_regenerate:
        print(f"\n🔄 需重生成的等级:")
        for item in need_regenerate:
            print(f"    Lv.{item['level']}: {item['reason']}")
    
    # 保存重生成列表
    regen_path = OUTPUT_DIR / pet / "need_regenerate.json"
    with open(regen_path, 'w') as f:
        json.dump(need_regenerate, f, indent=2, ensure_ascii=False)
    
    print(f"\n📝 报告已保存: {report_path}")
    
    return need_regenerate

if __name__ == "__main__":
    need_regen = main()
    if need_regen:
        print(f"\n💡 建议: 运行 regenerate.py 重新生成不合格的图片")
