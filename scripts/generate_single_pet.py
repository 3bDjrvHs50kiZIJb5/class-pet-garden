#!/usr/bin/env python3
"""
单个宠物图片生成脚本
用法: python generate_single_pet.py <pet_id> <level>
"""

import json
import sys
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

def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_single_pet.py <pet_id> <level>")
        print("Example: python generate_single_pet.py white-tiger 1")
        sys.exit(1)
    
    pet_id = sys.argv[1]
    level = int(sys.argv[2])
    
    api_key = get_api_key()
    if not api_key:
        print("ERROR: API key not found")
        sys.exit(1)
    
    # 加载设计
    design = load_design(pet_id)
    level_config = next(l for l in design['levels'] if l['level'] == level)
    
    # 构建提示词
    style = "flat cartoon illustration, kawaii chibi style, consistent character design, cute friendly expression, big round sparkling eyes with white highlights, soft rounded shapes, smooth clean outlines, no sharp edges, bright saturated warm colors, soft shading, 2D vector art style, children book illustration style, standing pose, front facing, pure white background"
    
    prompt = f"A cute {design['name']} with {design['features']}, wearing {level_config['accessories']}, {level_config['elements']}, {style}, masterpiece, best quality, 8k"
    
    print(f"Generating {pet_id} Lv.{level}...")
    print(f"Prompt: {prompt}")
    
    # 生成图片
    image_url = generate_image(prompt, api_key)
    print(f"Image URL: {image_url}")
    
    # 下载图片
    output_path = Path(f"public/pets/{pet_id}/lv{level}.png")
    download_image(image_url, output_path)
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    main()
