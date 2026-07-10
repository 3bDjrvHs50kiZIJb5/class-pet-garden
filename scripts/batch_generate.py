#!/usr/bin/env python3
"""
批量生成宠物图片脚本
生成所有剩余宠物的所有等级
"""

import json
import time
import requests
from pathlib import Path

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

def load_design(pet_id):
    """加载宠物设计方案"""
    design_path = Path(f"scripts/pet_designs/{pet_id}.json")
    with open(design_path) as f:
        return json.load(f)

def generate_image(prompt, api_key):
    """调用 API 生成图片"""
    url = "https://api.siliconflow.cn/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "black-forest-labs/FLUX.1-dev",
        "prompt": prompt,
        "image_size": "1024x1024",
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
        "num_images": 1
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    result = response.json()
    
    if 'images' in result and len(result['images']) > 0:
        return result['images'][0]['url']
    else:
        raise Exception("No image in response")

def download_image(url, output_path):
    """下载图片"""
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(response.content)
    
    return output_path

def generate_pet_level(pet_id, level, api_key):
    """生成单个宠物的单个等级"""
    design = load_design(pet_id)
    level_config = next(l for l in design['levels'] if l['level'] == level)
    
    style = "flat cartoon illustration, kawaii chibi style, consistent character design, cute friendly expression, big round sparkling eyes with white highlights, soft rounded shapes, smooth clean outlines, no sharp edges, bright saturated warm colors, soft shading, 2D vector art style, children book illustration style, standing pose, front facing, pure white background"
    
    prompt = f"A cute {design['name']} with {design['features']}, wearing {level_config['accessories']}, {level_config['elements']}, {style}, masterpiece, best quality, 8k"
    
    output_path = Path(f"public/pets/{pet_id}/lv{level}.png")
    
    # 如果已存在，跳过
    if output_path.exists():
        return {"status": "skipped", "path": str(output_path)}
    
    # 生成图片
    image_url = generate_image(prompt, api_key)
    download_image(image_url, output_path)
    
    return {"status": "success", "path": str(output_path), "url": image_url}

def main():
    api_key = get_api_key()
    if not api_key:
        print("ERROR: API key not found")
        return
    
    # 待生成的宠物列表（排除已完成的 white-tiger）
    pets_to_generate = [
        "unicorn", "azure-dragon", "pixiu", "suanni", 
        "succulent-spirit", "vermilion-bird", "angora-rabbit", 
        "call-duck", "winter-hamster"
    ]
    
    total = len(pets_to_generate) * 8
    completed = 0
    
    print(f"Starting batch generation: {len(pets_to_generate)} pets × 8 levels = {total} images")
    print("=" * 60)
    
    for pet_id in pets_to_generate:
        print(f"\n[{completed}/{total}] Generating {pet_id}...")
        
        for level in range(1, 9):
            try:
                result = generate_pet_level(pet_id, level, api_key)
                if result['status'] == 'success':
                    print(f"  ✓ Lv.{level}")
                    completed += 1
                elif result['status'] == 'skipped':
                    print(f"  ○ Lv.{level} (exists)")
                    completed += 1
                time.sleep(1)
            except Exception as e:
                print(f"  ✗ Lv.{level}: {e}")
                time.sleep(2)
    
    print(f"\n{'=' * 60}")
    print(f"Completed: {completed}/{total}")

if __name__ == "__main__":
    main()
