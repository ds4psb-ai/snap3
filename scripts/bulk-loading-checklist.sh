#!/bin/bash
# bulk-loading-checklist.sh - 대량 적재 전 검증 체크리스트

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKLIST_PASSED=true

print_header() {
  echo -e "${BLUE}$1${NC}"
  echo "=================================="
}

print_check() {
  local status=$1
  local message=$2
  
  case $status in
    "PASS")
      echo -e "${GREEN}✅ $message${NC}"
      ;;
    "FAIL")
      echo -e "${RED}❌ $message${NC}"
      CHECKLIST_PASSED=false
      ;;
    "WARN")
      echo -e "${YELLOW}⚠️  $message${NC}"
      ;;
    "INFO")
      echo -e "${BLUE}ℹ️  $message${NC}"
      ;;
  esac
}

check_prerequisites() {
  print_header "1. 사전 요구사항 점검"
  
  # 인제스트 API 서버 상태
  if curl -sS http://localhost:8080/api/health >/dev/null 2>&1; then
    print_check "PASS" "API 서버 응답 정상"
  else
    print_check "FAIL" "API 서버 응답 없음 - 서버 시작 필요"
  fi
  
  # GCS 버킷 접근성
  if gsutil ls gs://tough-variety-raw >/dev/null 2>&1; then
    print_check "PASS" "RAW 버킷 접근 가능"
  else
    print_check "FAIL" "RAW 버킷 접근 불가 - 인증 확인 필요"
  fi
  
  if gsutil ls gs://tough-variety-gold >/dev/null 2>&1; then
    print_check "PASS" "GOLD 버킷 접근 가능"
  else
    print_check "FAIL" "GOLD 버킷 접근 불가 - 인증 확인 필요"
  fi
  
  # BigQuery 테이블 확인
  if bq show tough-variety-466003-c5:vdp_dataset.vdp_gold >/dev/null 2>&1; then
    print_check "PASS" "BigQuery vdp_gold 테이블 접근 가능"
  else
    print_check "FAIL" "BigQuery 테이블 접근 불가"
  fi
  
  # Vertex AI 서비스 확인
  if gcloud run services describe t2-extract --region=us-central1 >/dev/null 2>&1; then
    print_check "PASS" "t2-extract 서비스 활성"
  else
    print_check "FAIL" "t2-extract 서비스 비활성"
  fi
  
  echo ""
}

check_platform_tools() {
  print_header "2. 플랫폼별 도구 점검"
  
  # YouTube tools
  if command -v yt-dlp >/dev/null 2>&1; then
    print_check "PASS" "yt-dlp 설치됨"
  else
    print_check "FAIL" "yt-dlp 미설치 - pip install yt-dlp 필요"
  fi
  
  # Schema validation tools
  if command -v ajv >/dev/null 2>&1; then
    print_check "PASS" "AJV validator 설치됨"
  else
    print_check "FAIL" "AJV validator 미설치 - npm install -g ajv-cli 필요"
  fi
  
  # jq 도구
  if command -v jq >/dev/null 2>&1; then
    print_check "PASS" "jq JSON processor 설치됨"
  else
    print_check "FAIL" "jq 미설치 - brew install jq 필요"
  fi
  
  echo ""
}

check_schema_files() {
  print_header "3. Schema 파일 점검"
  
  # VDP Schema
  if [[ -f "schemas/vdp-vertex-hook.schema.json" ]]; then
    print_check "PASS" "VDP schema 파일 존재"
    # Schema 유효성 확인
    if jq empty schemas/vdp-vertex-hook.schema.json 2>/dev/null; then
      print_check "PASS" "VDP schema JSON 형식 유효"
    else
      print_check "FAIL" "VDP schema JSON 형식 오류"
    fi
  else
    print_check "FAIL" "VDP schema 파일 없음"
  fi
  
  # Evidence Pack Schema
  if [[ -f "schemas/evidence-pack-v2.schema.json" ]]; then
    print_check "PASS" "Evidence Pack schema 파일 존재"
    if jq empty schemas/evidence-pack-v2.schema.json 2>/dev/null; then
      print_check "PASS" "Evidence Pack schema JSON 형식 유효"
    else
      print_check "FAIL" "Evidence Pack schema JSON 형식 오류"
    fi
  else
    print_check "WARN" "Evidence Pack schema 파일 없음 (선택적)"
  fi
  
  echo ""
}

check_processing_capacity() {
  print_header "4. 처리 용량 점검"
  
  # 처리 대기열 확인
  YOUTUBE_QUEUE=$(gsutil ls gs://tough-variety-raw/ingest/requests/youtube/*.json 2>/dev/null | wc -l || echo 0)
  IG_QUEUE=$(gsutil ls gs://tough-variety-raw/ingest/requests/instagram/*.json 2>/dev/null | wc -l || echo 0)  
  TT_QUEUE=$(gsutil ls gs://tough-variety-raw/ingest/requests/tiktok/*.json 2>/dev/null | wc -l || echo 0)
  
  print_check "INFO" "YouTube 대기열: $YOUTUBE_QUEUE 건"
  print_check "INFO" "Instagram 대기열: $IG_QUEUE 건"
  print_check "INFO" "TikTok 대기열: $TT_QUEUE 건"
  
  TOTAL_QUEUE=$((YOUTUBE_QUEUE + IG_QUEUE + TT_QUEUE))
  if [[ $TOTAL_QUEUE -lt 100 ]]; then
    print_check "PASS" "대기열 정상 범위 ($TOTAL_QUEUE < 100)"
  elif [[ $TOTAL_QUEUE -lt 500 ]]; then
    print_check "WARN" "대기열 많음 ($TOTAL_QUEUE) - 처리 지연 가능"
  else
    print_check "FAIL" "대기열 과부하 ($TOTAL_QUEUE) - 대량 적재 연기 권장"
  fi
  
  # 실패 대기열 확인
  FAILED_COUNT=$(gsutil ls gs://tough-variety-raw/ingest/requests/*/.failed/ 2>/dev/null | wc -l || echo 0)
  if [[ $FAILED_COUNT -eq 0 ]]; then
    print_check "PASS" "실패 대기열 비어있음"
  elif [[ $FAILED_COUNT -lt 10 ]]; then
    print_check "WARN" "실패 대기열: $FAILED_COUNT 건 - 정리 권장"
  else
    print_check "FAIL" "실패 대기열 과다: $FAILED_COUNT 건 - 정리 필수"
  fi
  
  echo ""
}

check_recent_performance() {
  print_header "5. 최근 성능 점검"
  
  # 최근 24시간 처리량
  RECENT_RECORDS=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_date = CURRENT_DATE()' 2>/dev/null | tail -1 || echo 0)
  
  print_check "INFO" "오늘 처리량: $RECENT_RECORDS 건"
  
  if [[ $RECENT_RECORDS -gt 100 ]]; then
    print_check "PASS" "처리량 정상 (>100 건/일)"
  elif [[ $RECENT_RECORDS -gt 10 ]]; then
    print_check "WARN" "처리량 낮음 ($RECENT_RECORDS 건/일)"
  else
    print_check "FAIL" "처리량 매우 낮음 ($RECENT_RECORDS 건/일) - 파이프라인 문제 가능"
  fi
  
  # 플랫폼별 처리 성공률 확인
  PLATFORM_STATS=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT 
       JSON_VALUE(metadata, "$.platform") as platform,
       COUNT(*) as count
     FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold`
     WHERE load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
     GROUP BY platform' 2>/dev/null || echo "")
  
  if [[ -n "$PLATFORM_STATS" ]]; then
    print_check "INFO" "플랫폼별 처리 현황:"
    echo "$PLATFORM_STATS" | tail -n +2 | while IFS=, read -r platform count; do
      echo "    - $platform: $count 건"
    done
  fi
  
  echo ""
}

run_test_ingestion() {
  print_header "6. 테스트 인제스트 실행"
  
  echo "YouTube URL 테스트 실행 중..."
  if timeout 120 ./scripts/test-youtube-ingest.sh >/dev/null 2>&1; then
    print_check "PASS" "YouTube 인제스트 테스트 성공"
  else
    print_check "FAIL" "YouTube 인제스트 테스트 실패 또는 타임아웃"
  fi
  
  echo ""
}

generate_summary() {
  print_header "📊 점검 결과 요약"
  
  if [[ "$CHECKLIST_PASSED" == true ]]; then
    print_check "PASS" "모든 필수 점검 항목 통과 - 대량 적재 준비 완료"
    echo ""
    echo -e "${GREEN}✅ 대량 적재 실행 가능${NC}"
    echo "권장 명령어:"
    echo "  ./scripts/bulk-load-youtube.sh urls.txt"
    echo "  ./scripts/bulk-load-social.sh --platform instagram files.txt"
    echo "  ./scripts/bulk-load-social.sh --platform tiktok files.txt"
  else
    print_check "FAIL" "필수 점검 항목 실패 - 문제 해결 후 재실행 필요"
    echo ""
    echo -e "${RED}❌ 대량 적재 연기 권장${NC}"
    echo "문제 해결 후 다시 실행:"
    echo "  ./scripts/bulk-loading-checklist.sh"
  fi
}

main() {
  echo "🔍 VDP Pipeline 대량 적재 전 점검"
  echo "Timestamp: $(date)"
  echo "============================================"
  echo ""
  
  check_prerequisites
  check_platform_tools  
  check_schema_files
  check_processing_capacity
  check_recent_performance
  run_test_ingestion
  
  generate_summary
}

main "$@"