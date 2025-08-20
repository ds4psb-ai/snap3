#!/bin/bash
# ops-dashboard.sh - 운영 대시보드 (실시간 통계)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_header() {
  clear
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║              VDP Pipeline 운영 대시보드                       ║${NC}"
  echo -e "${BLUE}║              $(date +'%Y-%m-%d %H:%M:%S KST')                           ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

show_system_status() {
  echo -e "${CYAN}🔍 시스템 상태${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # API 서버 상태
  if curl -sS http://localhost:3000/healthz >/dev/null 2>&1; then
    echo -e "API 서버       ${GREEN}●${NC} 정상"
  else
    echo -e "API 서버       ${RED}●${NC} 오프라인"
  fi
  
  # t2-extract 서비스
  if gcloud run services describe t2-extract --region=us-central1 --format="value(status.url)" >/dev/null 2>&1; then
    echo -e "t2-extract     ${GREEN}●${NC} 활성"
  else
    echo -e "t2-extract     ${RED}●${NC} 비활성"
  fi
  
  # Worker 프로세스
  if pgrep -f "worker-ingest" >/dev/null 2>&1; then
    echo -e "Ingest Worker  ${GREEN}●${NC} 실행중"
  else
    echo -e "Ingest Worker  ${YELLOW}●${NC} 정지"
  fi
  
  echo ""
}

show_queue_status() {
  echo -e "${CYAN}📋 처리 대기열${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 플랫폼별 대기열
  YOUTUBE_QUEUE=$(gsutil ls gs://tough-variety-raw/ingest/requests/youtube/*.json 2>/dev/null | wc -l || echo 0)
  IG_QUEUE=$(gsutil ls gs://tough-variety-raw/ingest/requests/instagram/*.json 2>/dev/null | wc -l || echo 0)
  TT_QUEUE=$(gsutil ls gs://tough-variety-raw/ingest/requests/tiktok/*.json 2>/dev/null | wc -l || echo 0)
  TOTAL_QUEUE=$((YOUTUBE_QUEUE + IG_QUEUE + TT_QUEUE))
  
  printf "%-12s %8s %8s %8s %8s\n" "Platform" "대기" "처리중" "완료" "실패"
  printf "%-12s %8s %8s %8s %8s\n" "--------" "----" "----" "----" "----"
  printf "%-12s %8d %8s %8s %8s\n" "YouTube" "$YOUTUBE_QUEUE" "-" "-" "-"
  printf "%-12s %8d %8s %8s %8s\n" "Instagram" "$IG_QUEUE" "-" "-" "-"
  printf "%-12s %8d %8s %8s %8s\n" "TikTok" "$TT_QUEUE" "-" "-" "-"
  printf "%-12s %8d %8s %8s %8s\n" "TOTAL" "$TOTAL_QUEUE" "-" "-" "-"
  
  # 상태 색상 표시
  if [[ $TOTAL_QUEUE -lt 50 ]]; then
    echo -e "\n대기열 상태: ${GREEN}정상${NC} ($TOTAL_QUEUE < 50)"
  elif [[ $TOTAL_QUEUE -lt 200 ]]; then
    echo -e "\n대기열 상태: ${YELLOW}주의${NC} ($TOTAL_QUEUE < 200)"
  else
    echo -e "\n대기열 상태: ${RED}과부하${NC} ($TOTAL_QUEUE ≥ 200)"
  fi
  
  echo ""
}

show_processing_stats() {
  echo -e "${CYAN}📊 처리 통계${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # BigQuery 통계
  TODAY_COUNT=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_date = CURRENT_DATE()' 2>/dev/null | tail -1 || echo 0)
  
  HOUR_COUNT=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)' 2>/dev/null | tail -1 || echo 0)
  
  WEEK_COUNT=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)' 2>/dev/null | tail -1 || echo 0)
  
  printf "%-12s %12s\n" "기간" "처리량"
  printf "%-12s %12s\n" "----" "------"
  printf "%-12s %12d\n" "지난 1시간" "$HOUR_COUNT"
  printf "%-12s %12d\n" "오늘" "$TODAY_COUNT"
  printf "%-12s %12d\n" "지난 7일" "$WEEK_COUNT"
  
  # 처리율 계산
  if [[ $HOUR_COUNT -gt 0 ]]; then
    echo -e "\n시간당 처리율: ${GREEN}$HOUR_COUNT 건/시간${NC}"
  else
    echo -e "\n시간당 처리율: ${YELLOW}0 건/시간${NC}"
  fi
  
  echo ""
}

show_platform_breakdown() {
  echo -e "${CYAN}🎯 플랫폼별 현황${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 플랫폼별 오늘 처리량
  PLATFORM_STATS=$(bq query --use_legacy_sql=false --format=csv \
    'SELECT 
       JSON_VALUE(metadata, "$.platform") as platform,
       COUNT(*) as count
     FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold`
     WHERE load_date = CURRENT_DATE()
     GROUP BY platform
     ORDER BY count DESC' 2>/dev/null | tail -n +2 || echo "")
  
  if [[ -n "$PLATFORM_STATS" ]]; then
    printf "%-12s %12s\n" "Platform" "오늘 처리량"
    printf "%-12s %12s\n" "--------" "--------"
    echo "$PLATFORM_STATS" | while IFS=, read -r platform count; do
      printf "%-12s %12d\n" "$platform" "$count"
    done
  else
    echo "오늘 처리된 데이터가 없습니다."
  fi
  
  echo ""
}

show_performance_metrics() {
  echo -e "${CYAN}⚡ 성능 지표${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # GCS 버킷 용량 (대략적)
  RAW_SIZE=$(gsutil du -s gs://tough-variety-raw 2>/dev/null | awk '{print $1/1024/1024/1024}' || echo 0)
  GOLD_SIZE=$(gsutil du -s gs://tough-variety-gold 2>/dev/null | awk '{print $1/1024/1024/1024}' || echo 0)
  
  printf "%-15s %10s\n" "지표" "값"
  printf "%-15s %10s\n" "----" "---"
  printf "%-15s %8.1f GB\n" "RAW Bucket" "$RAW_SIZE"
  printf "%-15s %8.1f GB\n" "GOLD Bucket" "$GOLD_SIZE"
  
  # Worker 메모리 사용량 (대략적)
  WORKER_MEM=$(ps aux | grep worker-ingest | grep -v grep | awk '{sum+=$6} END {print sum/1024}' || echo 0)
  printf "%-15s %8.1f MB\n" "Worker Memory" "$WORKER_MEM"
  
  echo ""
}

show_recent_errors() {
  echo -e "${CYAN}🚨 최근 오류 (지난 1시간)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Worker 로그에서 최근 에러 확인
  if [[ -f "logs/worker-ingest.log" ]]; then
    RECENT_ERRORS=$(grep -E "(ERROR|FAIL)" logs/worker-ingest.log | tail -5 || echo "")
    if [[ -n "$RECENT_ERRORS" ]]; then
      echo "$RECENT_ERRORS" | while read -r line; do
        echo -e "${RED}❌${NC} ${line:0:80}..."
      done
    else
      echo -e "${GREEN}✅ 오류 없음${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  로그 파일 없음${NC}"
  fi
  
  echo ""
}

show_quick_actions() {
  echo -e "${CYAN}🎛️  빠른 작업${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. 전체 헬스체크: ./scripts/ops-health-check.sh --all"
  echo "2. YouTube 테스트: ./scripts/test-youtube-ingest.sh"
  echo "3. Instagram 테스트: ./scripts/test-social-ingest.sh instagram"
  echo "4. TikTok 테스트: ./scripts/test-social-ingest.sh tiktok"
  echo "5. 대량 적재 체크: ./scripts/bulk-loading-checklist.sh"
  echo "6. 파이프라인 모니터링: ./scripts/pipeline-status-monitor.sh"
  echo ""
  echo "📊 데이터 확인:"
  echo "  bq query 'SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE load_date = CURRENT_DATE()'"
  echo ""
}

main() {
  show_header
  show_system_status
  show_queue_status
  show_processing_stats
  show_platform_breakdown
  show_performance_metrics
  show_recent_errors
  show_quick_actions
  
  echo -e "${BLUE}새로고침: Ctrl+R | 종료: Ctrl+C${NC}"
}

# 연속 모니터링 모드
if [[ "${1:-}" == "--watch" ]]; then
  while true; do
    main
    sleep 30
  done
else
  main
fi