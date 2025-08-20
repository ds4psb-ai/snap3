#!/bin/bash

echo "📸 Instagram Graph API 설정 가이드"
echo "=================================="
echo ""
echo "1. Facebook for Developers 접속:"
echo "   👉 https://developers.facebook.com/"
echo ""
echo "2. 앱 생성:"
echo "   - '내 앱' → '앱 만들기'"
echo "   - 앱 유형: '비즈니스' 선택"
echo "   - 앱 이름: 'snap3-instagram-collector' (예시)"
echo ""
echo "3. Instagram Basic Display API 추가:"
echo "   - 제품 추가 → Instagram Basic Display"
echo "   - '설정' 클릭"
echo ""
echo "4. Instagram Basic Display 설정:"
echo "   - Valid OAuth Redirect URIs: http://localhost:3000/auth/instagram/callback"
echo "   - Deauthorize Callback URL: http://localhost:3000/auth/instagram/deauthorize"
echo "   - Data Deletion Requests: http://localhost:3000/auth/instagram/delete"
echo ""
echo "5. 테스트 사용자 추가:"
echo "   - 역할 → 역할 추가"
echo "   - Instagram 테스터 역할로 본인 Instagram 계정 추가"
echo "   - Instagram에서 테스터 요청 승인"
echo ""
echo "6. 액세스 토큰 생성:"
echo "   - Instagram Basic Display → 기본 설정"
echo "   - '토큰 생성' → Instagram 로그인"
echo "   - 생성된 액세스 토큰 복사"
echo ""
echo "📝 참고: Instagram Basic Display는 개인 계정의 미디어만 접근 가능"
echo "      비즈니스 계정 데이터는 Instagram Graph API 필요 (별도 승인)"
echo ""

# .env.local 파일에 Instagram 액세스 토큰 추가
ENV_FILE="/Users/ted/snap3/.env.local"

echo ""
echo "자동 설정을 위해 Instagram 액세스 토큰을 입력하세요:"
echo -n "Instagram Access Token: "
read -r INSTAGRAM_ACCESS_TOKEN

if [ -n "$INSTAGRAM_ACCESS_TOKEN" ]; then
    # .env.local에 Instagram 액세스 토큰 업데이트
    if grep -q "INSTAGRAM_ACCESS_TOKEN=" "$ENV_FILE"; then
        # 기존 토큰 업데이트
        sed -i.bak "s/INSTAGRAM_ACCESS_TOKEN=.*/INSTAGRAM_ACCESS_TOKEN=$INSTAGRAM_ACCESS_TOKEN/" "$ENV_FILE"
        echo "✅ 기존 Instagram 액세스 토큰이 업데이트되었습니다."
    else
        # 새 토큰 추가
        echo "INSTAGRAM_ACCESS_TOKEN=$INSTAGRAM_ACCESS_TOKEN" >> "$ENV_FILE"
        echo "✅ Instagram 액세스 토큰이 추가되었습니다."
    fi
    
    echo ""
    echo "7. 설정 확인:"
    echo "   cat .env.local | grep INSTAGRAM_ACCESS_TOKEN"
    echo ""
    echo "8. 토큰 검증:"
    echo "   curl 'https://graph.instagram.com/me?fields=id,username&access_token=$INSTAGRAM_ACCESS_TOKEN'"
    echo ""
    echo "9. 테스트:"
    echo "   curl -X POST http://localhost:3000/api/ingest \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"type\":\"url\",\"content\":\"https://www.instagram.com/p/EXAMPLE_POST_ID/\"}'"
    echo ""
    echo "💡 토큰 관리:"
    echo "   - 단기 토큰: 1시간 유효"
    echo "   - 장기 토큰: 60일 유효 (갱신 가능)"
    echo "   - 갱신 API: GET /refresh_access_token"
    
else
    echo "❌ 액세스 토큰이 입력되지 않았습니다."
    echo ""
    echo "수동 설정:"
    echo "echo 'INSTAGRAM_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE' >> $ENV_FILE"
    echo ""
    echo "🔗 추가 리소스:"
    echo "   - Instagram Basic Display API: https://developers.facebook.com/docs/instagram-basic-display-api"
    echo "   - Instagram Graph API: https://developers.facebook.com/docs/instagram-api"
fi