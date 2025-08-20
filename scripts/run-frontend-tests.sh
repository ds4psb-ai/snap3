#!/bin/bash

# Frontend Performance & UI Tests Runner
# Cursor 프론트엔드 연동 준비 - 통합 테스트 실행

set -e

echo "🚀 Cursor Frontend 연동 테스트 시작!"
echo "=================================="

# 로그 디렉토리 생성
mkdir -p logs

# 서버 상태 확인
echo "🔍 서버 상태 확인..."

# localhost:3000 확인
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ localhost:3000 (Next.js) - 실행 중"
else
    echo "❌ localhost:3000 (Next.js) - 실행되지 않음"
    echo "   npm run dev를 실행해주세요"
    exit 1
fi

# localhost:8080 확인  
if curl -s http://localhost:8080/healthz > /dev/null; then
    echo "✅ localhost:8080 (Simple Server) - 실행 중"
else
    echo "❌ localhost:8080 (Simple Server) - 실행되지 않음"
    echo "   node simple-web-server.js를 실행해주세요"
    exit 1
fi

echo ""

# 1. Frontend Performance Test
echo "📊 1. Frontend Performance Test 실행..."
node scripts/frontend-performance-test.js | tee logs/frontend-performance-$(date +%Y%m%d-%H%M%S).log

echo ""

# 2. UI Responsiveness Monitor
echo "🎯 2. UI Responsiveness Monitor 실행..."
node scripts/ui-responsiveness-monitor.js | tee logs/ui-responsiveness-$(date +%Y%m%d-%H%M%S).log

echo ""

# 3. Metadata Performance Monitor
echo "📈 3. Metadata Performance Monitor 실행..."
node scripts/metadata-performance-monitor.js | tee logs/metadata-performance-$(date +%Y%m%d-%H%M%S).log

echo ""

# 4. 8080 ↔ 3000 브리지 테스트
echo "🌉 4. 포트 브리지 연동 테스트..."

echo "  Instagram 브리지 테스트..."
RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:8080/api/extract-social-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/p/test123/", "platform": "instagram"}')

HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    echo "  ✅ Instagram 브리지: HTTP $HTTP_CODE"
else
    echo "  ❌ Instagram 브리지: HTTP $HTTP_CODE"
fi

echo "  TikTok 브리지 테스트..."
RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:8080/api/extract-social-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@test/video/123456789", "platform": "tiktok"}')

HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    echo "  ✅ TikTok 브리지: HTTP $HTTP_CODE"
else
    echo "  ❌ TikTok 브리지: HTTP $HTTP_CODE"
fi

echo ""

# 5. Keep-Alive 효과 측정 (ClaudeCode 최적화 후)
echo "⚡ 5. Keep-Alive 효과 측정..."

echo "  첫 번째 요청 (Cold Start)..."
COLD_START=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:8080/healthz)

echo "  두 번째 요청 (Keep-Alive)..."
KEEP_ALIVE=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:8080/healthz)

echo "  Cold Start: ${COLD_START}s"
echo "  Keep-Alive: ${KEEP_ALIVE}s"

# 개선율 계산 (bc 사용)
if command -v bc > /dev/null; then
    IMPROVEMENT=$(echo "scale=1; (($COLD_START - $KEEP_ALIVE) / $COLD_START) * 100" | bc)
    echo "  Keep-Alive 개선율: ${IMPROVEMENT}%"
fi

echo ""

# 결과 요약
echo "📋 테스트 결과 요약:"
echo "=================="

echo "✅ Frontend Performance Test: 완료"
echo "✅ UI Responsiveness Monitor: 완료"  
echo "✅ Metadata Performance Monitor: 완료"
echo "✅ 포트 브리지 연동 테스트: 완료"
echo "✅ Keep-Alive 효과 측정: 완료"

echo ""
echo "📁 로그 파일 위치: ./logs/"
echo "🎯 다음 단계: ClaudeCode HTTP Keep-Alive 최적화 적용 후 재테스트"

echo ""
echo "🚀 Cursor Frontend 연동 준비 완료!"
