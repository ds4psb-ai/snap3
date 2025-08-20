#!/bin/bash

echo "🔧 API 키 자동 설정 스크립트"
echo "==========================="
echo ""

ENV_FILE=".env.local"

# YouTube API 키 설정
echo "1️⃣ YouTube Data API 키 설정"
echo "Google Cloud Console에서 발급받은 API 키를 입력하세요:"
echo -n "YouTube API Key: "
read -r YOUTUBE_KEY

if [ -n "$YOUTUBE_KEY" ]; then
    if grep -q "YOUTUBE_API_KEY=" "$ENV_FILE"; then
        sed -i.bak "s/YOUTUBE_API_KEY=.*/YOUTUBE_API_KEY=$YOUTUBE_KEY/" "$ENV_FILE"
    else
        echo "YOUTUBE_API_KEY=$YOUTUBE_KEY" >> "$ENV_FILE"
    fi
    echo "✅ YouTube API 키 설정 완료"
else
    echo "⚠️ YouTube API 키를 건너뜁니다"
fi

echo ""

# Instagram 액세스 토큰 설정
echo "2️⃣ Instagram Access Token 설정"
echo "Facebook for Developers에서 발급받은 토큰을 입력하세요:"
echo -n "Instagram Access Token: "
read -r INSTAGRAM_TOKEN

if [ -n "$INSTAGRAM_TOKEN" ]; then
    if grep -q "INSTAGRAM_ACCESS_TOKEN=" "$ENV_FILE"; then
        sed -i.bak "s/INSTAGRAM_ACCESS_TOKEN=.*/INSTAGRAM_ACCESS_TOKEN=$INSTAGRAM_TOKEN/" "$ENV_FILE"
    else
        echo "INSTAGRAM_ACCESS_TOKEN=$INSTAGRAM_TOKEN" >> "$ENV_FILE"
    fi
    echo "✅ Instagram 토큰 설정 완료"
else
    echo "⚠️ Instagram 토큰을 건너뜁니다"
fi

echo ""
echo "🎉 API 키 설정 완료!"
echo ""
echo "설정된 키 확인:"
grep -E "(YOUTUBE_API_KEY|INSTAGRAM_ACCESS_TOKEN)" "$ENV_FILE"
echo ""
echo "다음 단계:"
echo "1. npm run dev 또는 개발 서버 재시작"
echo "2. n8n 워크플로우 테스트:"
echo "   curl -X POST http://localhost:3000/api/ingest \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"type\":\"url\",\"content\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}'"