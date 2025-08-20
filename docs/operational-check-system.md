# 운영 점검 시스템 (VDP Pipeline Health Check)

**Version**: 1.0.0  
**Purpose**: 플랫폼 3종 대량 적재 전 운영 상태 종합 점검 시스템

## Quick Check Commands

### 🚀 원클릭 전체 점검
```bash
./scripts/ops-health-check.sh --all --verbose
```

### 📋 개별 플랫폼 점검
```bash
./scripts/ops-health-check.sh --platform youtube
./scripts/ops-health-check.sh --platform instagram  
./scripts/ops-health-check.sh --platform tiktok
```

## 1. API 엔드포인트 점검

### YouTube (URL 기반)
```bash
# 기본 연결성 확인
curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "youtube",
    "content_id": "f9Sa4dTGPqU", 
    "source_url": "https://www.youtube.com/watch?v=f9Sa4dTGPqU",
    "processing_options": {
      "force_full_pipeline": true,
      "hook_genome_analysis": true,
      "audio_fingerprint": false,
      "brand_detection": false
    }
  }' | jq '.status, .message, .processing_id'
```

### Instagram (업로드 기반)
```bash
# GCS URI 업로드 확인
curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "instagram",
    "content_id": "test_ig_001",
    "uploaded_gcs_uri": "gs://tough-variety-raw/uploads/instagram/test_ig_001.mp4",
    "processing_options": {
      "force_full_pipeline": true,
      "hook_genome_analysis": true,
      "audio_fingerprint": false,
      "brand_detection": false
    }
  }' | jq '.status, .message, .processing_id'
```

### TikTok (업로드 기반)
```bash
# GCS URI 업로드 확인
curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "tiktok", 
    "content_id": "test_tt_001",
    "uploaded_gcs_uri": "gs://tough-variety-raw/uploads/tiktok/test_tt_001.mp4",
    "processing_options": {
      "force_full_pipeline": true,
      "hook_genome_analysis": true,
      "audio_fingerprint": false,
      "brand_detection": false
    }
  }' | jq '.status, .message, .processing_id'
```

## 2. 인프라 점검

### GCS 버킷 상태
```bash
# RAW 버킷 점검
gsutil ls gs://tough-variety-raw/uploads/ | head -10
gsutil ls gs://tough-variety-raw/raw/ingest/ | head -10

# GOLD 버킷 점검  
gsutil ls gs://tough-variety-gold/dt=$(date +%Y-%m-%d)/ | head -10
```

### BigQuery 테이블 상태
```bash
# vdp_gold 테이블 최근 데이터 확인
bq query --use_legacy_sql=false \
  'SELECT load_date, COUNT(*) as records 
   FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
   WHERE load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
   GROUP BY load_date ORDER BY load_date DESC'
```

### Vertex AI 서비스 상태
```bash
# t2-extract API 서비스 확인
gcloud run services describe t2-extract --region=us-central1 --format="value(status.url)"
curl -sS $(gcloud run services describe t2-extract --region=us-central1 --format="value(status.url)")/health
```

## 3. Worker 프로세스 점검

### Ingest Worker 상태
```bash
# Worker 프로세스 확인
ps aux | grep worker-ingest
lsof -i :3000 # API 서버 포트 확인

# Worker 로그 확인
tail -f logs/worker-ingest.log | grep -E "(processed|failed|error)" | head -20
```

### 처리 대기열 확인
```bash
# 플랫폼별 요청 대기열
gsutil ls gs://tough-variety-raw/ingest/requests/youtube/*.json | wc -l
gsutil ls gs://tough-variety-raw/ingest/requests/instagram/*.json | wc -l  
gsutil ls gs://tough-variety-raw/ingest/requests/tiktok/*.json | wc -l

# 실패 대기열 확인
gsutil ls gs://tough-variety-raw/ingest/requests/*/.failed/ | wc -l
```

## 4. Schema & Validation 점검

### VDP Schema 검증 도구
```bash
# Schema 파일 유효성 확인
ajv validate -s schemas/vdp-vertex-hook.schema.json -d testdata/sample.vdp.json

# Evidence Pack Schema 확인  
ajv validate -s schemas/evidence-pack-v2.schema.json -d testdata/sample.evidence.json
```

### Hook Genome Gate 점검
```bash
# Hook 검증 로직 테스트
./scripts/validate-hook-enhanced.sh testdata/sample.vdp.json
echo "Hook strength threshold: $HOOK_MIN_STRENGTH"
echo "Hook timing limit: $HOOK_MAX_START_SEC"
```

## 5. 종합 헬스체크 스크립트

### 전체 시스템 점검 스크립트 (`scripts/ops-health-check.sh`)

```bash
#!/bin/bash
# ops-health-check.sh - 운영 상태 종합 점검

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PLATFORM=""
VERBOSE=false
CHECK_ALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --all)
      CHECK_ALL=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

print_status() {
  local status=$1
  local message=$2
  
  case $status in
    "OK")
      echo -e "${GREEN}✅ $message${NC}"
      ;;
    "WARN")
      echo -e "${YELLOW}⚠️  $message${NC}"
      ;;
    "FAIL")
      echo -e "${RED}❌ $message${NC}"
      ;;
  esac
}

check_api_health() {
  echo "🔍 API Health Check"
  
  # API 서버 연결성
  if curl -sS http://localhost:8080/api/health >/dev/null 2>&1; then
    print_status "OK" "API server responding"
  else
    print_status "FAIL" "API server not responding"
    return 1
  fi
  
  # t2-extract 서비스 확인
  if gcloud run services describe t2-extract --region=us-central1 >/dev/null 2>&1; then
    print_status "OK" "t2-extract service available"
  else
    print_status "FAIL" "t2-extract service not found"
  fi
}

check_gcs_buckets() {
  echo "🗄️ GCS Buckets Check"
  
  # RAW 버킷
  if gsutil ls gs://tough-variety-raw >/dev/null 2>&1; then
    print_status "OK" "RAW bucket accessible"
  else
    print_status "FAIL" "RAW bucket not accessible"
  fi
  
  # GOLD 버킷
  if gsutil ls gs://tough-variety-gold >/dev/null 2>&1; then
    print_status "OK" "GOLD bucket accessible"
  else
    print_status "FAIL" "GOLD bucket not accessible"
  fi
  
  # 오늘 파티션 확인
  TODAY=$(date +%Y-%m-%d)
  GOLD_COUNT=$(gsutil ls gs://tough-variety-gold/dt=$TODAY/ 2>/dev/null | wc -l || echo 0)
  print_status "OK" "Today's GOLD partition: $GOLD_COUNT files"
}

check_bigquery() {
  echo "🏗️ BigQuery Check"
  
  # vdp_gold 테이블 접근성
  if bq show tough-variety-466003-c5:vdp_dataset.vdp_gold >/dev/null 2>&1; then
    print_status "OK" "vdp_gold table accessible"
  else
    print_status "FAIL" "vdp_gold table not accessible"
  fi
  
  # 최근 3일 데이터 확인
  RECENT_RECORDS=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)' 2>/dev/null | tail -1 || echo 0)
  print_status "OK" "Recent records (3 days): $RECENT_RECORDS"
}

check_platform_specific() {
  local platform=$1
  echo "🎯 Platform Check: $platform"
  
  case $platform in
    "youtube")
      # yt-dlp 확인
      if command -v yt-dlp >/dev/null 2>&1; then
        print_status "OK" "yt-dlp available"
      else
        print_status "FAIL" "yt-dlp not installed"
      fi
      ;;
    "instagram"|"tiktok")
      # 업로드 디렉토리 확인
      UPLOAD_COUNT=$(gsutil ls gs://tough-variety-raw/uploads/$platform/ 2>/dev/null | wc -l || echo 0)
      print_status "OK" "Upload directory: $UPLOAD_COUNT files"
      ;;
  esac
}

check_schemas() {
  echo "📋 Schema Validation Check"
  
  # Schema 파일들 존재 확인
  if [[ -f "schemas/vdp-vertex-hook.schema.json" ]]; then
    print_status "OK" "VDP schema available"
  else
    print_status "FAIL" "VDP schema missing"
  fi
  
  if [[ -f "schemas/evidence-pack-v2.schema.json" ]]; then
    print_status "OK" "Evidence Pack schema available"
  else
    print_status "WARN" "Evidence Pack schema missing"
  fi
  
  # AJV 도구 확인
  if command -v ajv >/dev/null 2>&1; then
    print_status "OK" "AJV validator available"
  else
    print_status "FAIL" "AJV validator not installed"
  fi
}

check_worker_processes() {
  echo "⚙️ Worker Processes Check"
  
  # Ingest worker 프로세스
  if pgrep -f "worker-ingest" >/dev/null 2>&1; then
    print_status "OK" "Ingest worker running"
  else
    print_status "WARN" "Ingest worker not running"
  fi
  
  # API 서버 프로세스
  if lsof -i :3000 >/dev/null 2>&1; then
    print_status "OK" "API server listening on :3000"
  else
    print_status "FAIL" "API server not listening"
  fi
}

main() {
  echo "🔍 VDP Pipeline 운영 점검 시작"
  echo "Timestamp: $(date)"
  echo "=====================================\n"
  
  check_api_health
  echo ""
  
  check_gcs_buckets
  echo ""
  
  check_bigquery
  echo ""
  
  check_schemas
  echo ""
  
  check_worker_processes
  echo ""
  
  if [[ "$CHECK_ALL" == true ]]; then
    echo "🎯 All Platform Checks"
    check_platform_specific "youtube"
    check_platform_specific "instagram"
    check_platform_specific "tiktok"
  elif [[ -n "$PLATFORM" ]]; then
    check_platform_specific "$PLATFORM"
  fi
  
  echo "\n====================================="
  echo "✅ 운영 점검 완료 $(date)"
}

main "$@"
```

## 6. 플랫폼별 테스트 스크립트

### YouTube 테스트 (`scripts/test-youtube-ingest.sh`)

```bash
#!/bin/bash
# test-youtube-ingest.sh - YouTube 인제스트 테스트

TEST_URL="https://www.youtube.com/watch?v=f9Sa4dTGPqU"
CONTENT_ID="f9Sa4dTGPqU"

echo "🎥 YouTube Ingest Test"
echo "URL: $TEST_URL"
echo "Content ID: $CONTENT_ID"

RESPONSE=$(curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"youtube\",
    \"content_id\": \"$CONTENT_ID\",
    \"source_url\": \"$TEST_URL\",
    \"processing_options\": {
      \"force_full_pipeline\": true,
      \"hook_genome_analysis\": true,
      \"audio_fingerprint\": false,
      \"brand_detection\": false
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq

# Processing ID 추출 및 상태 모니터링
PROCESSING_ID=$(echo "$RESPONSE" | jq -r '.processing_id // empty')
if [[ -n "$PROCESSING_ID" ]]; then
  echo "Processing ID: $PROCESSING_ID"
  echo "Monitoring status..."
  ./scripts/monitor-processing.sh "$PROCESSING_ID"
fi
```

### Instagram/TikTok 테스트 (`scripts/test-social-ingest.sh`)

```bash
#!/bin/bash
# test-social-ingest.sh - Instagram/TikTok 인제스트 테스트

PLATFORM=${1:-instagram}
CONTENT_ID="test_${PLATFORM}_$(date +%s)"
GCS_URI="gs://tough-variety-raw/uploads/$PLATFORM/$CONTENT_ID.mp4"

echo "📱 $PLATFORM Ingest Test"
echo "Content ID: $CONTENT_ID"
echo "GCS URI: $GCS_URI"

# 테스트 파일이 GCS에 존재하는지 확인
if gsutil stat "$GCS_URI" >/dev/null 2>&1; then
  echo "✅ Test file exists in GCS"
else
  echo "⚠️ Test file not found, creating dummy file..."
  echo "dummy content" | gsutil cp - "$GCS_URI"
fi

RESPONSE=$(curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"$PLATFORM\",
    \"content_id\": \"$CONTENT_ID\",
    \"uploaded_gcs_uri\": \"$GCS_URI\",
    \"processing_options\": {
      \"force_full_pipeline\": true,
      \"hook_genome_analysis\": true,
      \"audio_fingerprint\": false,
      \"brand_detection\": false
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq

# 처리 상태 모니터링
PROCESSING_ID=$(echo "$RESPONSE" | jq -r '.processing_id // empty')
if [[ -n "$PROCESSING_ID" ]]; then
  echo "Processing ID: $PROCESSING_ID"
  ./scripts/monitor-processing.sh "$PROCESSING_ID"
fi
```

## 7. 모니터링 스크립트

### 처리 상태 모니터링 (`scripts/monitor-processing.sh`)

```bash
#!/bin/bash
# monitor-processing.sh - 처리 상태 실시간 모니터링

PROCESSING_ID=$1
if [[ -z "$PROCESSING_ID" ]]; then
  echo "Usage: $0 <processing_id>"
  exit 1
fi

echo "🔍 Monitoring Processing ID: $PROCESSING_ID"

MAX_WAIT=300  # 5분 최대 대기
WAIT_COUNT=0

while [[ $WAIT_COUNT -lt $MAX_WAIT ]]; do
  STATUS_RESPONSE=$(curl -sS "http://localhost:8080/api/processing/$PROCESSING_ID/status")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // "unknown"')
  
  echo "[$(date +%H:%M:%S)] Status: $STATUS"
  
  case $STATUS in
    "completed")
      echo "✅ Processing completed successfully"
      echo "$STATUS_RESPONSE" | jq '.result'
      break
      ;;
    "failed")
      echo "❌ Processing failed"
      echo "$STATUS_RESPONSE" | jq '.error'
      break
      ;;
    "processing"|"queued")
      echo "🔄 Still processing..."
      sleep 10
      WAIT_COUNT=$((WAIT_COUNT + 10))
      ;;
    *)
      echo "❓ Unknown status: $STATUS"
      sleep 5
      WAIT_COUNT=$((WAIT_COUNT + 5))
      ;;
  esac
done

if [[ $WAIT_COUNT -ge $MAX_WAIT ]]; then
  echo "⏰ Timeout waiting for processing completion"
  exit 1
fi
```

## 8. 종합 검증 체크리스트

### 사전 점검 항목
- [ ] 인제스트 API 서버 응답 (localhost:8080/api/health)
- [ ] t2-extract 서비스 활성 상태
- [ ] GCS 버킷 접근성 (RAW/GOLD)
- [ ] BigQuery vdp_gold 테이블 접근성
- [ ] Worker 프로세스 실행 상태
- [ ] Schema 파일 유효성 (AJV)

### 플랫폼별 검증
- [ ] YouTube: yt-dlp 설치, URL 다운로드 테스트
- [ ] Instagram: GCS 업로드 디렉토리, 메타데이터 형식
- [ ] TikTok: GCS 업로드 디렉토리, 메타데이터 형식

### 후처리 검증
- [ ] VDP RAW 생성 성공
- [ ] Hook Genome 분석 완료
- [ ] Schema 검증 통과
- [ ] JSONL 변환 성공
- [ ] BigQuery 적재 완료

## 9. 트러블슈팅 가이드

### 일반적인 문제들

**API 서버 응답 없음**
```bash
# 포트 점검
lsof -i :3000
# 프로세스 재시작
pkill -f "npm.*start"
npm start &
```

**GCS 접근 권한 오류**
```bash
# 인증 확인
gcloud auth list
gcloud config set project tough-variety-466003-c5
```

**BigQuery 쿼리 실패**
```bash
# 데이터셋 확인
bq ls tough-variety-466003-c5:vdp_dataset
# 권한 확인
bq show tough-variety-466003-c5:vdp_dataset.vdp_gold
```

**Worker 처리 지연**
```bash
# 처리 대기열 확인
gsutil ls gs://tough-variety-raw/ingest/requests/**/*.json | wc -l
# Worker 로그 확인
tail -f logs/worker-ingest.log
```

## 10. 성능 벤치마크

### 예상 처리 시간
- **YouTube Shorts (30s)**: 2-3분 (다운로드 + VDP 생성)
- **Instagram/TikTok (업로드)**: 1-2분 (VDP 생성만)
- **Hook Genome 분석**: +30초 추가
- **BigQuery 적재**: 10-30초

### 동시 처리 한계
- **API 동시 요청**: 3-5개 권장
- **Worker 병렬 처리**: 3개 파일 동시
- **Vertex AI 호출**: ~10 RPM/project

## 사용법

### 정기 점검 (매일)
```bash
./scripts/ops-health-check.sh --all --verbose > logs/health-$(date +%Y%m%d).log
```

### 대량 적재 전 점검
```bash
./scripts/ops-health-check.sh --all
./scripts/test-youtube-ingest.sh
./scripts/test-social-ingest.sh instagram  
./scripts/test-social-ingest.sh tiktok
```

### 장애 시 긴급 점검
```bash
./scripts/ops-health-check.sh --platform youtube --verbose
tail -100 logs/worker-ingest.log | grep ERROR
```