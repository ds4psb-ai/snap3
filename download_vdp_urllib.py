#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import socket
import ssl

# 타임아웃을 15분으로 설정
socket.setdefaulttimeout(900)

# SSL 인증서 검증 비활성화 (개발 목적)
ssl._create_default_https_context = ssl._create_unverified_context

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
    # JSON 데이터를 바이트로 변환
    json_data = json.dumps(payload).encode('utf-8')
    
    # HTTP 요청 생성
    req = urllib.request.Request(
        url,
        data=json_data,
        headers={
            'Content-Type': 'application/json',
            'Content-Length': str(len(json_data))
        },
        method='POST'
    )
    
    print("⏳ VDP 생성 중... (최대 15분 대기)")
    
    # 요청 실행
    with urllib.request.urlopen(req, timeout=900) as response:
        print(f"✅ HTTP Status: {response.status}")
        
        if response.status == 200:
            # 응답 데이터 읽기
            response_data = response.read().decode('utf-8')
            vdp_data = json.loads(response_data)
            
            # VDP 파일 저장
            output_path = "/Users/ted/snap3/out/vdp/URLLIB_ENHANCED_VDP.json"
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
                print(f"   End: {hook.get('end_sec', 0)}s")
            
            print(f"💾 파일 크기: {len(response_data)} bytes")
            print(f"📄 Content-ID: {vdp_data.get('vdp', {}).get('content_id', 'unknown')}")
            
        else:
            print(f"❌ HTTP Error: {response.status}")
            
except socket.timeout:
    print("⏰ 타임아웃 발생 (15분 초과)")
except urllib.error.HTTPError as e:
    print(f"🚨 HTTP 오류: {e.code} - {e.reason}")
    if hasattr(e, 'read'):
        error_body = e.read().decode('utf-8')
        print(f"Error body: {error_body}")
except urllib.error.URLError as e:
    print(f"🚨 URL 오류: {e.reason}")
except Exception as e:
    print(f"💥 예상치 못한 오류: {e}")
    import traceback
    traceback.print_exc()