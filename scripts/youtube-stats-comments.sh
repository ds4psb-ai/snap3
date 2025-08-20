#!/usr/bin/env bash
set -euo pipefail

# 🎬 YouTube Statistics & Comments Collection Script
# Purpose: Collect top 5 comments and statistics to enhance VDP top_comments quality
# Usage: ./youtube-stats-comments.sh VIDEO_ID [API_KEY]

VIDEO_ID="${1:-}"
YOUTUBE_API_KEY="${2:-${YOUTUBE_API_KEY:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="${SCRIPT_DIR}/tmp"

# Validation
if [[ -z "$VIDEO_ID" ]]; then
    echo "❌ Usage: $0 VIDEO_ID [API_KEY]"
    echo ""
    echo "Examples:"
    echo "  $0 6_I2FmT1mbY"
    echo "  $0 6_I2FmT1mbY YOUR_API_KEY"
    echo ""
    echo "Environment:"
    echo "  export YOUTUBE_API_KEY='your-key-here'"
    exit 1
fi

if [[ -z "$YOUTUBE_API_KEY" ]]; then
    echo "❌ YouTube API Key required"
    echo "Set via: export YOUTUBE_API_KEY='your-key-here'"
    echo "Or pass as argument: $0 $VIDEO_ID YOUR_API_KEY"
    exit 1
fi

echo "🎬 YouTube Statistics & Comments Collection"
echo "=========================================="
echo "📺 Video ID: $VIDEO_ID"
echo "🔑 API Key: ${YOUTUBE_API_KEY:0:8}..."
echo ""

# Ensure tmp directory exists
mkdir -p "$TMP_DIR"

# Function to check API response
check_api_response() {
    local response="$1"
    local api_name="$2"
    
    if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
        echo "❌ $api_name API Error:"
        echo "$response" | jq '.error'
        return 1
    fi
    
    if echo "$response" | jq -e '.items | length == 0' >/dev/null 2>&1; then
        echo "⚠️ $api_name: No data found for video $VIDEO_ID"
        return 1
    fi
    
    return 0
}

# 1) Collect Video Statistics
echo "📊 Collecting video statistics..."
STATS_RESPONSE=$(curl -s "https://youtube.googleapis.com/youtube/v3/videos?part=statistics,snippet&fields=items(id,snippet(title,tags,publishedAt,channelId),statistics(viewCount,likeCount,commentCount))&id=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")

if check_api_response "$STATS_RESPONSE" "Statistics"; then
    echo "$STATS_RESPONSE" | jq '.items[0].statistics' > "${TMP_DIR}/${VIDEO_ID}_stats.json"
    echo "✅ Statistics saved to: ${TMP_DIR}/${VIDEO_ID}_stats.json"
    
    # Display stats
    echo ""
    echo "📈 Video Statistics:"
    echo "$STATS_RESPONSE" | jq -r '.items[0].statistics | to_entries[] | "  \(.key): \(.value)"'
    
    # Extract title and description
    echo ""
    echo "📝 Video Info:"
    TITLE=$(echo "$STATS_RESPONSE" | jq -r '.items[0].snippet.title // "N/A"')
    DESCRIPTION=$(echo "$STATS_RESPONSE" | jq -r '.items[0].snippet.description // "N/A"' | head -c 100)
    echo "  Title: $TITLE"
    echo "  Description: ${DESCRIPTION}..."
else
    echo "❌ Failed to collect statistics"
    exit 1
fi

echo ""

# 2) Collect Top Comments
echo "💬 Collecting top 5 comments (order=relevance)..."
COMMENTS_RESPONSE=$(curl -s "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&fields=items(snippet(topLevelComment(snippet(authorDisplayName,likeCount,textDisplay))))&order=relevance&maxResults=5&videoId=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")

if check_api_response "$COMMENTS_RESPONSE" "Comments"; then
    # Process comments with enhanced data
    echo "$COMMENTS_RESPONSE" | jq '[.items[] | {
        text: .snippet.topLevelComment.snippet.textDisplay,
        author: .snippet.topLevelComment.snippet.authorDisplayName,
        likes: (.snippet.topLevelComment.snippet.likeCount // 0),
        timestamp: .snippet.topLevelComment.snippet.publishedAt,
        replies: (.snippet.totalReplyCount // 0),
        author_channel_id: (.snippet.topLevelComment.snippet.authorChannelId.value // null)
    }]' > "${TMP_DIR}/${VIDEO_ID}_top_comments.json"
    
    echo "✅ Top comments saved to: ${TMP_DIR}/${VIDEO_ID}_top_comments.json"
    
    # Display comments preview
    echo ""
    echo "💬 Top Comments Preview:"
    echo "$COMMENTS_RESPONSE" | jq -r '.items[] | "  👤 \(.snippet.topLevelComment.snippet.authorDisplayName) (❤️ \(.snippet.topLevelComment.snippet.likeCount // 0)): \(.snippet.topLevelComment.snippet.textDisplay | .[0:80])..."'
else
    echo "⚠️ No comments found or comments disabled"
    # Create empty comments file
    echo "[]" > "${TMP_DIR}/${VIDEO_ID}_top_comments.json"
fi

echo ""

# 3) Create Combined Data for VDP Integration
echo "🔗 Creating VDP-compatible combined data..."

# Combine stats and comments into VDP-ready format
COMBINED_DATA=$(jq -n \
    --argjson stats "$(cat "${TMP_DIR}/${VIDEO_ID}_stats.json")" \
    --argjson comments "$(cat "${TMP_DIR}/${VIDEO_ID}_top_comments.json")" \
    --arg video_id "$VIDEO_ID" \
    --arg title "$TITLE" \
    '{
        video_id: $video_id,
        title: $title,
        statistics: $stats,
        top_comments: $comments,
        collection_timestamp: now | todate,
        api_source: "youtube_v3"
    }')

echo "$COMBINED_DATA" > "${TMP_DIR}/${VIDEO_ID}_combined.json"
echo "✅ Combined data saved to: ${TMP_DIR}/${VIDEO_ID}_combined.json"

# 4) Generate VDP top_comments Enhancement
echo ""
echo "🎯 Generating VDP top_comments enhancement..."

# Extract comments in VDP-compatible format
VDP_TOP_COMMENTS=$(echo "$COMBINED_DATA" | jq '.top_comments | map({
    text: .text,
    author: .author,
    engagement: {
        likes: .likes,
        replies: .replies
    },
    timestamp: .timestamp,
    relevance_score: (.likes + (.replies * 2)) # Simple relevance scoring
}) | sort_by(-.relevance_score)')

echo "$VDP_TOP_COMMENTS" > "${TMP_DIR}/${VIDEO_ID}_vdp_comments.json"
echo "✅ VDP-compatible comments saved to: ${TMP_DIR}/${VIDEO_ID}_vdp_comments.json"

# 5) Quality Report
echo ""
echo "📋 Collection Quality Report:"
echo "============================="

STATS_COUNT=$(echo "$STATS_RESPONSE" | jq '.items | length')
COMMENTS_COUNT=$(echo "$COMBINED_DATA" | jq '.top_comments | length')
TOTAL_LIKES=$(echo "$COMBINED_DATA" | jq '.top_comments | map(.likes) | add // 0')
TOTAL_REPLIES=$(echo "$COMBINED_DATA" | jq '.top_comments | map(.replies) | add // 0')

echo "📊 Statistics collected: $STATS_COUNT video(s)"
echo "💬 Comments collected: $COMMENTS_COUNT comment(s)" 
echo "❤️ Total comment likes: $TOTAL_LIKES"
echo "💭 Total comment replies: $TOTAL_REPLIES"

# Calculate engagement quality score
if [[ "$COMMENTS_COUNT" -gt 0 ]]; then
    AVG_LIKES=$(echo "$COMBINED_DATA" | jq '.top_comments | map(.likes) | add / length | floor')
    echo "📈 Average comment likes: $AVG_LIKES"
    
    if [[ "$AVG_LIKES" -gt 10 ]]; then
        echo "🌟 Quality: High engagement comments"
    elif [[ "$AVG_LIKES" -gt 2 ]]; then
        echo "✨ Quality: Good engagement comments"
    else
        echo "📝 Quality: Basic engagement comments"
    fi
else
    echo "⚠️ Quality: No comments available"
fi

echo ""
echo "🎉 YouTube data collection complete!"
echo ""
echo "📁 Generated Files:"
echo "  - ${TMP_DIR}/${VIDEO_ID}_stats.json (raw statistics)"
echo "  - ${TMP_DIR}/${VIDEO_ID}_top_comments.json (raw comments)"
echo "  - ${TMP_DIR}/${VIDEO_ID}_combined.json (combined data)"
echo "  - ${TMP_DIR}/${VIDEO_ID}_vdp_comments.json (VDP-ready comments)"
echo ""
echo "🔧 Integration Commands:"
echo "  # View VDP-ready comments"
echo "  cat ${TMP_DIR}/${VIDEO_ID}_vdp_comments.json | jq ."
echo ""
echo "  # Integrate into VDP pipeline"
echo "  # Use the VDP-ready comments in your VDP overall_analysis.top_comments field"