#!/bin/bash

echo "📊 Circuit Breaker 실시간 메트릭 수집 시작"
echo "🔗 Target: T1 localhost:8080/api/circuit-breaker/status"

METRICS_FILE="circuit-breaker-metrics.json"
INTERVAL=5  # 5초 간격

# 메트릭 수집 헤더
echo "timestamp,state,failure_count,retry_attempts,success_rate,avg_response_time" > circuit-breaker-metrics.csv

echo "📈 실시간 메트릭 수집 시작 (5초 간격)"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # T1 Circuit Breaker API 호출 (현재 T3에서 직접 수집 중인 데이터 활용)
    if [ -f "t3-circuit-breaker-live.json" ]; then
        # T3 자체 Circuit Breaker 데이터에서 T1 API 메트릭 추출
        STATE=$(jq -r '.t1_api_breaker.state' t3-circuit-breaker-live.json)
        FAILURE_COUNT=$(jq -r '.t1_api_breaker.failureCount' t3-circuit-breaker-live.json)
        SUCCESS_RATE=$(jq -r '.t1_api_breaker.successRate' t3-circuit-breaker-live.json)
        AVG_RESPONSE=$(jq -r '.t1_api_breaker.avgResponseTime' t3-circuit-breaker-live.json)
        TOTAL_REQUESTS=$(jq -r '.t1_api_breaker.totalRequests' t3-circuit-breaker-live.json)
        
        # CSV 로그
        echo "$TIMESTAMP,$STATE,$FAILURE_COUNT,0,$SUCCESS_RATE,$AVG_RESPONSE" >> circuit-breaker-metrics.csv
        
        # 실시간 콘솔 출력
        echo "[$TIMESTAMP] State: $STATE | Failures: $FAILURE_COUNT | Requests: $TOTAL_REQUESTS | Success: $SUCCESS_RATE | Avg: $AVG_RESPONSE"
        
        # 상태 변화 감지
        if [ "$STATE" = "OPEN" ]; then
            echo "🚨 [T3] Circuit Breaker OPEN 상태 감지! 알림 전송"
            echo "$(date): CIRCUIT_BREAKER_OPEN,$FAILURE_COUNT,T1_API" >> circuit-breaker-alerts.log
        elif [ "$STATE" = "HALF_OPEN" ]; then
            echo "⚠️ [T3] Circuit Breaker HALF_OPEN 상태 - 복구 시도 중"
        fi
        
        # JSON 메트릭 저장 (현재 상태)
        cat t3-circuit-breaker-live.json > "$METRICS_FILE"
        
    else
        echo "❌ [T3] Circuit Breaker 라이브 데이터 없음"
        echo "$TIMESTAMP,ERROR,0,0,0%,0ms" >> circuit-breaker-metrics.csv
    fi
    
    sleep $INTERVAL
done