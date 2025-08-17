#!/usr/bin/env bash
set -euo pipefail

# 📸 Instagram Metadata Collector with URL Normalization
# Purpose: URL validation + metadata collection for Instagram content
# Usage: ./instagram-collector.sh URL_OR_CODE

URL_OR_CODE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="${PARENT_DIR}/tmp"

# Validation
if [[ -z "$URL_OR_CODE" ]]; then
    echo "❌ Usage: $0 URL_OR_CODE"
    echo ""
    echo "Examples:"
    echo "  $0 CX1234567"
    echo "  $0 https://www.instagram.com/reel/CX1234567/"
    echo "  $0 https://www.instagram.com/p/CY7890123/"
    echo ""
    exit 1
fi

echo "📸 Instagram Metadata Collector"
echo "==============================="
echo "🔗 Input: $URL_OR_CODE"
echo ""

# Ensure tmp directory exists
mkdir -p "$TMP_DIR"

# Step 1: URL Normalization (if input looks like URL)
if [[ "$URL_OR_CODE" =~ ^https?:// ]]; then
    echo "🔧 Normalizing Instagram URL..."
    
    # Use our URL normalizer
    NORMALIZED_RESULT=$(node "${PARENT_DIR}/normalize-cli.mjs" "$URL_OR_CODE" 2>/dev/null || echo "ERROR")
    
    if [[ "$NORMALIZED_RESULT" == "ERROR" ]]; then
        echo "❌ Failed to normalize URL: $URL_OR_CODE"
        echo "Please check if it's a valid Instagram URL"
        exit 1
    fi
    
    # Extract normalized data
    CONTENT_ID=$(echo "$NORMALIZED_RESULT" | jq -r '.id')
    PLATFORM=$(echo "$NORMALIZED_RESULT" | jq -r '.platform')
    CANONICAL_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.canonicalUrl')
    ORIGINAL_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.originalUrl')
    EXPANDED_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.expandedUrl')
    
    # Verify platform
    if [[ "$PLATFORM" != "instagram" ]]; then
        echo "❌ Not an Instagram URL. Platform detected: $PLATFORM"
        exit 1
    fi
    
    echo "✅ URL Normalization Results:"
    echo "  📷 Content ID: $CONTENT_ID"
    echo "  🔗 Canonical URL: $CANONICAL_URL"
    echo "  📝 Original URL: $ORIGINAL_URL"
    if [[ "$EXPANDED_URL" != "$ORIGINAL_URL" ]]; then
        echo "  🔄 Expanded URL: $EXPANDED_URL"
    fi
    echo ""
else
    # Direct content code provided
    CONTENT_ID="$URL_OR_CODE"
    CANONICAL_URL="https://www.instagram.com/reel/${CONTENT_ID}/"
    ORIGINAL_URL="$CONTENT_ID"
    EXPANDED_URL="$CONTENT_ID"
    
    echo "📷 Direct Content ID provided: $CONTENT_ID"
    echo "🔗 Canonical URL: $CANONICAL_URL"
    echo ""
fi

# Step 2: Create Instagram metadata template (manual collection required)
echo "📋 Creating Instagram metadata template..."
echo "⚠️ Note: Instagram requires manual metadata collection due to API restrictions"

# Generate Instagram metadata template
INSTAGRAM_METADATA=$(jq -n \
    --arg content_id "$CONTENT_ID" \
    --arg platform "Instagram" \
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
        upload_date: null,
        creator: "MANUAL_INPUT_REQUIRED",
        hashtags: [],
        top_comments: [],
        manual_collection_note: "Please manually fill in view_count, like_count, comment_count, creator, hashtags, and top_comments",
        collection_method: "manual_template",
        instagram_api_data: {
            collected_at: (now | todate),
            api_source: "manual_collection",
            content_id: $content_id,
            requires_manual_input: true
        }
    }')

# Save Instagram metadata template
METADATA_FILE="/Users/ted/snap3/out/meta/${CONTENT_ID}.instagram.meta.json"
mkdir -p "$(dirname "$METADATA_FILE")"
echo "$INSTAGRAM_METADATA" > "$METADATA_FILE"

echo "✅ Instagram metadata template saved to: $METADATA_FILE"

echo ""
echo "📋 Manual Collection Instructions:"
echo "=================================="
echo "Due to Instagram API restrictions, please manually update the following fields:"
echo ""
echo "1. view_count: Number of views"
echo "2. like_count: Number of likes" 
echo "3. comment_count: Number of comments"
echo "4. creator: Instagram username"
echo "5. hashtags: Array of hashtags used"
echo "6. top_comments: Top 3-5 comments with text, author, likeCount"
echo "7. upload_date: Publication date in ISO format"
echo ""
echo "📝 Example top_comments format:"
echo '   "top_comments": ['
echo '     {'
echo '       "text": "Amazing content!",'
echo '       "author": "@username",'
echo '       "likeCount": 15'
echo '     }'
echo '   ]'
echo ""
echo "🔧 Edit command:"
echo "  code $METADATA_FILE"
echo ""
echo "✅ Once updated, the metadata will be ready for VDP integration"