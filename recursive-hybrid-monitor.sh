#!/bin/bash

echo "🧠 재귀개선 하이브리드 모드 v2.0 시작"
echo "🎯 본업: Cursor 테스트 지원 80% | 재귀개선: 백그라운드 20%"
echo "🚀 4터미널 최적화: T1(Cursor) ↔ T2(ClaudeCode) ↔ T3(VDP) ↔ T4(Storage)"

COMPLEXITY_THRESHOLD=0.75
API_ERROR_THRESHOLD=3
FILE_CHANGE_THRESHOLD=5
TERMINAL_UTILIZATION_MIN=50

# 터미널 활용도 체크
check_terminal_utilization() {
    local active=0
    for port in 3000 8080 8082 8083; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            active=$((active + 1))
        fi
    done
    echo $((active * 25))  # 4터미널 기준 퍼센트
}

while true; do
    # 실시간 복잡도 계산 + 터미널 활용도  
    FILES_CHANGED=$(git status --porcelain 2>/dev/null | wc -l)
    API_ERRORS=$(curl -s http://localhost:8080/api/circuit-breaker/status 2>/dev/null | jq '.state.failureCount // 0' 2>/dev/null || echo "0")
    CURSOR_STATUS=$(curl -s http://localhost:3000 2>/dev/null >/dev/null && echo "1" || echo "0")
    TERMINAL_UTIL=$(check_terminal_utilization)
    
    # 복잡도 점수 (0.0-1.0) + 터미널 효율성 (bc 에러 방지)
    if command -v bc >/dev/null 2>&1; then
        COMPLEXITY=$(echo "scale=2; ($FILES_CHANGED / 10) + ($API_ERRORS / 10) + (1 - $CURSOR_STATUS) * 0.3" | bc 2>/dev/null || echo "0.50")
    else
        # bc 없을 경우 간단한 계산
        COMPLEXITY="0.50"
    fi
    
    echo "📊 [v2.0] 복잡도: $COMPLEXITY | 파일: $FILES_CHANGED | API에러: $API_ERRORS | Cursor: $CURSOR_STATUS | 터미널: ${TERMINAL_UTIL}%"
    
    # 임계값 초과 → 자동 재귀개선 트리거 (bc 에러 방지)
    if command -v bc >/dev/null 2>&1 && (( $(echo "$COMPLEXITY > $COMPLEXITY_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        echo "🚨 [v2.0] 복잡도 임계값 초과 → 자동 재귀개선 활성화"
        
        # 터미널 활용도도 체크
        if [ "$TERMINAL_UTIL" -lt "$TERMINAL_UTILIZATION_MIN" ]; then
            echo "⚠️ [v2.0] 터미널 활용도 낮음 (${TERMINAL_UTIL}%) → 분업 최적화 필요"
        fi
        
        # GPT-5 + Cursor 자동 컨설팅 요청
        cat > .collab-msg-auto-quality-improvement << EOF_AUTO
# 🚨 자동 품질 개선 트리거 v2.0

**복잡도**: $COMPLEXITY > $COMPLEXITY_THRESHOLD
**터미널 활용도**: ${TERMINAL_UTIL}% (최소 ${TERMINAL_UTILIZATION_MIN}% 필요)
**컨텍스트**: Cursor 테스트 지원 중 품질 저하 감지

## 현재 상황:
- 수정 파일: $FILES_CHANGED개
- API 에러: $API_ERRORS개  
- Cursor 상태: $CURSOR_STATUS
- 4터미널 활용: ${TERMINAL_UTIL}%

## 컨설팅 요청:
복잡도 급증 + 터미널 저활용으로 3-Agent 합의 + 분업 최적화 필요.

### 추천 액션:
1. 즉시 작업 분산 (Cursor UI ↔ ClaudeCode API)
2. 터미널 활용도 50% 이상 달성
3. 병렬 처리로 효율성 향상
EOF_AUTO
        
        echo "📨 [v2.0] 자동 품질 개선 + 분업 최적화 요청 생성"
        sleep 60  # 1분 대기 후 다시 모니터링
    fi
    
    sleep 30
done