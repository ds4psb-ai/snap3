#!/bin/bash

echo "🧠 재귀개선 하이브리드 모드 시작"
echo "🎯 본업: 인제스터 UI 80% | 재귀개선: 백그라운드 20%"

COMPLEXITY_THRESHOLD=0.75
API_ERROR_THRESHOLD=3
FILE_CHANGE_THRESHOLD=5

while true; do
    # 실시간 복잡도 계산
    FILES_CHANGED=$(git status --porcelain | wc -l)
    API_ERRORS=$(curl -s http://localhost:8080/api/circuit-breaker/status | jq '.state.failureCount // 0')
    CURSOR_STATUS=$(curl -s http://localhost:3000 2>/dev/null && echo "1" || echo "0")
    
    # 복잡도 점수 (0.0-1.0)
    COMPLEXITY=$(echo "scale=2; ($FILES_CHANGED / 10) + ($API_ERRORS / 10) + (1 - $CURSOR_STATUS) * 0.3" | bc)
    
    echo "📊 [BG] 복잡도: $COMPLEXITY | 파일: $FILES_CHANGED | API에러: $API_ERRORS | Cursor: $CURSOR_STATUS"
    
    # 임계값 초과 → 자동 재귀개선 트리거
    if (( $(echo "$COMPLEXITY > $COMPLEXITY_THRESHOLD" | bc -l) )); then
        echo "🚨 [BG] 복잡도 임계값 초과 → 자동 재귀개선 활성화"
        
        # GPT-5 + Cursor 자동 컨설팅 요청
        cat > .collab-msg-auto-quality-improvement << EOF_AUTO
# 🚨 자동 품질 개선 트리거

**복잡도**: $COMPLEXITY > $COMPLEXITY_THRESHOLD
**컨텍스트**: 인제스터 UI 개발 중 품질 저하 감지

## 현재 상황:
- 수정 파일: $FILES_CHANGED개
- API 에러: $API_ERRORS개
- Cursor 상태: $CURSOR_STATUS

## 컨설팅 요청:
복잡도 급증으로 3-Agent 합의 필요. 품질 저하 방지를 위한 즉시 개입 권장.
EOF_AUTO
        
        echo "📨 [BG] 자동 품질 개선 요청 생성"
        sleep 60  # 1분 대기 후 다시 모니터링
    fi
    
    sleep 30
done