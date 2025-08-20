#!/bin/bash
# pipeline-status-monitor.sh - 파이프라인 실시간 상태 모니터링

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MONITOR_DURATION=${1:-60}  # 기본 60초 모니터링
REFRESH_INTERVAL=10

print_timestamp() {
  echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

get_queue_stats() {
  local platform=$1
  gsutil ls gs://tough-variety-raw/ingest/requests/$platform/*.json 2>/dev/null | wc -l || echo 0
}

get_processing_stats() {
  # 현재 처리 중인 작업 수 (rough estimate)
  local active_processes=$(ps aux | grep -c "t2-extract\|vertex-hook" || echo 0)
  echo $active_processes
}

get_bigquery_today() {
  bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_date = CURRENT_DATE()' 2>/dev/null | tail -1 || echo 0
}

get_bigquery_hourly() {
  bq query --use_legacy_sql=false --format=csv \
    'SELECT COUNT(*) FROM `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
     WHERE load_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)' 2>/dev/null | tail -1 || echo 0
}

monitor_pipeline() {
  local start_time=$(date +%s)
  local end_time=$((start_time + MONITOR_DURATION))
  
  print_timestamp "파이프라인 모니터링 시작 (${MONITOR_DURATION}초)"
  echo ""
  
  while [[ $(date +%s) -lt $end_time ]]; do
    # Header
    clear
    echo "🔍 VDP Pipeline 실시간 상태 모니터링"
    echo "모니터링 시간: $(date)"
    echo "남은 시간: $((end_time - $(date +%s)))초"
    echo "================================================"
    echo ""
    
    # Queue Status
    echo "📋 처리 대기열 상태:"
    YOUTUBE_QUEUE=$(get_queue_stats "youtube")
    IG_QUEUE=$(get_queue_stats "instagram")
    TT_QUEUE=$(get_queue_stats "tiktok")
    
    echo "  YouTube: $YOUTUBE_QUEUE 건"
    echo "  Instagram: $IG_QUEUE 건"
    echo "  TikTok: $TT_QUEUE 건"
    echo "  Total: $((YOUTUBE_QUEUE + IG_QUEUE + TT_QUEUE)) 건"
    echo ""
    
    # Processing Status
    echo "⚙️ 처리 상태:"
    ACTIVE_PROCESSES=$(get_processing_stats)
    echo "  활성 프로세스: $ACTIVE_PROCESSES 개"
    
    # API Health
    if curl -sS http://localhost:3000/health >/dev/null 2>&1; then
      echo -e "  API 서버: ${GREEN}정상${NC}"
    else
      echo -e "  API 서버: ${RED}응답없음${NC}"
    fi
    echo ""
    
    # BigQuery Stats
    echo "📊 처리 통계:"
    TODAY_COUNT=$(get_bigquery_today)
    HOURLY_COUNT=$(get_bigquery_hourly)
    echo "  오늘 처리량: $TODAY_COUNT 건"
    echo "  지난 1시간: $HOURLY_COUNT 건"
    echo "  시간당 평균: $((HOURLY_COUNT)) 건/시간"
    echo ""
    
    # Performance Indicators
    echo "🎯 성능 지표:"
    if [[ $((YOUTUBE_QUEUE + IG_QUEUE + TT_QUEUE)) -lt 50 ]]; then
      echo -e "  대기열 상태: ${GREEN}정상${NC}"
    elif [[ $((YOUTUBE_QUEUE + IG_QUEUE + TT_QUEUE)) -lt 200 ]]; then
      echo -e "  대기열 상태: ${YELLOW}주의${NC}"
    else
      echo -e "  대기열 상태: ${RED}과부하${NC}"
    fi
    
    if [[ $HOURLY_COUNT -gt 10 ]]; then
      echo -e "  처리율: ${GREEN}정상${NC}"
    elif [[ $HOURLY_COUNT -gt 3 ]]; then
      echo -e "  처리율: ${YELLOW}저조${NC}"
    else
      echo -e "  처리율: ${RED}매우저조${NC}"
    fi
    echo ""
    
    echo "Press Ctrl+C to stop monitoring..."
    sleep $REFRESH_INTERVAL
  done
  
  print_timestamp "모니터링 완료"
}

# Ctrl+C 핸들러
trap 'echo -e "\n${YELLOW}모니터링 중단됨${NC}"; exit 0' INT

monitor_pipeline