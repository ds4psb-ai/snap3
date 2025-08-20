#!/usr/bin/env bash
set -euo pipefail

# 🎯 VDP Enhancement with YouTube Data Script
# Purpose: Enhance existing VDP files with real YouTube statistics and top comments
# Usage: ./enhance-vdp-with-youtube.sh VDP_FILE VIDEO_ID [API_KEY]

VDP_FILE="${1:-}"
VIDEO_ID="${2:-}"
YOUTUBE_API_KEY="${3:-${YOUTUBE_API_KEY:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="${SCRIPT_DIR}/tmp"

# Validation
if [[ -z "$VDP_FILE" ]] || [[ -z "$VIDEO_ID" ]]; then
    echo "❌ Usage: $0 VDP_FILE VIDEO_ID [API_KEY]"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/vdp-C000888.json 6_I2FmT1mbY"
    echo "  $0 vdp-sample.json 6_I2FmT1mbY YOUR_API_KEY"
    echo ""
    echo "Environment:"
    echo "  export YOUTUBE_API_KEY='your-key-here'"
    exit 1
fi

if [[ ! -f "$VDP_FILE" ]]; then
    echo "❌ VDP file not found: $VDP_FILE"
    exit 1
fi

if [[ -z "$YOUTUBE_API_KEY" ]]; then
    echo "❌ YouTube API Key required"
    echo "Set via: export YOUTUBE_API_KEY='your-key-here'"
    exit 1
fi

echo "🎯 VDP Enhancement with YouTube Data"
echo "===================================="
echo "📄 VDP File: $VDP_FILE"
echo "📺 Video ID: $VIDEO_ID"
echo ""

# 1) Collect YouTube data first
echo "📊 Collecting YouTube data..."
if ! "${SCRIPT_DIR}/youtube-stats-comments.sh" "$VIDEO_ID" "$YOUTUBE_API_KEY"; then
    echo "❌ Failed to collect YouTube data"
    exit 1
fi

# 2) Load and validate VDP file
echo ""
echo "📄 Loading VDP file..."
if ! jq empty "$VDP_FILE" 2>/dev/null; then
    echo "❌ Invalid JSON in VDP file: $VDP_FILE"
    exit 1
fi

VDP_CONTENT=$(cat "$VDP_FILE")
echo "✅ VDP file loaded successfully"

# 3) Load collected YouTube data
YOUTUBE_DATA="${TMP_DIR}/${VIDEO_ID}_combined.json"
VDP_COMMENTS="${TMP_DIR}/${VIDEO_ID}_vdp_comments.json"

if [[ ! -f "$YOUTUBE_DATA" ]] || [[ ! -f "$VDP_COMMENTS" ]]; then
    echo "❌ YouTube data files not found. Run youtube-stats-comments.sh first."
    exit 1
fi

YOUTUBE_STATS=$(cat "$YOUTUBE_DATA" | jq '.statistics')
YOUTUBE_TOP_COMMENTS=$(cat "$VDP_COMMENTS")

echo "✅ YouTube data loaded successfully"

# 4) Extract current VDP metadata for comparison
CURRENT_VIEW_COUNT=$(echo "$VDP_CONTENT" | jq -r '.metadata.view_count // 0')
CURRENT_LIKE_COUNT=$(echo "$VDP_CONTENT" | jq -r '.metadata.like_count // 0')
CURRENT_COMMENT_COUNT=$(echo "$VDP_CONTENT" | jq -r '.metadata.comment_count // 0')

YT_VIEW_COUNT=$(echo "$YOUTUBE_STATS" | jq -r '.viewCount // "0"' | sed 's/[^0-9]//g')
YT_LIKE_COUNT=$(echo "$YOUTUBE_STATS" | jq -r '.likeCount // "0"' | sed 's/[^0-9]//g')
YT_COMMENT_COUNT=$(echo "$YOUTUBE_STATS" | jq -r '.commentCount // "0"' | sed 's/[^0-9]//g')

echo ""
echo "📊 Metadata Comparison:"
echo "  Views: VDP=$CURRENT_VIEW_COUNT → YouTube=$YT_VIEW_COUNT"
echo "  Likes: VDP=$CURRENT_LIKE_COUNT → YouTube=$YT_LIKE_COUNT"
echo "  Comments: VDP=$CURRENT_COMMENT_COUNT → YouTube=$YT_COMMENT_COUNT"

# 5) Enhance VDP with YouTube data
echo ""
echo "🔧 Enhancing VDP with YouTube data..."

# Update metadata with real YouTube statistics
ENHANCED_VDP=$(echo "$VDP_CONTENT" | jq \
    --argjson yt_views "$YT_VIEW_COUNT" \
    --argjson yt_likes "$YT_LIKE_COUNT" \
    --argjson yt_comments "$YT_COMMENT_COUNT" \
    --argjson top_comments "$YOUTUBE_TOP_COMMENTS" \
    '
    .metadata.view_count = $yt_views |
    .metadata.like_count = $yt_likes |
    .metadata.comment_count = $yt_comments |
    .metadata.data_source = "youtube_api_v3" |
    .metadata.last_updated = now | todate |
    .overall_analysis.top_comments = $top_comments |
    .overall_analysis.engagement_quality = (
        if ($yt_comments > 1000) then "high"
        elif ($yt_comments > 100) then "medium"
        else "low" end
    ) |
    .overall_analysis.audience_reaction.youtube_stats = {
        view_count: $yt_views,
        like_count: $yt_likes, 
        comment_count: $yt_comments,
        engagement_rate: (($yt_likes + $yt_comments) / $yt_views * 100 | floor)
    }
    ')

# 6) Add enhanced notable_comments from YouTube top comments
echo "💬 Enhancing notable_comments with YouTube data..."

# Extract top 3 YouTube comments for notable_comments enhancement
TOP_3_COMMENTS=$(echo "$YOUTUBE_TOP_COMMENTS" | jq '[.[:3] | .[] | {
    lang: "ko",
    text: .text,
    translation_en: .text,
    likes: .engagement.likes,
    author: .author
}]')

ENHANCED_VDP=$(echo "$ENHANCED_VDP" | jq \
    --argjson top3 "$TOP_3_COMMENTS" \
    '.overall_analysis.audience_reaction.notable_comments = (
        .overall_analysis.audience_reaction.notable_comments + $top3
    ) | .overall_analysis.audience_reaction.notable_comments |= unique_by(.text)')

# 7) Save enhanced VDP
OUTPUT_FILE="${VDP_FILE%.json}_enhanced.json"
echo "$ENHANCED_VDP" > "$OUTPUT_FILE"

echo "✅ Enhanced VDP saved to: $OUTPUT_FILE"

# 8) Validation check
echo ""
echo "🔍 Validating enhanced VDP..."

# Check if schema validation is available
if command -v npx >/dev/null 2>&1 && [[ -f "${SCRIPT_DIR}/../schemas/vdp-strict.schema.json" ]]; then
    if npx ajv validate -s "${SCRIPT_DIR}/../schemas/vdp-strict.schema.json" -d "$OUTPUT_FILE" 2>/dev/null; then
        echo "✅ Enhanced VDP passes strict schema validation"
    else
        echo "⚠️ Enhanced VDP has schema validation warnings (may need manual review)"
    fi
else
    echo "ℹ️ Schema validation not available (ajv or schema not found)"
fi

# Basic structure validation
REQUIRED_FIELDS=("content_id" "metadata" "overall_analysis" "scenes")
for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$ENHANCED_VDP" | jq -e ".${field}" >/dev/null 2>&1; then
        echo "✅ Required field present: $field"
    else
        echo "❌ Missing required field: $field"
    fi
done

# 9) Enhancement Summary
echo ""
echo "📋 Enhancement Summary:"
echo "======================"

ORIGINAL_NOTABLE_COUNT=$(echo "$VDP_CONTENT" | jq '.overall_analysis.audience_reaction.notable_comments | length')
ENHANCED_NOTABLE_COUNT=$(echo "$ENHANCED_VDP" | jq '.overall_analysis.audience_reaction.notable_comments | length')
YT_COMMENTS_ADDED=$(echo "$ENHANCED_VDP" | jq '.overall_analysis.top_comments | length')

echo "📊 Metadata Updates:"
echo "  ✅ Real YouTube view count: $YT_VIEW_COUNT"
echo "  ✅ Real YouTube like count: $YT_LIKE_COUNT"
echo "  ✅ Real YouTube comment count: $YT_COMMENT_COUNT"

echo ""
echo "💬 Comments Enhancement:"
echo "  📝 Original notable_comments: $ORIGINAL_NOTABLE_COUNT"
echo "  📝 Enhanced notable_comments: $ENHANCED_NOTABLE_COUNT"
echo "  🎯 YouTube top_comments added: $YT_COMMENTS_ADDED"

echo ""
echo "🎉 VDP Enhancement Complete!"
echo ""
echo "📁 Files Generated:"
echo "  - $OUTPUT_FILE (enhanced VDP)"
echo "  - ${TMP_DIR}/${VIDEO_ID}_*.json (YouTube data files)"
echo ""
echo "🔧 Next Steps:"
echo "  1. Review enhanced VDP: jq . '$OUTPUT_FILE'"
echo "  2. Compare with original: diff <(jq -S . '$VDP_FILE') <(jq -S . '$OUTPUT_FILE')"
echo "  3. Use enhanced VDP in your pipeline"