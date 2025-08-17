#!/bin/bash

# YouTube VDP 인게스트 스크립트 테스트

set -e

echo "🧪 Testing YouTube VDP Ingestion Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 환경변수 확인
echo "📋 Checking environment variables..."
required_vars=("GCP_PROJECT" "GCP_REGION" "RAW_BUCKET" "GOLD_BUCKET" "DATASET" "GOLD_TABLE")
all_set=true

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ $var: not set"
        all_set=false
    else
        echo "✅ $var: ${!var}"
    fi
done

# YouTube API 키 확인 (값은 숨김)
if [[ -z "$YOUTUBE_API_KEY" ]]; then
    echo "❌ YOUTUBE_API_KEY: not set"
    all_set=false
elif [[ "$YOUTUBE_API_KEY" == "YOUR_YOUTUBE_API_KEY" ]]; then
    echo "⚠️ YOUTUBE_API_KEY: placeholder value (needs real API key)"
    all_set=false
else
    echo "✅ YOUTUBE_API_KEY: configured"
fi

if [[ "$all_set" != "true" ]]; then
    echo ""
    echo "❌ Please set all required environment variables before testing"
    exit 1
fi

echo ""
echo "🔧 Checking required tools..."

# 도구 확인
check_tool() {
    local tool=$1
    if command -v "$tool" >/dev/null 2>&1; then
        local version=""
        case "$tool" in
            yt-dlp) version=$(yt-dlp --version 2>/dev/null | head -1) ;;
            jq) version=$(jq --version 2>/dev/null) ;;
            gsutil) version=$(gsutil version 2>/dev/null | grep "gsutil version" | head -1) ;;
            curl) version=$(curl --version 2>/dev/null | head -1) ;;
        esac
        echo "✅ $tool: $version"
    else
        echo "❌ $tool: not found"
        return 1
    fi
}

tools=("yt-dlp" "jq" "gsutil" "curl")
for tool in "${tools[@]}"; do
    check_tool "$tool" || exit 1
done

echo ""
echo "🎯 Testing YouTube API connectivity..."

# YouTube API 테스트
test_video_id="dQw4w9WgXcQ"
stats_json=$(curl -s "https://youtube.googleapis.com/youtube/v3/videos?part=statistics&id=${test_video_id}&key=${YOUTUBE_API_KEY}")

if [[ $(echo "$stats_json" | jq -r '.error.code // empty') ]]; then
    echo "⚠️ YouTube API test failed:"
    echo "$stats_json" | jq -r '.error.message'
else
    view_count=$(echo "$stats_json" | jq -r '.items[0].statistics.viewCount // "0"')
    echo "✅ API test successful - Rick Roll views: $view_count"
fi

echo ""
echo "📖 Usage Examples:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# YouTube Shorts"
echo "./scripts/youtube-vdp-ingest.sh \"https://www.youtube.com/shorts/VIDEO_ID\""
echo ""
echo "# Regular YouTube video"
echo "./scripts/youtube-vdp-ingest.sh \"https://www.youtube.com/watch?v=VIDEO_ID\""
echo ""
echo "# Short URL format"
echo "./scripts/youtube-vdp-ingest.sh \"https://youtu.be/VIDEO_ID\""
echo ""
echo "📋 Expected workflow:"
echo "1. Script downloads video (max 1080p)"
echo "2. Collects YouTube stats and comments via API"
echo "3. Generates VDP metadata JSON"
echo "4. Uploads to GCS with custom metadata"
echo "5. Eventarc triggers T4→T2→T3 pipeline"
echo "6. Final data lands in BigQuery vdp_gold table"
echo ""
echo "🎉 Test completed! Ready to process YouTube videos."