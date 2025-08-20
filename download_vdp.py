#!/usr/bin/env python3
import requests
import json
import time

url = "https://t2-vdp-355516763169.us-west1.run.app/api/vdp/extract-vertex"
payload = {
    "gcsUri": "gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4",
    "meta": {
        "platform": "youtube",
        "language": "ko",
        "source_url": "https://www.youtube.com/shorts/6_I2FmT1mbY"
    }
}

print("🚀 VDP 생성 요청 시작...")
print(f"📡 URL: {url}")
print(f"📦 Payload: {json.dumps(payload, indent=2)}")

try:
    # 15분 타임아웃으로 설정
    response = requests.post(
        url, 
        json=payload, 
        timeout=900,  # 15분
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"✅ HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        vdp_data = response.json()
        
        # VDP 파일 저장
        output_path = "/Users/ted/snap3/out/vdp/PYTHON_ENHANCED_VDP.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(vdp_data, f, indent=2, ensure_ascii=False)
        
        print(f"🎉 VDP 성공적으로 저장: {output_path}")
        
        # 품질 정보 출력
        if 'google_vdp_quality' in vdp_data:
            quality = vdp_data['google_vdp_quality']
            print(f"📊 Google VDP Quality:")
            print(f"   Scenes: {quality.get('scenes_count', 0)}")
            print(f"   Shots: {quality.get('shots_count', 0)}")
            print(f"   Keyframes: {quality.get('keyframes_count', 0)}")
            print(f"   Composition Notes: {quality.get('composition_notes', 0)}")
        
        # Hook 정보 출력
        if 'hook_genome' in vdp_data:
            hook = vdp_data['hook_genome']
            print(f"🎯 Hook Genome:")
            print(f"   Pattern: {hook.get('pattern_code', 'unknown')}")
            print(f"   Strength: {hook.get('strength_score', 0)}")
            print(f"   Start: {hook.get('start_sec', 0)}s")
        
        print(f"💾 파일 크기: {len(json.dumps(vdp_data))} bytes")
        
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(f"Response: {response.text}")
        
except requests.exceptions.Timeout:
    print("⏰ 타임아웃 발생 (15분 초과)")
except requests.exceptions.RequestException as e:
    print(f"🚨 요청 오류: {e}")
except Exception as e:
    print(f"💥 예상치 못한 오류: {e}")