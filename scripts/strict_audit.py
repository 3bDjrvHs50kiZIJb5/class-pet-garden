#!/usr/bin/env python3
"""
严格装饰审核脚本
严格按照设计规范检查每个等级的装饰
"""

import json
import base64
import requests
from pathlib import Path

OUTPUT_DIR = Path("/root/.openclaw/workspace/projects/class-pet-garden/public/pets")

# 严格装饰定义
DECORATION_REQUIREMENTS = {
    1: {"name": "粉色丝带", "required": ["pink ribbon", "bow", "small decoration"], "position": "neck or head"},
    2: {"name": "铃铛项圈", "required": ["bell", "collar", "necklace with bell"], "position": "neck"},
    3: {"name": "星星项圈", "required": ["star", "collar", "necklace with star", "shiny"], "position": "neck"},
    4: {"name": "宝石项链", "required": ["gem", "jewel", "necklace", "golden"], "position": "neck"},
    5: {"name": "小皇冠", "required": ["crown", "small crown", "jewels"], "position": "head"},
    6: {"name": "皇冠+翅膀", "required": ["crown", "wings", "golden", "halo"], "position": "head and back"},
    7: {"name": "华丽皇冠+大翅膀", "required": ["crown", "large wings", "majestic", "strong aura"], "position": "head and back"},
    8: {"name": "神圣皇冠+天使翅膀", "required": ["divine crown", "angel wings", "floating", "sacred symbols", "radiant light"], "position": "head, back and surrounding"}
}

def get_api_key():
    with open("/root/.openclaw/openclaw.json") as f:
        config = json.load(f)
        return config.get('models', {}).get('providers', {}).get('siliconflow', {}).get('apiKey', '')

def image_to_base64(image_path: Path) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def strict_audit(image_path: Path, level: int) -> dict:
    """严格审核装饰是否符合设计"""
    
    req = DECORATION_REQUIREMENTS[level]
    base64_image = image_to_base64(image_path)
    
    # 严格审核Prompt
    audit_prompt = f"""【严格审核】这是一张等级{level}的宠物图片。

【设计要求】
- 等级名称：{req['name']}
- 必须包含的元素：{', '.join(req['required'])}
- 装饰位置：{req['position']}

【审核标准】（必须全部满足才能通过）
1. 装饰可见性：设计要求中的元素是否**清晰可见**？（不能模糊/太小/被遮挡）
2. 装饰完整性：是否**完整呈现**所有必需元素？（不能缺失）
3. 装饰位置：是否在正确的位置？
4. 等级区分度：与低等级相比，装饰是否**明显更华丽**？

【输出要求】
请用JSON格式返回：
{{
  "decoration_visible": true/false,
  "decoration_complete": true/false,
  "position_correct": true/false,
  "level_distinct": true/false,
  "found_elements": ["找到的元素1", "找到的元素2"],
  "missing_elements": ["缺失的元素"],
  "issues": ["问题描述"],
  "pass": true/false,
  "suggestion": "如果失败，说明具体原因和改进建议"
}}

【重要】
- 只要有一个必需元素**不清晰**或**缺失**，pass必须为false
- 装饰必须**一眼可见**，不能需要仔细找
- 严格对比设计要求，不能降低标准"""

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
        "max_tokens": 1500,
        "temperature": 0.1  # 低温度，更严格
    }
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        result = resp.json()
        content = result['choices'][0]['message']['content']
        
        # 提取JSON
        import re
        json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                parsed["raw_response"] = content[:200]  # 保存原始响应片段
                return parsed
            except:
                return {"error": "JSON解析失败", "raw": content[:500]}
        else:
            return {"error": "未找到JSON", "raw": content[:500]}
    except Exception as e:
        return {"error": str(e)}

def main():
    pet = "cat"
    print(f"🔍 严格装饰审核 {pet} 的8个等级图片")
    print(f"=" * 60)
    print(f"审核标准：装饰必须清晰可见、完整呈现、位置正确\n")
    
    results = []
    need_regenerate = []
    
    for level in range(1, 9):
        image_path = OUTPUT_DIR / pet / f"lv{level}.png"
        req = DECORATION_REQUIREMENTS[level]
        
        print(f"\n【Lv.{level} - {req['name']}】")
        print(f"  要求: {', '.join(req['required'])}")
        
        result = strict_audit(image_path, level)
        results.append({"level": level, "result": result})
        
        if "error" in result:
            print(f"  ❌ 审核失败: {result['error']}")
            continue
        
        # 显示找到的元素
        found = result.get('found_elements', [])
        missing = result.get('missing_elements', [])
        print(f"  ✅ 找到: {', '.join(found) if found else '无'}")
        if missing:
            print(f"  ❌ 缺失: {', '.join(missing)}")
        
        # 显示各项检查
        checks = [
            ("可见性", result.get('decoration_visible', False)),
            ("完整性", result.get('decoration_complete', False)),
            ("位置正确", result.get('position_correct', False)),
            ("等级区分", result.get('level_distinct', False))
        ]
        
        for name, passed in checks:
            icon = "✅" if passed else "❌"
            print(f"    {icon} {name}")
        
        # 最终结果
        passed = result.get('pass', False)
        if passed:
            print(f"  🎉 通过审核")
        else:
            print(f"  ❌ 未通过")
            print(f"  💡 建议: {result.get('suggestion', '重新生成')}")
            issues = result.get('issues', [])
            if issues:
                for issue in issues:
                    print(f"     - {issue}")
            need_regenerate.append({
                "level": level,
                "decoration": req['name'],
                "reason": result.get('suggestion', '装饰不符合要求'),
                "missing": missing
            })
    
    # 总结
    print(f"\n" + "=" * 60)
    print(f"📊 严格审核结果:")
    print(f"  ✅ 通过: {8 - len(need_regenerate)}/8")
    print(f"  ❌ 需重生成: {len(need_regenerate)}/8")
    
    if need_regenerate:
        print(f"\n🔄 需重生成的等级:")
        for item in need_regenerate:
            print(f"    Lv.{item['level']} ({item['decoration']}): {item['reason']}")
    else:
        print(f"\n🎉 全部通过严格审核！")
    
    # 保存报告
    report_path = OUTPUT_DIR / pet / "strict_audit_report.json"
    with open(report_path, 'w') as f:
        json.dump({
            "results": results,
            "need_regenerate": need_regenerate,
            "summary": {
                "total": 8,
                "passed": 8 - len(need_regenerate),
                "failed": len(need_regenerate)
            }
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📝 详细报告: {report_path}")
    
    return need_regenerate

if __name__ == "__main__":
    need_regen = main()
    if need_regen:
        print(f"\n⚠️ 有 {len(need_regen)} 个等级需要重新生成")
