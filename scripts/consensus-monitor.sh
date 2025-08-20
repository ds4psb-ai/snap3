#!/bin/bash

# GPT-5 Pro Consensus Monitor
# 목적: ClaudeCode + Cursor 분석 응답 모니터링 → 합의 검증 → 작업 트리거

set -e

CORRELATION_ID="$1"
ANALYSIS_DIR="./analysis/gpt5-consensus"
TIMEOUT_SECONDS=300  # 5분 타임아웃

if [[ -z "$CORRELATION_ID" ]]; then
    echo "❌ ERROR: Correlation ID가 필요합니다"
    exit 1
fi

echo "🔄 합의 모니터링 시작 [ID: $CORRELATION_ID]"
echo "⏰ 타임아웃: ${TIMEOUT_SECONDS}초 (5분)"
echo ""

START_TIME=$(date +%s)
CLAUDE_RESPONSE=""
CURSOR_RESPONSE=""

# 응답 대기 루프
while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [[ $ELAPSED -gt $TIMEOUT_SECONDS ]]; then
        echo "⏰ TIMEOUT: 5분 내 응답 없음"
        echo "🚨 사용자 개입 필요: 수동으로 GPT-5 답변 검토 요청"
        exit 1
    fi
    
    # ClaudeCode 응답 확인
    if [[ -z "$CLAUDE_RESPONSE" ]]; then
        if ls .collab-msg-* | grep -q "ClaudeCode.*GPT5-Analysis-Response.*${CORRELATION_ID}"; then
            CLAUDE_FILE=$(ls .collab-msg-* | grep "ClaudeCode.*GPT5-Analysis-Response.*${CORRELATION_ID}" | head -1)
            CLAUDE_RESPONSE=$(cat "$CLAUDE_FILE")
            echo "✅ ClaudeCode 분석 응답 수신"
        fi
    fi
    
    # Cursor 응답 확인  
    if [[ -z "$CURSOR_RESPONSE" ]]; then
        if ls .collab-msg-* | grep -q "Cursor.*GPT5-Analysis-Response.*${CORRELATION_ID}"; then
            CURSOR_FILE=$(ls .collab-msg-* | grep "Cursor.*GPT5-Analysis-Response.*${CORRELATION_ID}" | head -1)
            CURSOR_RESPONSE=$(cat "$CURSOR_FILE")
            echo "✅ Cursor 분석 응답 수신"
        fi
    fi
    
    # 양측 응답 완료시 합의 검증 실행
    if [[ -n "$CLAUDE_RESPONSE" && -n "$CURSOR_RESPONSE" ]]; then
        echo ""
        echo "🔍 양측 응답 완료 - 합의 검증 시작..."
        
        # 응답에서 recommendation 추출
        CLAUDE_REC=$(echo "$CLAUDE_RESPONSE" | grep -o "recommendation.*PROCEED\|MODIFY\|REJECT" | head -1 | cut -d' ' -f2)
        CURSOR_REC=$(echo "$CURSOR_RESPONSE" | grep -o "recommendation.*PROCEED\|MODIFY\|REJECT" | head -1 | cut -d' ' -f2)
        
        echo "📊 ClaudeCode 추천: $CLAUDE_REC"
        echo "📊 Cursor 추천: $CURSOR_REC"
        
        # 합의 판정
        if [[ "$CLAUDE_REC" == "PROCEED" && "$CURSOR_REC" == "PROCEED" ]]; then
            echo ""
            echo "✅ CONSENSUS REACHED: PROCEED"
            echo "🚀 협업 작업 시작 트리거!"
            
            # 작업 시작 알림
            ./scripts/simple-notifier.sh send "ALL" "Consensus-Achieved-Start-Work" \
            "✅ GPT-5 답변 합의완료! ClaudeCode: $CLAUDE_REC, Cursor: $CURSOR_REC → 즉시 협업작업 시작! [ID: $CORRELATION_ID]" "critical"
            
            # 성공 로그 저장
            cat > "$ANALYSIS_DIR/consensus-result-${CORRELATION_ID}.json" << EOF
{
  "correlation_id": "$CORRELATION_ID",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "consensus_status": "ACHIEVED",
  "claude_recommendation": "$CLAUDE_REC",
  "cursor_recommendation": "$CURSOR_REC",
  "final_decision": "PROCEED",
  "processing_time_seconds": $ELAPSED,
  "work_triggered": true
}
EOF
            
            echo "📁 합의 결과 저장: $ANALYSIS_DIR/consensus-result-${CORRELATION_ID}.json"
            break
            
        elif [[ "$CLAUDE_REC" == "REJECT" && "$CURSOR_REC" == "REJECT" ]]; then
            echo ""
            echo "❌ CONSENSUS REACHED: REJECT"
            echo "🚫 GPT-5 답변 거부 - 작업 진행하지 않음"
            
            ./scripts/simple-notifier.sh send "ALL" "Consensus-Achieved-Reject" \
            "❌ GPT-5 답변 합의거부! ClaudeCode: $CLAUDE_REC, Cursor: $CURSOR_REC → 작업진행 중단 [ID: $CORRELATION_ID]" "warning"
            
            break
            
        else
            echo ""
            echo "⚠️ CONSENSUS CONFLICT: 의견 불일치"
            echo "📝 ClaudeCode: $CLAUDE_REC vs Cursor: $CURSOR_REC"
            echo "🚨 사용자 개입 필요"
            
            ./scripts/simple-notifier.sh send "USER" "Consensus-Conflict-Escalation" \
            "⚠️ GPT-5 답변 의견불일치! ClaudeCode: $CLAUDE_REC vs Cursor: $CURSOR_REC. 사용자 결정 필요 [ID: $CORRELATION_ID]" "urgent"
            
            break
        fi
    fi
    
    # 2초 대기 후 다시 확인
    sleep 2
    echo -n "."
done

echo ""
echo "🏁 합의 모니터링 완료 [ID: $CORRELATION_ID]"