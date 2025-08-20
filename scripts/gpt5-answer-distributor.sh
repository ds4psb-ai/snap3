#!/bin/bash

# GPT-5 Pro Answer Auto-Distributor
# 목적: GPT-5 Pro 답변을 ClaudeCode T1 + Cursor에게 동시 분산

set -e

GPT5_ANSWER="$1"
CORRELATION_ID="gpt5_$(date +%s%3N)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if [[ -z "$GPT5_ANSWER" ]]; then
    echo "❌ ERROR: GPT-5 Pro 답변이 필요합니다"
    echo "사용법: $0 \"GPT-5 Pro 답변 텍스트\""
    exit 1
fi

echo "🔄 GPT-5 Pro 답변 자동 분산 시작..."
echo "📊 Correlation ID: $CORRELATION_ID"
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

# 답변 길이 검증 (메시지 크기 제한)
ANSWER_LENGTH=${#GPT5_ANSWER}
if [[ $ANSWER_LENGTH -gt 8000 ]]; then
    echo "⚠️ WARNING: GPT-5 답변이 너무 깁니다 ($ANSWER_LENGTH chars)"
    echo "처음 8000자로 잘라서 전송합니다."
    GPT5_ANSWER="${GPT5_ANSWER:0:8000}..."
fi

# GPT-5 답변을 임시 파일로 저장 (분석용)
ANALYSIS_DIR="./analysis/gpt5-consensus"
mkdir -p "$ANALYSIS_DIR"

echo "$GPT5_ANSWER" > "$ANALYSIS_DIR/gpt5-answer-${CORRELATION_ID}.txt"

# ClaudeCode T1에게 분석 요청
echo "📤 ClaudeCode T1에게 분석 요청 전송..."
./scripts/simple-notifier.sh send "ClaudeCode-T1" "GPT5-Analysis-Request" \
"🔍 GPT-5 답변 분석요청 [ID: $CORRELATION_ID]

📋 답변내용:
$GPT5_ANSWER

🎯 분석기준:
- 실용성: 구현가능성, 시간효율성, 기술적합성
- 위험성: 시스템안정성, 복잡도, 유지보수성  
- 우선순위: 비즈니스가치, UX개선, 기술부채

📨 응답형식: GPT5-Analysis-Response + 동일 Correlation ID 사용
⏰ 응답시한: 5분내 응답 필요" "critical"

# Cursor에게 분석 요청
echo "📤 Cursor에게 분석 요청 전송..."
./scripts/simple-notifier.sh send "Cursor" "GPT5-Analysis-Request" \
"🔍 GPT-5 답변 분석요청 [ID: $CORRELATION_ID]

📋 답변내용:
$GPT5_ANSWER

🎯 분석기준:
- 실용성: 구현가능성, 시간효율성, 기술적합성
- 위험성: 시스템안정성, 복잡도, 유지보수성
- 우선순위: 비즈니스가치, UX개선, 기술부채

📨 응답형식: GPT5-Analysis-Response + 동일 Correlation ID 사용  
⏰ 응답시한: 5분내 응답 필요" "critical"

# 합의 검증 스크립트를 백그라운드에서 실행
echo "🔄 합의 검증 모니터링 시작..."
nohup ./scripts/consensus-monitor.sh "$CORRELATION_ID" > "$ANALYSIS_DIR/consensus-${CORRELATION_ID}.log" 2>&1 &

echo ""
echo "✅ GPT-5 Pro 답변 자동 분산 완료!"
echo "📊 Correlation ID: $CORRELATION_ID"
echo "📁 분석 파일: $ANALYSIS_DIR/gpt5-answer-${CORRELATION_ID}.txt"
echo "🔄 합의 모니터링: 백그라운드 실행 중"
echo "⏰ 5분 내 양측 응답 + 합의 검증 예상"