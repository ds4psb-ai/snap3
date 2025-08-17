#!/usr/bin/env bash
set -euo pipefail

# 🌐 Universal Social Media Metadata Collector
# Purpose: Unified entry point for all platform metadata collection
# Usage: ./universal-collector.sh URL_OR_ID [API_KEY]

INPUT="${1:-}"
API_KEY="${2:-${YOUTUBE_API_KEY:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validation
if [[ -z "$INPUT" ]]; then
    echo "❌ Usage: $0 URL_OR_ID [API_KEY]"
    echo ""
    echo "Supported Platforms:"
    echo "  📺 YouTube: ./universal-collector.sh https://youtu.be/55e6ScXfiZc"
    echo "  📸 Instagram: ./universal-collector.sh https://www.instagram.com/reel/CX1234567/"
    echo "  🎵 TikTok: ./universal-collector.sh https://vt.tiktok.com/ZSAer6GTR/"
    echo ""
    echo "Direct IDs also supported:"
    echo "  📺 YouTube: ./universal-collector.sh 55e6ScXfiZc"
    echo "  📸 Instagram: ./universal-collector.sh CX1234567"
    echo "  🎵 TikTok: ./universal-collector.sh 1234567890123456789"
    echo ""
    echo "Environment:"
    echo "  export YOUTUBE_API_KEY='your-key-here'  # Required for YouTube"
    exit 1
fi

echo "🌐 Universal Social Media Metadata Collector"
echo "============================================"
echo "🔗 Input: $INPUT"
echo ""

# Step 1: Detect Platform
echo "🔍 Detecting platform..."

PLATFORM="unknown"
if [[ "$INPUT" =~ ^https?:// ]]; then
    # URL provided - use normalizer to detect platform
    NORMALIZED_RESULT=$(node "${SCRIPT_DIR}/normalize-cli.mjs" "$INPUT" 2>/dev/null || echo "ERROR")
    
    if [[ "$NORMALIZED_RESULT" == "ERROR" ]]; then
        echo "❌ Failed to detect platform from URL: $INPUT"
        echo "Supported platforms: YouTube, Instagram, TikTok"
        exit 1
    fi
    
    PLATFORM=$(echo "$NORMALIZED_RESULT" | jq -r '.platform')
    CONTENT_ID=$(echo "$NORMALIZED_RESULT" | jq -r '.id')
    
    echo "✅ Platform detected: $PLATFORM"
    echo "📋 Content ID: $CONTENT_ID"
else
    # Direct ID provided - detect by pattern
    if [[ "$INPUT" =~ ^[A-Za-z0-9_-]{11}$ ]]; then
        PLATFORM="youtube"
        echo "✅ Platform detected: YouTube (11-char ID pattern)"
    elif [[ "$INPUT" =~ ^[A-Za-z0-9_-]+$ ]] && [[ ${#INPUT} -lt 20 ]]; then
        PLATFORM="instagram"
        echo "✅ Platform detected: Instagram (shortcode pattern)"
    elif [[ "$INPUT" =~ ^[0-9]{8,26}$ ]]; then
        PLATFORM="tiktok"
        echo "✅ Platform detected: TikTok (numeric ID pattern)"
    else
        echo "❌ Unable to detect platform from ID pattern: $INPUT"
        echo "Please provide a full URL or use platform-specific collectors"
        exit 1
    fi
fi

echo ""

# Step 2: Route to Platform-Specific Collector
echo "🚀 Routing to platform-specific collector..."

case "$PLATFORM" in
    "youtube")
        echo "📺 Using YouTube collector with API integration..."
        if [[ -z "$API_KEY" ]]; then
            echo "⚠️ No YouTube API key provided. Set YOUTUBE_API_KEY environment variable."
            echo "Usage: YOUTUBE_API_KEY='your-key' $0 $INPUT"
            exit 1
        fi
        exec "${SCRIPT_DIR}/enhanced-youtube-collector.sh" "$INPUT" "$API_KEY"
        ;;
    
    "instagram")
        echo "📸 Using Instagram collector (manual template)..."
        exec "${SCRIPT_DIR}/platform-collectors/instagram-collector.sh" "$INPUT"
        ;;
    
    "tiktok")
        echo "🎵 Using TikTok collector (manual template)..."
        exec "${SCRIPT_DIR}/platform-collectors/tiktok-collector.sh" "$INPUT"
        ;;
    
    *)
        echo "❌ Unsupported platform: $PLATFORM"
        echo "Supported platforms: youtube, instagram, tiktok"
        exit 1
        ;;
esac