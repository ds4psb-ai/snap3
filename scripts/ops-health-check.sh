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
  
  # 인제스트 API 서버 연결성
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
  
  # 인제스트 API 서버 프로세스
  if lsof -i :8080 >/dev/null 2>&1; then
    print_status "OK" "Ingest API server listening on :8080"
  else
    print_status "FAIL" "Ingest API server not listening"
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