#!/usr/bin/env bash
set -euo pipefail

# 🎬 Enhanced YouTube Metadata Collector with URL Normalization
# Purpose: URL validation + statistics & comments collection for VDP pipeline
# Usage: ./enhanced-youtube-collector.sh URL_OR_VIDEO_ID [API_KEY]

URL_OR_ID="${1:-}"
YOUTUBE_API_KEY="${2:-${YOUTUBE_API_KEY:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="${SCRIPT_DIR}/tmp"

# Validation
if [[ -z "$URL_OR_ID" ]]; then
    echo "❌ Usage: $0 URL_OR_VIDEO_ID [API_KEY]"
    echo ""
    echo "Examples:"
    echo "  $0 6_I2FmT1mbY"
    echo "  $0 https://youtu.be/6_I2FmT1mbY"
    echo "  $0 https://www.youtube.com/shorts/6_I2FmT1mbY"
    echo "  $0 https://www.youtube.com/watch?v=6_I2FmT1mbY"
    echo ""
    echo "Environment:"
    echo "  export YOUTUBE_API_KEY='your-key-here'"
    exit 1
fi

if [[ -z "$YOUTUBE_API_KEY" ]]; then
    echo "❌ YouTube API Key required"
    echo "Set via: export YOUTUBE_API_KEY='your-key-here'"
    echo "Or pass as argument: $0 $URL_OR_ID YOUR_API_KEY"
    exit 1
fi

echo "🎬 Enhanced YouTube Metadata Collector"
echo "======================================"
echo "🔗 Input: $URL_OR_ID"
echo "🔑 API Key: ${YOUTUBE_API_KEY:0:8}..."
echo ""

# Ensure tmp directory exists
mkdir -p "$TMP_DIR"

# Step 1: URL Normalization (if input looks like URL)
if [[ "$URL_OR_ID" =~ ^https?:// ]]; then
    echo "🔧 Normalizing YouTube URL..."
    
    # Use our URL normalizer
    NORMALIZED_RESULT=$(node "${SCRIPT_DIR}/normalize-cli.mjs" "$URL_OR_ID" 2>/dev/null || echo "ERROR")
    
    if [[ "$NORMALIZED_RESULT" == "ERROR" ]]; then
        echo "❌ Failed to normalize URL: $URL_OR_ID"
        echo "Please check if it's a valid YouTube URL"
        exit 1
    fi
    
    # Extract normalized data
    VIDEO_ID=$(echo "$NORMALIZED_RESULT" | jq -r '.id')
    PLATFORM=$(echo "$NORMALIZED_RESULT" | jq -r '.platform')
    CANONICAL_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.canonicalUrl')
    ORIGINAL_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.originalUrl')
    EXPANDED_URL=$(echo "$NORMALIZED_RESULT" | jq -r '.expandedUrl')
    
    # Verify platform
    if [[ "$PLATFORM" != "youtube" ]]; then
        echo "❌ Not a YouTube URL. Platform detected: $PLATFORM"
        exit 1
    fi
    
    echo "✅ URL Normalization Results:"
    echo "  📺 Video ID: $VIDEO_ID"
    echo "  🔗 Canonical URL: $CANONICAL_URL"
    echo "  📝 Original URL: $ORIGINAL_URL"
    if [[ "$EXPANDED_URL" != "$ORIGINAL_URL" ]]; then
        echo "  🔄 Expanded URL: $EXPANDED_URL"
    fi
    echo ""
else
    # Direct video ID provided
    VIDEO_ID="$URL_OR_ID"
    CANONICAL_URL="https://www.youtube.com/watch?v=${VIDEO_ID}"
    ORIGINAL_URL="$VIDEO_ID"
    EXPANDED_URL="$VIDEO_ID"
    
    echo "📺 Direct Video ID provided: $VIDEO_ID"
    echo "🔗 Canonical URL: $CANONICAL_URL"
    echo ""
fi

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

# Step 2: Collect Video Statistics with enhanced fields  
echo "📊 Collecting video statistics..."
STATS_RESPONSE=$(curl -s "https://youtube.googleapis.com/youtube/v3/videos?part=statistics,snippet&fields=items(id,snippet(title,tags,publishedAt,channelId,channelTitle,description),statistics(viewCount,likeCount,commentCount))&id=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")

if check_api_response "$STATS_RESPONSE" "Statistics"; then
    echo "$STATS_RESPONSE" | jq '.items[0].statistics' > "${TMP_DIR}/${VIDEO_ID}_stats.json"
    echo "✅ Statistics saved to: ${TMP_DIR}/${VIDEO_ID}_stats.json"
    
    # Display stats
    echo ""
    echo "📈 Video Statistics:"
    echo "$STATS_RESPONSE" | jq -r '.items[0].statistics | to_entries[] | "  \(.key): \(.value)"'
    
    # Extract enhanced metadata
    echo ""
    echo "📝 Video Metadata:"
    TITLE=$(echo "$STATS_RESPONSE" | jq -r '.items[0].snippet.title // "N/A"')
    CHANNEL_TITLE=$(echo "$STATS_RESPONSE" | jq -r '.items[0].snippet.channelTitle // "N/A"')
    PUBLISHED_AT=$(echo "$STATS_RESPONSE" | jq -r '.items[0].snippet.publishedAt // "N/A"')
    echo "  Title: $TITLE"
    echo "  Channel: $CHANNEL_TITLE"
    echo "  Published: $PUBLISHED_AT"
else
    echo "❌ Failed to collect statistics"
    exit 1
fi

echo ""

# Step 3: Collect Top Comments
echo "💬 Collecting top 5 comments (order=relevance)..."
COMMENTS_RESPONSE=$(curl -s "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&fields=items(snippet(topLevelComment(snippet(authorDisplayName,likeCount,textDisplay,publishedAt)),totalReplyCount))&order=relevance&maxResults=5&videoId=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")

if check_api_response "$COMMENTS_RESPONSE" "Comments"; then
    # Process comments with enhanced data
    echo "$COMMENTS_RESPONSE" | jq '[.items[] | {
        text: .snippet.topLevelComment.snippet.textDisplay,
        author: ("@" + .snippet.topLevelComment.snippet.authorDisplayName),
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

# Step 4: Create Enhanced Metadata JSON with URL tracking
echo "🔗 Creating enhanced metadata with URL preservation..."

# Generate enhanced metadata following the preservation policy
ENHANCED_METADATA=$(jq -n \
    --arg content_id "$VIDEO_ID" \
    --arg platform "YouTube" \
    --arg source_url "$CANONICAL_URL" \
    --arg original_url "$ORIGINAL_URL" \
    --arg expanded_url "$EXPANDED_URL" \
    --arg canonical_url "$CANONICAL_URL" \
    --argjson stats "$(cat "${TMP_DIR}/${VIDEO_ID}_stats.json")" \
    --argjson comments "$(cat "${TMP_DIR}/${VIDEO_ID}_top_comments.json")" \
    --arg title "$TITLE" \
    --arg channel_title "$CHANNEL_TITLE" \
    --arg published_at "$PUBLISHED_AT" \
    '{
        content_id: $content_id,
        platform: $platform,
        source_url: $source_url,
        url_tracking: {
            original_url: $original_url,
            expanded_url: $expanded_url,
            canonical_url: $canonical_url
        },
        view_count: ($stats.viewCount | tonumber? // 0),
        like_count: ($stats.likeCount | tonumber? // 0),
        comment_count: ($stats.commentCount | tonumber? // 0),
        upload_date: $published_at,
        title: $title,
        channel_title: $channel_title,
        hashtags: [],
        top_comments: ($comments | map({
            text: .text,
            author: .author,
            likeCount: .likes
        })),
        youtube_api_data: {
            collected_at: (now | todate),
            api_source: "youtube_v3",
            video_id: $content_id,
            statistics: $stats,
            raw_comments: $comments
        }
    }')

# Save enhanced metadata
METADATA_FILE="/Users/ted/snap3/out/meta/${VIDEO_ID}.youtube.meta.json"
mkdir -p "$(dirname "$METADATA_FILE")"
echo "$ENHANCED_METADATA" > "$METADATA_FILE"

echo "✅ Enhanced metadata saved to: $METADATA_FILE"

# Step 5: Quality Report
echo ""
echo "📋 Collection Quality Report:"
echo "============================="

STATS_COUNT=$(echo "$STATS_RESPONSE" | jq '.items | length')
COMMENTS_COUNT=$(echo "$ENHANCED_METADATA" | jq '.top_comments | length')
TOTAL_LIKES=$(echo "$ENHANCED_METADATA" | jq '.top_comments | map(.likeCount) | add // 0')

echo "📊 Statistics collected: $STATS_COUNT video(s)"
echo "💬 Comments collected: $COMMENTS_COUNT comment(s)" 
echo "❤️ Total comment likes: $TOTAL_LIKES"
echo "🔗 URL preservation: All URL formats preserved"

# Calculate engagement quality score
if [[ "$COMMENTS_COUNT" -gt 0 ]]; then
    AVG_LIKES=$(echo "$ENHANCED_METADATA" | jq '.top_comments | map(.likeCount) | add / length | floor')
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
echo "🎉 Enhanced YouTube data collection complete!"
echo ""
echo "📁 Generated Files:"
echo "  - ${TMP_DIR}/${VIDEO_ID}_stats.json (raw statistics)"
echo "  - ${TMP_DIR}/${VIDEO_ID}_top_comments.json (raw comments)"
echo "  - $METADATA_FILE (enhanced metadata with URL preservation)"
echo ""
echo "🔧 Integration Commands:"
echo "  # View enhanced metadata"
echo "  cat $METADATA_FILE | jq ."
echo ""
echo "  # Check URL tracking"
echo "  cat $METADATA_FILE | jq '.url_tracking'"