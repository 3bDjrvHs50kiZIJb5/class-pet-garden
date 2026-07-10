#!/usr/bin/env python3
"""
宠物等级图片生成脚本
使用 SiliconFlow FLUX.1-dev API
"""

import json
import os
import time
import requests
from pathlib import Path
from datetime import datetime

# 配置
def get_api_key():
    """从 OpenClaw 配置获取 SiliconFlow API Key"""
    config_path = "/root/.openclaw/openclaw.json"
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
            return config.get('models', {}).get('providers', {}).get('siliconflow', {}).get('apiKey', '')
    except Exception as e:
        print(f"⚠️ 无法读取配置: {e}")
        return ""

API_KEY = get_api_key()
API_URL = "https://api.siliconflow.cn/v1/images/generations"
STYLE = "flat cartoon illustration, kawaii chibi style, consistent character design, cute friendly expression, big round sparkling eyes with white highlights, soft rounded shapes, smooth clean outlines, no sharp edges, bright saturated warm colors, soft shading, 2D vector art style, children book illustration style, standing pose, front facing"
NEGATIVE = "3D, realistic, photograph, scary, dark, complex background, busy background, text, watermark, signature, blurry, low quality, different style, inconsistent design, missing accessories, black face, dark face, face covered, red sun, red circle, half body, partial body, weird cape, ugly cape"

def load_design(pet_id):
    """加载宠物设计方案"""
    design_path = Path(f"scripts/pet_designs/{pet_id}.json")
    with open(design_path) as f:
        return json.load(f)

def generate_prompt(design, level):
    """生成图片提示词"""
    level_config = next(l for l in design['levels'] if l['level'] == level)
    
    # 构建提示词
    prompt = f"A cute {design['name']} with {design['features']}, wearing {level_config['accessories']}, {level_config['elements']}, {STYLE}, {level_config['background']}, masterpiece, best quality, 8k"
    
    return prompt

def generate_image(prompt, output_path):
    """调用 API 生成图片"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "black-forest-labs/FLUX.1-dev",
        "prompt": prompt,
        "negative_prompt": NEGATIVE,
        "image_size": "1024x1024",
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
        "num_images": 1
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        
        if 'images' in result and len(result['images']) > 0:
            image_url = result['images'][0]['url']
            # 下载图片
            img_response = requests.get(image_url, timeout=60)
            img_response.raise_for_status()
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(img_response.content)
            
            return True, image_url
        else:
            return False, "No image in response"
    
    except Exception as e:
        return False, str(e)

def generate_pet_images(pet_id):
    """生成单个宠物的所有等级图片"""
    design = load_design(pet_id)
    output_dir = Path(f"public/pets/{pet_id}")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = []
    
    for level in range(1, 9):
        output_path = output_dir / f"lv{level}.png"
        
        # 如果已存在，跳过
        if output_path.exists():
            print(f"  [SKIP] {pet_id} Lv.{level} - already exists")
            results.append({"level": level, "status": "skipped", "path": str(output_path)})
            continue
        
        prompt = generate_prompt(design, level)
        print(f"\n  [GEN] {pet_id} Lv.{level}")
        print(f"  Prompt: {prompt[:100]}...")
        
        success, result = generate_image(prompt, output_path)
        
        if success:
            print(f"  [OK] {pet_id} Lv.{level} -> {output_path}")
            results.append({"level": level, "status": "success", "path": str(output_path), "url": result})
        else:
            print(f"  [FAIL] {pet_id} Lv.{level}: {result}")
            results.append({"level": level, "status": "failed", "error": result})
        
        time.sleep(1)  # 避免请求过快
    
    return results

def main():
    # 待生成的宠物列表
    pets_to_generate = [
        "white-tiger",
        "unicorn",
        "azure-dragon",
        "pixiu",
        "suanni",
        "succulent-spirit",
        "vermilion-bird",
        "angora-rabbit",
        "call-duck",
        "winter-hamster"
    ]
    
    print(f"Starting pet image generation at {datetime.now()}")
    print(f"Total pets to generate: {len(pets_to_generate)}")
    print(f"API Key configured: {'Yes' if API_KEY else 'No'}")
    
    if not API_KEY:
        print("ERROR: SiliconFlow API Key not found in config!")
        return
    
    all_results = {}
    
    for pet_id in pets_to_generate:
        print(f"\n{'='*60}")
        print(f"Generating: {pet_id}")
        print(f"{'='*60}")
        
        results = generate_pet_images(pet_id)
        all_results[pet_id] = results
    
    # 保存结果报告
    report_path = Path("scripts/generation_report.json")
    with open(report_path, 'w') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"Generation complete! Report saved to {report_path}")
    
    # 统计
    total = len(pets_to_generate) * 8
    success = sum(1 for pet in all_results.values() for r in pet if r['status'] == 'success')
    skipped = sum(1 for pet in all_results.values() for r in pet if r['status'] == 'skipped')
    failed = sum(1 for pet in all_results.values() for r in pet if r['status'] == 'failed')
    
    print(f"Total: {total}, Success: {success}, Skipped: {skipped}, Failed: {failed}")

if __name__ == "__main__":
    main()
