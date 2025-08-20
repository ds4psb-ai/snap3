#!/bin/bash

# YouTube API 키 설정 가이드 및 헬퍼 스크립트

echo "🔑 YouTube Data API v3 Key Setup Guide"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Step 1: Google Cloud Console에서 API 키 생성"
echo "1. https://console.cloud.google.com/apis/credentials 접속"
echo "2. '+ CREATE CREDENTIALS' → 'API key' 선택"
echo "3. API 키가 생성되면 복사"
echo ""

echo "🔒 Step 2: API 키 제한 설정 (보안 강화)"
echo "1. 생성된 API 키 옆 편집(✏️) 버튼 클릭"
echo "2. 'API restrictions' → 'Restrict key' 선택"
echo "3. 'YouTube Data API v3' 체크"
echo "4. 'Application restrictions' → 'IP addresses' (선택사항)"
echo "5. 'SAVE' 클릭"
echo ""

echo "⚡ Step 3: YouTube Data API v3 활성화"
echo "1. https://console.cloud.google.com/apis/library/youtube.googleapis.com 접속"
echo "2. 'ENABLE' 버튼 클릭"
echo ""

echo "🔧 Step 4: API 키 테스트"
read -p "Enter your YouTube API key: " api_key

if [[ -z "$api_key" ]]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

echo ""
echo "🧪 Testing API key..."

# 간단한 API 호출로 키 유효성 검증
test_video_id="dQw4w9WgXcQ"  # Rick Astley - Never Gonna Give You Up
test_response=$(curl -s "https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${test_video_id}&key=${api_key}")

if [[ $(echo "$test_response" | jq -r '.error.code // empty') ]]; then
    echo "❌ API key test failed:"
    echo "$test_response" | jq -r '.error.message'
    echo ""
    echo "💡 Common issues:"
    echo "• API 키가 잘못되었거나 만료됨"
    echo "• YouTube Data API v3가 활성화되지 않음"
    echo "• API 키 제한 설정이 너무 엄격함"
    exit 1
else
    title=$(echo "$test_response" | jq -r '.items[0].snippet.title // "Unknown"')
    echo "✅ API key is valid! Test video title: $title"
fi

echo ""
echo "💾 Step 5: 환경변수 설정"
echo "Add this to your ~/.bashrc or ~/.zshrc:"
echo ""
echo "export YOUTUBE_API_KEY=\"$api_key\""
echo ""

# 현재 세션에 설정
export YOUTUBE_API_KEY="$api_key"

echo "✅ API key set for current session"
echo ""

echo "🎯 Step 6: Final Test with YouTube Ingestion Script"
echo "Now you can test the full ingestion pipeline:"
echo ""
echo "./scripts/youtube-vdp-ingest.sh \"https://www.youtube.com/shorts/VIDEO_ID\""
echo ""

echo "📊 API Quotas (YouTube Data API v3):"
echo "• Daily quota: 10,000 units (기본)"
echo "• Videos.list: 1 unit per request"
echo "• CommentThreads.list: 1 unit per request"
echo "• Search.list: 100 units per request"
echo ""
echo "💰 Cost: 무료 (일일 할당량 내)"
echo ""

echo "🔗 Useful Links:"
echo "• API Console: https://console.cloud.google.com/apis/credentials"
echo "• Quota Usage: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas"
echo "• Documentation: https://developers.google.com/youtube/v3"
echo ""

echo "🎉 YouTube API setup complete!"