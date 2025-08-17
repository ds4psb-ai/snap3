#!/bin/bash
# Multi-Platform VDP RAW Generation Pipeline - Upgraded Version
# YouTube (자동) + Instagram + TikTok (수동) 통합 처리

set -euo pipefail

# 설정
T2_URL="${T2_EXTRACT_URL:-https://t2-extract-355516763169.us-west1.run.app}"
RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw}"
GOLD_BUCKET="${GOLD_BUCKET:-tough-variety-gold}"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 사용법
usage() {
    echo -e "${CYAN}🚀 Multi-Platform VDP RAW Generation Pipeline${NC}"
    echo "=============================================="
    echo ""
    echo "사용법:"
    echo "  YouTube (자동):    $0 youtube <YOUTUBE_URL>"
    echo "  Instagram (수동):  $0 instagram <MP4_FILE> <METADATA_JSON>"
    echo "  TikTok (수동):     $0 tiktok <MP4_FILE> <METADATA_JSON>"
    echo ""
    echo "예시:"
    echo "  $0 youtube https://www.youtube.com/shorts/6_I2FmT1mbY"
    echo "  $0 instagram video.mp4 metadata.json"
    echo "  $0 tiktok video.mp4 metadata.json"
    echo ""
    echo "메타데이터 JSON 형식:"
    echo "Instagram:"
    echo '  {"content_id":"POST_ID", "source_url":"https://instagram.com/p/POST_ID", "creator":"username"}'
    echo ""
    echo "TikTok:"
    echo '  {"content_id":"VIDEO_ID", "source_url":"https://tiktok.com/@user/video/ID", "creator":"username"}'
    exit 1
}

# 최소 1개 인수 필요
if [ $# -lt 1 ]; then
    usage
fi

PLATFORM="$1"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
UPLOAD_ID=$(uuidgen)

echo -e "${CYAN}🚀 Multi-Platform VDP RAW Generation Pipeline - Upgraded Version${NC}"
echo "================================================================"
echo -e "🌐 플랫폼: ${BLUE}$PLATFORM${NC}"
echo -e "📦 Upload ID: $UPLOAD_ID"
echo -e "⏰ Timestamp: $TIMESTAMP"
echo ""

# 플랫폼별 처리
case "$PLATFORM" in
    "youtube")
        if [ $# -ne 2 ]; then
            echo -e "${RED}❌ YouTube URL이 필요합니다${NC}"
            usage
        fi
        
        YOUTUBE_URL="$2"
        VIDEO_ID=$(basename "$YOUTUBE_URL" | sed 's/.*\///')
        
        echo -e "${YELLOW}📹 YouTube Shorts 자동 처리${NC}"
        echo "URL: $YOUTUBE_URL"
        echo "Video ID: $VIDEO_ID"
        echo ""
        
        # YouTube 전용 스크립트 실행
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        exec "$SCRIPT_DIR/vdp-extract-upgraded.sh" "$YOUTUBE_URL"
        ;;
        
    "instagram")
        if [ $# -ne 3 ]; then
            echo -e "${RED}❌ Instagram은 MP4 파일과 메타데이터 JSON이 필요합니다${NC}"
            usage
        fi
        
        MP4_FILE="$2"
        METADATA_FILE="$3"
        
        echo -e "${PURPLE}📸 Instagram 수동 처리${NC}"
        echo "MP4 파일: $MP4_FILE"
        echo "메타데이터: $METADATA_FILE"
        echo ""
        
        # Instagram 전용 스크립트 실행
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        exec "$SCRIPT_DIR/vdp-extract-instagram.sh" "$MP4_FILE" "$METADATA_FILE"
        ;;
        
    "tiktok")
        if [ $# -ne 3 ]; then
            echo -e "${RED}❌ TikTok은 MP4 파일과 메타데이터 JSON이 필요합니다${NC}"
            usage
        fi
        
        MP4_FILE="$2"
        METADATA_FILE="$3"
        
        echo -e "${GREEN}🎵 TikTok 수동 처리${NC}"
        echo "MP4 파일: $MP4_FILE"
        echo "메타데이터: $METADATA_FILE"
        echo ""
        
        # TikTok 전용 스크립트 실행
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        exec "$SCRIPT_DIR/vdp-extract-tiktok.sh" "$MP4_FILE" "$METADATA_FILE"
        ;;
        
    *)
        echo -e "${RED}❌ 지원되지 않는 플랫폼: $PLATFORM${NC}"
        echo -e "${CYAN}지원 플랫폼: youtube, instagram, tiktok${NC}"
        usage
        ;;
esac