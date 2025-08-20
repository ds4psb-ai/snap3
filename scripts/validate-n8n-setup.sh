#!/bin/bash

echo "🔍 n8n 메타데이터 수집 시스템 검증"
echo "================================"
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. n8n 서버 확인
echo "1. n8n 서버 상태 확인..."
if curl -s http://localhost:5678/rest/config.js >/dev/null; then
    echo -e "   ${GREEN}✅ n8n 서버 실행 중${NC}"
else
    echo -e "   ${RED}❌ n8n 서버 미실행${NC}"
    echo "   💡 다음 명령으로 n8n 시작: N8N_PORT=5678 npx n8n start"
fi

# 2. Next.js 서버 확인
echo ""
echo "2. Next.js 개발 서버 상태 확인..."
if curl -s http://localhost:3000 >/dev/null; then
    echo -e "   ${GREEN}✅ Next.js 서버 실행 중${NC}"
else
    echo -e "   ${RED}❌ Next.js 서버 미실행${NC}"
    echo "   💡 다음 명령으로 시작: npm run dev"
fi

# 3. 환경 변수 확인
echo ""
echo "3. 환경 변수 설정 확인..."
ENV_FILE="/Users/ted/snap3/.env.local"
if [ -f "$ENV_FILE" ]; then
    if grep -q "YOUTUBE_API_KEY=" "$ENV_FILE" && [ "$(grep 'YOUTUBE_API_KEY=' "$ENV_FILE" | cut -d'=' -f2)" != "your_youtube_api_key_here" ]; then
        echo -e "   ${GREEN}✅ YouTube API 키 설정됨${NC}"
    else
        echo -e "   ${YELLOW}⚠️  YouTube API 키 미설정 또는 기본값${NC}"
        echo "   💡 ./scripts/setup-youtube-api-key.sh 실행"
    fi
    
    if grep -q "N8N_BASE_URL=" "$ENV_FILE"; then
        echo -e "   ${GREEN}✅ n8n 기본 URL 설정됨${NC}"
    else
        echo -e "   ${YELLOW}⚠️  n8n 기본 URL 미설정${NC}"
    fi
else
    echo -e "   ${RED}❌ .env.local 파일 없음${NC}"
fi

# 4. n8n 웹훅 활성화 확인
echo ""
echo "4. n8n 웹훅 상태 확인..."
WEBHOOK_RESPONSE=$(curl -s http://localhost:5678/webhook/youtube-metadata?url=test 2>&1)
if [[ $WEBHOOK_RESPONSE == *"workflow"* ]] || [[ $WEBHOOK_RESPONSE == *"execution"* ]]; then
    echo -e "   ${GREEN}✅ YouTube 웹훅 활성화됨${NC}"
else
    echo -e "   ${RED}❌ YouTube 웹훅 미활성화${NC}"
    echo "   💡 http://localhost:5678에서 워크플로우 활성화 필요"
fi

# 5. 통합 테스트
echo ""
echo "5. 통합 API 테스트..."
TEST_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
API_RESPONSE=$(curl -s -X POST http://localhost:3000/api/ingest \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"url\",\"content\":\"$TEST_URL\"}")

if [[ $API_RESPONSE == *"autoEnriched\":true"* ]]; then
    echo -e "   ${GREEN}✅ 완전한 메타데이터 수집 성공${NC}"
    echo "   📊 수집된 데이터:"
    echo "$API_RESPONSE" | jq -r '.metadata.vdp_summary.title // "제목 없음"' | sed 's/^/      📹 /'
elif [[ $API_RESPONSE == *"metadataCollectionError"* ]]; then
    echo -e "   ${YELLOW}⚠️  메타데이터 수집 실패 (설정 확인 필요)${NC}"
    ERROR=$(echo "$API_RESPONSE" | jq -r '.metadata.metadataCollectionError // "알 수 없는 오류"')
    echo "   🚫 오류: $ERROR"
else
    echo -e "   ${RED}❌ API 응답 이상${NC}"
    echo "   📄 응답: $API_RESPONSE"
fi

# 6. 요약 및 다음 단계
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 설정 완료 체크리스트:"
echo ""
echo "   □ n8n 서버 실행 (http://localhost:5678)"
echo "   □ Next.js 서버 실행 (http://localhost:3000)"
echo "   □ YouTube API 키 설정"
echo "   □ n8n 워크플로우 3개 활성화"
echo "   □ 통합 테스트 통과"
echo ""
echo "🎯 모든 항목이 체크되면 시스템이 완전히 작동합니다!"
echo ""
echo "📞 문제 해결:"
echo "   - 워크플로우 활성화: ./scripts/activate-n8n-workflows.sh"
echo "   - API 키 설정: ./scripts/setup-youtube-api-key.sh"
echo "   - 전체 가이드: cat n8n-workflows/README.md"