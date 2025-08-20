#!/bin/bash

echo "📊 P95 응답시간 실시간 계산 시작"

RESPONSE_TIMES_FILE="response-times.log"
P95_RESULTS_FILE="p95-results.json"

while true; do
    # T1 API 응답시간 측정 (10회)
    echo "⏱️ API 응답시간 측정 중..."
    
    for i in {1..10}; do
        START_TIME=$(python3 -c "import time; print(int(time.time() * 1000))")  # 밀리초
        
        curl -s http://localhost:8080/api/health > /dev/null 2>&1
        
        END_TIME=$(python3 -c "import time; print(int(time.time() * 1000))")
        RESPONSE_TIME=$((END_TIME - START_TIME))
        
        echo "$RESPONSE_TIME" >> "$RESPONSE_TIMES_FILE"
        echo "[$i/10] 응답시간: ${RESPONSE_TIME}ms"
        
        sleep 0.5
    done
    
    # P95 계산 (최근 100개 데이터)
    if [ -f "$RESPONSE_TIMES_FILE" ]; then
        P95_VALUE=$(tail -n 100 "$RESPONSE_TIMES_FILE" | sort -n | awk 'BEGIN{c=0} {arr[c]=$1; c++} END{print arr[int(c*0.95)]}')
        P50_VALUE=$(tail -n 100 "$RESPONSE_TIMES_FILE" | sort -n | awk 'BEGIN{c=0} {arr[c]=$1; c++} END{print arr[int(c*0.50)]}')
        AVG_VALUE=$(tail -n 100 "$RESPONSE_TIMES_FILE" | awk '{sum+=$1} END{print int(sum/NR)}')
        
        echo "📊 [T3] P95: ${P95_VALUE}ms | P50: ${P50_VALUE}ms | AVG: ${AVG_VALUE}ms"
        
        # JSON 결과 저장
        cat > "$P95_RESULTS_FILE" << JSON_EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "metrics": {
        "p95_response_time_ms": $P95_VALUE,
        "p50_response_time_ms": $P50_VALUE,
        "avg_response_time_ms": $AVG_VALUE,
        "sample_count": 100
    },
    "target": {
        "p95_threshold": 500,
        "status": "$( [ $P95_VALUE -lt 500 ] && echo "PASS" || echo "FAIL" )"
    }
}
JSON_EOF
        
        # 성능 임계값 체크
        if [ "$P95_VALUE" -gt 500 ]; then
            echo "⚠️ [T3] P95 응답시간 임계값 초과: ${P95_VALUE}ms > 500ms"
        fi
    fi
    
    sleep 10
done