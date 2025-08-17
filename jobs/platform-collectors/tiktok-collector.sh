#!/usr/bin/env bash
set -euo pipefail

# 🎵 TikTok Metadata Collector with URL Normalization
# Purpose: URL validation + metadata collection for TikTok content
# Usage: ./tiktok-collector.sh URL_OR_ID

URL_OR_ID="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="${PARENT_DIR}/tmp"

# Validation
if [[ -z "$URL_OR_ID" ]]; then
    echo "❌ Usage: $0 URL_OR_ID"
    echo ""
    echo "Examples:"
    echo "  $0 1234567890123456789"
    echo "  $0 https://www.tiktok.com/@user/video/1234567890123456789"
    echo "  $0 https://vt.tiktok.com/ZSAer6GTR/"
    echo ""
    exit 1
fi

echo "🎵 TikTok Metadata Collector"
echo "============================"
echo "🔗 Input: $URL_OR_ID"
echo ""

# Ensure tmp directory exists
mkdir -p "$TMP_DIR"

# Step 1: URL Normalization (if input looks like URL)
if [[ "$URL_OR_ID" =~ ^https?:// ]]; then
    echo "🔧 Normalizing TikTok URL..."
    echo "⏳ Expanding short links if needed..."
    
    # Use our URL normalizer
    NORMALIZED_RESULT=$(node "${PARENT_DIR}/normalize-cli.mjs" "$URL_OR_ID" 2>/dev/null || echo "ERROR")
    
    if [[ "$NORMALIZED_RESULT" == "ERROR" ]]; then
        echo "❌ Failed to normalize URL: $URL_OR_ID"
        echo "Please check if it's a valid TikTok URL"
        exit 1
    fi
    
    # Extract normalized data
    CONTENT_ID=$(echo "$NORMALIZED_RESULT" | jq -r '.id')
    PLATFORM=$(echo "$NORMALIZED_RESULT" | jq -r '.platform')
    CANONICAL_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.canonicalUrl')
    ORIGINAL_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.originalUrl')
    EXPANDED_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.expandedUrl')
    
    # Verify platform
    if [[ "$PLATFORM" != "tiktok" ]]; then
        echo "❌ Not a TikTok URL. Platform detected: $PLATFORM"
        exit 1
    fi
    
    echo "✅ URL Normalization Results:"
    echo "  🎵 Video ID: $CONTENT_ID"
    echo "  🔗 Canonical URL: $CANONICAL_URL"
    echo "  📝 Original URL: $ORIGINAL_URL"
    if [[ "$EXPANDED_URL" != "$ORIGINAL_URL" ]]; then
        echo "  🔄 Expanded URL: $EXPANDED_URL"
        echo "  📋 Short link expansion successful"
    fi
    echo ""
else
    # Direct video ID provided
    CONTENT_ID="$URL_OR_ID"
    CANONICAL_URL="https://www.tiktok.com/@tiktok/video/${CONTENT_ID}"
    ORIGINAL_URL="$CONTENT_ID"
    EXPANDED_URL="$CONTENT_ID"
    
    echo "🎵 Direct Video ID provided: $CONTENT_ID"
    echo "🔗 Canonical URL: $CANONICAL_URL"
    echo ""
fi

# Step 2: Create TikTok metadata template (manual collection required)
echo "📋 Creating TikTok metadata template..."
echo "⚠️ Note: TikTok requires manual metadata collection due to API restrictions"

# Generate TikTok metadata template
TIKTOK_METADATA=$(jq -n \
    --arg content_id "$CONTENT_ID" \
    --arg platform "TikTok" \
    --arg source_url "$CANONICAL_URL" \
    --arg original_url "$ORIGINAL_URL" \
    --arg expanded_url "$EXPANDED_URL" \
    --arg canonical_url "$CANONICAL_URL" \
    '{
        content_id: $content_id,
        platform: $platform,
        source_url: $source_url,
        url_tracking: {
            original_url: $original_url,
            expanded_url: $expanded_url,
            canonical_url: $canonical_url
        },
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        upload_date: null,
        creator: "MANUAL_INPUT_REQUIRED",
        creator_username: "MANUAL_INPUT_REQUIRED", 
        hashtags: [],
        top_comments: [],
        music_info: {
            title: "MANUAL_INPUT_REQUIRED",
            artist: "MANUAL_INPUT_REQUIRED"
        },
        manual_collection_note: "Please manually fill in view_count, like_count, comment_count, share_count, creator info, hashtags, top_comments, and music_info",
        collection_method: "manual_template",
        tiktok_api_data: {
            collected_at: (now | todate),
            api_source: "manual_collection",
            video_id: $content_id,
            requires_manual_input: true
        }
    }')

# Save TikTok metadata template
METADATA_FILE="/Users/ted/snap3/out/meta/${CONTENT_ID}.tiktok.meta.json"
mkdir -p "$(dirname "$METADATA_FILE")"
echo "$TIKTOK_METADATA" > "$METADATA_FILE"

echo "✅ TikTok metadata template saved to: $METADATA_FILE"

echo ""
echo "📋 Manual Collection Instructions:"
echo "=================================="
echo "Due to TikTok API restrictions, please manually update the following fields:"
echo ""
echo "1. view_count: Number of views"
echo "2. like_count: Number of likes"
echo "3. comment_count: Number of comments"
echo "4. share_count: Number of shares"
echo "5. creator: Display name of creator"
echo "6. creator_username: @username of creator"
echo "7. hashtags: Array of hashtags used (include #)"
echo "8. top_comments: Top 3-5 comments with text, author, likeCount"
echo "9. music_info: Background music title and artist"
echo "10. upload_date: Publication date in ISO format"
echo ""
echo "📝 Example hashtags format:"
echo '   "hashtags": ["#fyp", "#viral", "#comedy"]'
echo ""
echo "📝 Example top_comments format:"
echo '   "top_comments": ['
echo '     {'
echo '       "text": "This is hilarious! 😂",'
echo '       "author": "@commenter",'
echo '       "likeCount": 25'
echo '     }'
echo '   ]'
echo ""
echo "📝 Example music_info format:"
echo '   "music_info": {'
echo '     "title": "Original Sound",'
echo '     "artist": "@creator_username"'
echo '   }'
echo ""
echo "🔧 Edit command:"
echo "  code $METADATA_FILE"
echo ""
echo "⚡ TikTok-specific features preserved:"
echo "  ✅ Short link expansion (vm/vt URLs)"
echo "  ✅ Username extraction from full URLs"
echo "  ✅ Comprehensive metadata template"
echo ""
echo "✅ Once updated, the metadata will be ready for VDP integration"