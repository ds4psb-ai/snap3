# 🛡️ **테스트 시 디버그 사전 방지 및 대처 컨설팅 가이드**

**문서 버전**: v1.0  
**최종 업데이트**: 2025-08-21  
**적용 범위**: VDP RAW 시스템 전체 테스트 환경  
**우선순위**: P0 (프로덕션 배포 전 필수)

---

## 📋 **목차**

1. [🔍 **테스트 환경 사전 점검**](#테스트-환경-사전-점검)
2. [🚨 **주요 디버그 시나리오 및 대처법**](#주요-디버그-시나리오-및-대처법)
3. [⚡ **실시간 디버그 모니터링**](#실시간-디버그-모니터링)
4. [🛠️ **디버그 도구 및 스크립트**](#디버그-도구-및-스크립트)
5. [📊 **디버그 메트릭 및 알림**](#디버그-메트릭-및-알림)
6. [🎯 **플랫폼별 특화 디버그 가이드**](#플랫폼별-특화-디버그-가이드)
7. [🚀 **프로덕션 배포 전 최종 체크리스트**](#프로덕션-배포-전-최종-체크리스트)

---

## 🔍 **테스트 환경 사전 점검**

### **1. 인프라 상태 검증**

#### **환경변수 완전성 체크**
```bash
# 필수 환경변수 검증 스크립트
#!/bin/bash
REQUIRED_VARS=(
  "PROJECT_ID"
  "LOCATION" 
  "RAW_BUCKET"
  "T2_URL"
  "MODEL_NAME"
  "MAX_OUTPUT_TOKENS"
)

echo "🔍 환경변수 완전성 검증 중..."
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ $var 환경변수가 설정되지 않음"
    exit 1
  else
    echo "✅ $var: ${!var}"
  fi
done
echo "✅ 모든 필수 환경변수 설정 완료"
```

#### **GCP 서비스 접근성 검증**
```bash
# GCS 접근성 테스트
gsutil ls gs://$RAW_BUCKET/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ GCS 접근성 확인"
else
  echo "❌ GCS 접근성 실패 - gcloud auth 설정 필요"
fi

# Vertex AI 접근성 테스트
gcloud ai models list --region=$LOCATION > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Vertex AI 접근성 확인"
else
  echo "❌ Vertex AI 접근성 실패 - API 활성화 필요"
fi
```

### **2. 서비스 상태 검증**

#### **T1 서버 (포트 8080) 상태 체크**
```bash
# T1 서버 헬스체크
curl -f http://localhost:8080/readyz > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ T1 서버 정상 동작"
else
  echo "❌ T1 서버 응답 없음 - 서버 시작 필요"
  echo "실행 명령: node simple-web-server.js"
fi
```

#### **T3 엔진 상태 체크**
```bash
# T3 메인 엔진 (포트 3001)
curl -f http://localhost:3001/healthz > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ T3 메인 엔진 정상"
else
  echo "⚠️ T3 메인 엔진 응답 없음"
fi

# T3 서브 엔진 (포트 8082)
curl -f http://localhost:8082/healthz > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ T3 서브 엔진 정상"
else
  echo "⚠️ T3 서브 엔진 응답 없음"
fi
```

### **3. 의존성 도구 검증**

#### **yt-dlp 설치 및 버전 체크**
```bash
# yt-dlp 설치 확인
if command -v yt-dlp &> /dev/null; then
  yt-dlp --version
  echo "✅ yt-dlp 설치 확인"
else
  echo "❌ yt-dlp 미설치 - pip install yt-dlp 필요"
fi
```

#### **fpcalc 설치 및 버전 체크**
```bash
# fpcalc 설치 확인
if command -v fpcalc &> /dev/null; then
  fpcalc --version
  echo "✅ fpcalc 설치 확인"
else
  echo "❌ fpcalc 미설치 - chromaprint 설치 필요"
fi
```

---

## 🚨 **주요 디버그 시나리오 및 대처법**

### **1. 네트워크 연결 문제**

#### **시나리오**: 외부 API 호출 실패
```bash
# 진단 명령어
curl -v --connect-timeout 10 https://www.youtube.com/shorts/aX5y8wz60ws
curl -v --connect-timeout 10 https://www.instagram.com/p/DLx4668NGGv
curl -v --connect-timeout 10 https://www.tiktok.com/@user/video/7529657626947374349

# 대처법
# 1. 네트워크 연결 확인
ping -c 3 8.8.8.8

# 2. DNS 해결 확인
nslookup www.youtube.com
nslookup www.instagram.com
nslookup www.tiktok.com

# 3. 프록시 설정 확인 (필요시)
echo $http_proxy
echo $https_proxy
```

#### **시나리오**: GCP 서비스 연결 실패
```bash
# 진단 명령어
gcloud auth list
gcloud config get-value project
gcloud config get-value compute/region

# 대처법
# 1. gcloud 재인증
gcloud auth login
gcloud auth application-default login

# 2. 프로젝트 설정 확인
gcloud config set project $PROJECT_ID
gcloud config set compute/region $LOCATION
```

### **2. 메모리 및 디스크 공간 문제**

#### **시나리오**: 메모리 부족으로 인한 프로세스 종료
```bash
# 진단 명령어
free -h
df -h
ps aux --sort=-%mem | head -10

# 대처법
# 1. 불필요한 프로세스 종료
pkill -f "node.*simple-web-server"
pkill -f "yt-dlp"

# 2. 임시 파일 정리
rm -rf /tmp/*.mp4
rm -rf /tmp/*.wav
rm -rf /tmp/*.json

# 3. 메모리 캐시 정리
sudo sync && sudo sysctl -w vm.drop_caches=3
```

#### **시나리오**: 디스크 공간 부족
```bash
# 진단 명령어
du -sh /tmp
du -sh /var/tmp
du -sh ./*

# 대처법
# 1. 큰 파일 찾기 및 정리
find /tmp -type f -size +100M -delete
find . -name "*.mp4" -size +500M -delete

# 2. 로그 파일 정리
find . -name "*.log" -size +100M -delete
```

### **3. 권한 및 인증 문제**

#### **시나리오**: 파일 쓰기 권한 부족
```bash
# 진단 명령어
ls -la /tmp
ls -la ./jobs/work/
ls -la ./extracted_shorts/

# 대처법
# 1. 디렉토리 권한 설정
chmod 755 /tmp
chmod 755 ./jobs/work/
chmod 755 ./extracted_shorts/

# 2. 사용자 권한 확인
whoami
groups
```

#### **시나리오**: GCP 서비스 계정 권한 부족
```bash
# 진단 명령어
gcloud auth list
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:$(gcloud config get-value account)"

# 대처법
# 1. 서비스 계정 키 설정
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# 2. 필요한 권한 확인
# - Storage Object Admin
# - Vertex AI User
# - BigQuery Data Editor
```

### **4. API 제한 및 할당량 문제**

#### **시나리오**: YouTube API 할당량 초과
```bash
# 진단 명령어
# YouTube API 할당량 확인 (Google Cloud Console에서 확인)

# 대처법
# 1. yt-dlp 쿠키 사용
yt-dlp --cookies-from-browser chrome

# 2. 요청 간격 조정
sleep 2  # 요청 간 2초 대기

# 3. 대체 다운로더 사용
yt-dlp --extractor-args "youtube:player_client=android"
```

#### **시나리오**: Vertex AI API 제한
```bash
# 진단 명령어
gcloud ai operations list --region=$LOCATION --limit=10

# 대처법
# 1. 재시도 로직 구현
for i in {1..3}; do
  if curl -f http://localhost:3001/api/generate; then
    break
  fi
  sleep $((i * 2))
done

# 2. 백업 엔진 사용
if ! curl -f http://localhost:3001/api/generate; then
  curl -f http://localhost:8082/api/generate
fi
```

---

## ⚡ **실시간 디버그 모니터링**

### **1. 로그 모니터링 스크립트**

#### **실시간 로그 추적**
```bash
#!/bin/bash
# real-time-debug-monitor.sh

echo "🔍 실시간 디버그 모니터링 시작..."

# T1 서버 로그 모니터링
tail -f /tmp/t1-server.log | grep -E "(ERROR|WARN|DEBUG)" &

# T3 엔진 로그 모니터링
tail -f /tmp/t3-main.log | grep -E "(ERROR|WARN|DEBUG)" &
tail -f /tmp/t3-sub.log | grep -E "(ERROR|WARN|DEBUG)" &

# 시스템 리소스 모니터링
watch -n 5 'echo "=== $(date) ==="; free -h; df -h /tmp; ps aux --sort=-%mem | head -5'
```

#### **에러 패턴 감지**
```bash
#!/bin/bash
# error-pattern-detector.sh

ERROR_PATTERNS=(
  "EADDRINUSE"
  "ENOTFOUND"
  "ECONNREFUSED"
  "ETIMEDOUT"
  "ENOMEM"
  "ENOSPC"
  "EACCES"
  "EPERM"
)

echo "🚨 에러 패턴 감지 시작..."

for pattern in "${ERROR_PATTERNS[@]}"; do
  if grep -q "$pattern" /tmp/*.log 2>/dev/null; then
    echo "❌ 에러 패턴 감지: $pattern"
    echo "발생 위치:"
    grep -n "$pattern" /tmp/*.log
  fi
done
```

### **2. 성능 모니터링**

#### **응답 시간 모니터링**
```bash
#!/bin/bash
# response-time-monitor.sh

ENDPOINTS=(
  "http://localhost:8080/readyz"
  "http://localhost:3001/healthz"
  "http://localhost:8082/healthz"
)

echo "⏱️ 응답 시간 모니터링 시작..."

while true; do
  echo "=== $(date) ==="
  for endpoint in "${ENDPOINTS[@]}"; do
    start_time=$(date +%s%N)
    if curl -f "$endpoint" > /dev/null 2>&1; then
      end_time=$(date +%s%N)
      response_time=$(( (end_time - start_time) / 1000000 ))
      echo "✅ $endpoint: ${response_time}ms"
    else
      echo "❌ $endpoint: 연결 실패"
    fi
  done
  sleep 30
done
```

---

## 🛠️ **디버그 도구 및 스크립트**

### **1. 통합 디버그 스크립트**

#### **전체 시스템 진단**
```bash
#!/bin/bash
# comprehensive-debug.sh

echo "🔧 VDP RAW 시스템 종합 진단 시작..."
echo "=================================="

# 1. 환경변수 검증
echo "1. 환경변수 검증..."
source ./scripts/check-env-vars.sh

# 2. 서비스 상태 검증
echo "2. 서비스 상태 검증..."
source ./scripts/check-services.sh

# 3. 네트워크 연결 검증
echo "3. 네트워크 연결 검증..."
source ./scripts/check-network.sh

# 4. 리소스 상태 검증
echo "4. 리소스 상태 검증..."
source ./scripts/check-resources.sh

# 5. 권한 검증
echo "5. 권한 검증..."
source ./scripts/check-permissions.sh

echo "=================================="
echo "🔧 종합 진단 완료"
```

#### **플랫폼별 테스트 스크립트**
```bash
#!/bin/bash
# platform-test.sh

PLATFORMS=("youtube" "instagram" "tiktok")
TEST_URLS=(
  "https://www.youtube.com/shorts/aX5y8wz60ws"
  "https://www.instagram.com/p/DLx4668NGGv"
  "https://www.tiktok.com/@user/video/7529657626947374349"
)

echo "🎯 플랫폼별 테스트 시작..."

for i in "${!PLATFORMS[@]}"; do
  platform="${PLATFORMS[$i]}"
  url="${TEST_URLS[$i]}"
  
  echo "테스트 중: $platform"
  echo "URL: $url"
  
  # 다운로드 테스트
  response=$(curl -s -X POST http://localhost:8080/api/unified-download \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\",\"platform\":\"$platform\"}")
  
  if echo "$response" | grep -q "success"; then
    echo "✅ $platform 다운로드 성공"
  else
    echo "❌ $platform 다운로드 실패"
    echo "응답: $response"
  fi
  
  echo "---"
done
```

### **2. 자동 복구 스크립트**

#### **서비스 자동 재시작**
```bash
#!/bin/bash
# auto-recovery.sh

echo "🔄 자동 복구 스크립트 시작..."

# T1 서버 재시작
if ! curl -f http://localhost:8080/readyz > /dev/null 2>&1; then
  echo "T1 서버 재시작 중..."
  pkill -f "node.*simple-web-server"
  sleep 2
  node simple-web-server.js &
  sleep 5
  
  if curl -f http://localhost:8080/readyz > /dev/null 2>&1; then
    echo "✅ T1 서버 재시작 성공"
  else
    echo "❌ T1 서버 재시작 실패"
  fi
fi

# T3 엔진 재시작
for port in 3001 8082; do
  if ! curl -f http://localhost:$port/healthz > /dev/null 2>&1; then
    echo "T3 엔진 (포트 $port) 재시작 중..."
    # T3 엔진 재시작 로직
  fi
done
```

---

## 📊 **디버그 메트릭 및 알림**

### **1. 핵심 메트릭 정의**

#### **성능 메트릭**
```yaml
# debug-metrics.yaml
metrics:
  response_time:
    t1_server: < 1000ms
    t3_main: < 30000ms
    t3_sub: < 30000ms
  
  success_rate:
    download: > 95%
    processing: > 90%
    upload: > 95%
  
  error_rate:
    network: < 5%
    api: < 3%
    system: < 2%
  
  resource_usage:
    memory: < 80%
    disk: < 85%
    cpu: < 90%
```

#### **알림 조건**
```bash
#!/bin/bash
# alert-trigger.sh

# 응답 시간 알림
if [ $response_time -gt 1000 ]; then
  echo "🚨 T1 서버 응답 시간 초과: ${response_time}ms"
  # 알림 전송 로직
fi

# 에러율 알림
if [ $error_rate -gt 5 ]; then
  echo "🚨 에러율 초과: ${error_rate}%"
  # 알림 전송 로직
fi

# 리소스 사용률 알림
if [ $memory_usage -gt 80 ]; then
  echo "🚨 메모리 사용률 초과: ${memory_usage}%"
  # 알림 전송 로직
fi
```

---

## 🎯 **플랫폼별 특화 디버그 가이드**

### **1. YouTube 특화 디버그**

#### **YouTube API 제한 대응**
```bash
# YouTube API 할당량 확인
curl -H "Authorization: Bearer $YOUTUBE_API_KEY" \
  "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=$YOUTUBE_API_KEY"

# 대체 다운로드 방법
yt-dlp --extractor-args "youtube:player_client=android" \
  --cookies-from-browser chrome \
  --sleep-interval 2 \
  --max-sleep-interval 5
```

#### **YouTube 쇼츠 특화 문제**
```bash
# 쇼츠 URL 정규화 문제
# 원본: https://www.youtube.com/shorts/VIDEO_ID
# 변환: https://www.youtube.com/watch?v=VIDEO_ID

# URL 변환 스크립트
if [[ $url == *"/shorts/"* ]]; then
  video_id=$(echo $url | sed 's/.*\/shorts\///')
  url="https://www.youtube.com/watch?v=$video_id"
fi
```

### **2. Instagram 특화 디버그**

#### **Instagram 인증 문제**
```bash
# Instagram 로그인 쿠키 추출
yt-dlp --cookies-from-browser chrome \
  --cookies-from-browser firefox \
  --cookies-from-browser safari

# 세션 유지
yt-dlp --cookies cookies.txt \
  --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
```

#### **Instagram Reels 특화 문제**
```bash
# Reels URL 패턴 감지
if [[ $url == *"/reel/"* ]]; then
  echo "Instagram Reels 감지"
  # Reels 특화 처리 로직
fi

# 비디오 다운로드 실패 시 대체 방법
yt-dlp --extractor-args "instagram:login_required=False" \
  --format "best[height<=1080]"
```

### **3. TikTok 특화 디버그**

#### **TikTok 지역 제한 문제**
```bash
# 지역 제한 우회
yt-dlp --geo-verification-proxy "http://proxy:port" \
  --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"

# 대체 다운로더 사용
yt-dlp --downloader "aria2c" \
  --downloader-args "aria2c:-x 16 -s 16"
```

#### **TikTok 워터마크 제거**
```bash
# 워터마크 없는 버전 다운로드
yt-dlp --format "best[watermark=0]" \
  --extractor-args "tiktok:download_watermark=False"
```

---

## 🚀 **프로덕션 배포 전 최종 체크리스트**

### **1. 시스템 안정성 검증**

#### **부하 테스트**
```bash
#!/bin/bash
# load-test.sh

echo "🚀 부하 테스트 시작..."

# 동시 요청 테스트
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/unified-download \
    -H "Content-Type: application/json" \
    -d '{"url":"https://www.youtube.com/shorts/aX5y8wz60ws","platform":"auto"}' &
done

wait

echo "✅ 부하 테스트 완료"
```

#### **장애 복구 테스트**
```bash
#!/bin/bash
# failover-test.sh

echo "🔄 장애 복구 테스트 시작..."

# T3 메인 엔진 중단
pkill -f "t3-main"

# 백업 엔진 동작 확인
sleep 5
if curl -f http://localhost:8082/healthz > /dev/null 2>&1; then
  echo "✅ 백업 엔진 정상 동작"
else
  echo "❌ 백업 엔진 동작 실패"
fi

# T3 메인 엔진 복구
# 복구 로직 실행

echo "✅ 장애 복구 테스트 완료"
```

### **2. 데이터 무결성 검증**

#### **VDP 스키마 검증**
```bash
#!/bin/bash
# vdp-schema-validation.sh

echo "📋 VDP 스키마 검증 시작..."

# 생성된 VDP 파일 검증
for vdp_file in *.vdp.json; do
  if [ -f "$vdp_file" ]; then
    echo "검증 중: $vdp_file"
    
    # JSON 형식 검증
    if jq empty "$vdp_file" 2>/dev/null; then
      echo "✅ JSON 형식 정상"
    else
      echo "❌ JSON 형식 오류"
    fi
    
    # 필수 필드 검증
    required_fields=("content_id" "content_key" "metadata" "overall_analysis")
    for field in "${required_fields[@]}"; do
      if jq -e ".$field" "$vdp_file" > /dev/null 2>&1; then
        echo "✅ $field 필드 존재"
      else
        echo "❌ $field 필드 누락"
      fi
    done
  fi
done
```

#### **Evidence Pack 검증**
```bash
#!/bin/bash
# evidence-pack-validation.sh

echo "🔍 Evidence Pack 검증 시작..."

# 오디오 지문 검증
for audio_file in *.wav; do
  if [ -f "$audio_file" ]; then
    echo "검증 중: $audio_file"
    
    # fpcalc 실행
    if fpcalc -json "$audio_file" > /dev/null 2>&1; then
      echo "✅ 오디오 지문 생성 성공"
    else
      echo "❌ 오디오 지문 생성 실패"
    fi
  fi
done
```

### **3. 보안 검증**

#### **권한 검증**
```bash
#!/bin/bash
# security-validation.sh

echo "🔒 보안 검증 시작..."

# 파일 권한 검증
for dir in /tmp ./jobs/work/ ./extracted_shorts/; do
  if [ -d "$dir" ]; then
    permissions=$(stat -c "%a" "$dir")
    if [ "$permissions" = "755" ]; then
      echo "✅ $dir 권한 정상"
    else
      echo "❌ $dir 권한 오류: $permissions"
    fi
  fi
done

# 환경변수 노출 검증
sensitive_vars=("GOOGLE_APPLICATION_CREDENTIALS" "YOUTUBE_API_KEY")
for var in "${sensitive_vars[@]}"; do
  if [ -n "${!var}" ]; then
    echo "✅ $var 설정됨"
  else
    echo "⚠️ $var 미설정"
  fi
done
```

---

## 📝 **디버그 로그 템플릿**

### **표준 로그 형식**
```json
{
  "timestamp": "2025-08-21T18:30:00Z",
  "level": "ERROR|WARN|INFO|DEBUG",
  "service": "T1|T2|T3-MAIN|T3-SUB",
  "correlation_id": "req_1234567890",
  "message": "상세 에러 메시지",
  "context": {
    "url": "https://example.com",
    "platform": "youtube",
    "step": "download|process|upload",
    "duration_ms": 1500,
    "error_code": "EADDRINUSE",
    "stack_trace": "..."
  },
  "metrics": {
    "memory_usage_mb": 512,
    "cpu_usage_percent": 25,
    "disk_usage_percent": 45
  }
}
```

### **로그 분석 스크립트**
```bash
#!/bin/bash
# log-analyzer.sh

echo "📊 로그 분석 시작..."

# 에러 패턴 분석
echo "=== 에러 패턴 분석 ==="
grep -o "ERROR.*" /tmp/*.log | sort | uniq -c | sort -nr

# 성능 패턴 분석
echo "=== 성능 패턴 분석 ==="
grep -o "duration_ms.*" /tmp/*.log | awk '{print $2}' | \
  awk '{sum+=$1; count++} END {print "평균 응답시간:", sum/count, "ms"}'

# 플랫폼별 성공률 분석
echo "=== 플랫폼별 성공률 분석 ==="
for platform in youtube instagram tiktok; do
  success=$(grep -c "success.*$platform" /tmp/*.log)
  total=$(grep -c "$platform" /tmp/*.log)
  rate=$((success * 100 / total))
  echo "$platform: $rate% ($success/$total)"
done
```

---

## 🎯 **결론 및 권장사항**

### **핵심 디버그 원칙**
1. **사전 방지**: 환경 검증 및 모니터링 강화
2. **실시간 감지**: 자동화된 에러 감지 및 알림
3. **빠른 복구**: 자동 복구 스크립트 및 장애 대응
4. **지속적 개선**: 로그 분석 및 성능 최적화

### **프로덕션 배포 전 필수 체크**
- [ ] 모든 환경변수 설정 완료
- [ ] 서비스 헬스체크 통과
- [ ] 부하 테스트 성공
- [ ] 장애 복구 테스트 성공
- [ ] 보안 검증 통과
- [ ] 로그 모니터링 설정 완료

### **운영 중 지속적 모니터링**
- [ ] 실시간 성능 메트릭 추적
- [ ] 에러율 및 응답시간 모니터링
- [ ] 리소스 사용률 감시
- [ ] 플랫폼별 성공률 추적
- [ ] 자동 알림 설정

---

**📋 문서 정보**
- **작성자**: Cursor AI Assistant
- **검토자**: ClaudeCode, GPT-5 Pro
- **최종 승인**: 2025-08-21
- **다음 검토**: 프로덕션 배포 후 1주일

**🔗 관련 문서**
- [VDP RAW 시스템 아키텍처](./ARCHITECTURE.md)
- [API 문서](./API_DOCUMENTATION.md)
- [배포 가이드](./DEPLOYMENT_GUIDE.md)
