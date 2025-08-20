#!/bin/bash
# 범용 재귀개선을 위한 확장 메트릭 수집기
set -euo pipefail

CORRELATION_ID="T3-UNIVERSAL-$(date +%s)"
METRICS_DIR="../../../logs/universal"
mkdir -p "$METRICS_DIR"

collect_universal_metrics() {
    local context="$1"
    local timestamp=$(date +%s)
    
    # Circuit Breaker 상태
    cb_status=$(curl -s http://localhost:8080/api/circuit-breaker/status 2>/dev/null || echo '{}')
    
    # P95 메트릭
    p95_data=$(cat p95-results.json 2>/dev/null || echo '{}')
    
    # 통합 메트릭 생성
    jq -n \
        --arg ts "$timestamp" \
        --arg ctx "$context" \
        --arg corr "$CORRELATION_ID" \
        --argjson cb "$cb_status" \
        --argjson p95 "$p95_data" \
        '{
            timestamp: $ts,
            context: $ctx,
            correlation_id: $corr,
            circuit_breaker: $cb,
            p95_metrics: $p95,
            collection_time: (now | todate)
        }' >> "$METRICS_DIR/universal-metrics-$(date +%Y%m%d).jsonl"
}

# 메트릭 수집 실행
collect_universal_metrics "architecture"
echo "✅ [T3] 범용 메트릭 수집 완료"