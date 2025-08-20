#!/usr/bin/env bash
set -euo pipefail

# 🎬 YouTube VDP Enhancement Demo
# Purpose: Demonstrate YouTube data collection and VDP enhancement
# Usage: ./demo-youtube-enhancement.sh [VIDEO_ID]

DEMO_VIDEO_ID="${1:-6_I2FmT1mbY}"  # Default to a test video ID
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="${SCRIPT_DIR}/tmp"

echo "🎬 YouTube VDP Enhancement Demo"
echo "==============================="
echo "📺 Demo Video ID: $DEMO_VIDEO_ID"
echo ""

# Check if YouTube API key is available
if [[ -z "${YOUTUBE_API_KEY:-}" ]]; then
    echo "⚠️ YouTube API Key not found in environment"
    echo ""
    echo "This demo will show you:"
    echo "1. How to set up YouTube API key"
    echo "2. Expected script usage"
    echo "3. Sample output format"
    echo ""
    echo "🔧 Setup Instructions:"
    echo "====================="
    echo "1. Get YouTube API key from Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials"
    echo ""
    echo "2. Enable YouTube Data API v3:"
    echo "   https://console.cloud.google.com/apis/library/youtube.googleapis.com"
    echo ""
    echo "3. Set environment variable:"
    echo "   export YOUTUBE_API_KEY='your-api-key-here'"
    echo ""
    echo "4. Run the demo:"
    echo "   $0 $DEMO_VIDEO_ID"
    echo ""
    echo "📋 Script Usage Examples:"
    echo "========================"
    echo "# Collect YouTube data for a video"
    echo "npm run youtube:collect 6_I2FmT1mbY"
    echo ""
    echo "# Enhance existing VDP with YouTube data"
    echo "npm run youtube:enhance /path/to/vdp-sample.json 6_I2FmT1mbY"
    echo ""
    echo "# Or use scripts directly"
    echo "./scripts/youtube-stats-comments.sh 6_I2FmT1mbY"
    echo "./scripts/enhance-vdp-with-youtube.sh vdp-C000888.json 6_I2FmT1mbY"
    echo ""
    
    # Show sample output format
    echo "📊 Expected Output Format:"
    echo "========================="
    cat << 'EOF'
    
📊 Video Statistics:
  viewCount: 1234567
  likeCount: 12345
  commentCount: 567
  favoriteCount: 0

💬 Top Comments Preview:
  👤 User1 (❤️ 25): Great video! Really helpful content...
  👤 User2 (❤️ 15): Thanks for sharing this amazing tip...
  👤 User3 (❤️ 8): This is exactly what I was looking for...

📁 Generated Files:
  - scripts/tmp/VIDEO_ID_stats.json (raw statistics)
  - scripts/tmp/VIDEO_ID_top_comments.json (raw comments)
  - scripts/tmp/VIDEO_ID_combined.json (combined data)
  - scripts/tmp/VIDEO_ID_vdp_comments.json (VDP-ready comments)

EOF
    
    echo "🎯 VDP Enhancement Benefits:"
    echo "==========================="
    echo "✅ Real YouTube statistics instead of mock data"
    echo "✅ Top 5 relevant comments with engagement metrics"
    echo "✅ Enhanced notable_comments field"
    echo "✅ Audience engagement quality scoring"
    echo "✅ Schema-compliant VDP structure"
    echo ""
    
    exit 0
fi

echo "✅ YouTube API key found: ${YOUTUBE_API_KEY:0:8}..."
echo ""

# Demo 1: Collect YouTube data
echo "🎯 Demo 1: Collecting YouTube Data"
echo "=================================="
echo "Running: ./scripts/youtube-stats-comments.sh $DEMO_VIDEO_ID"
echo ""

if ./scripts/youtube-stats-comments.sh "$DEMO_VIDEO_ID"; then
    echo "✅ YouTube data collection successful!"
    echo ""
    echo "📁 Files created in scripts/tmp/:"
    ls -la "$TMP_DIR"/${DEMO_VIDEO_ID}_*.json 2>/dev/null || echo "No files found"
else
    echo "❌ YouTube data collection failed"
    echo "Common issues:"
    echo "- Invalid video ID"
    echo "- API key quota exceeded"
    echo "- Video has comments disabled"
    echo "- Network connectivity issues"
    exit 1
fi

echo ""

# Demo 2: Show collected data
echo "🎯 Demo 2: Reviewing Collected Data"
echo "==================================="

if [[ -f "${TMP_DIR}/${DEMO_VIDEO_ID}_vdp_comments.json" ]]; then
    echo "📊 VDP-ready comments preview:"
    head -n 20 "${TMP_DIR}/${DEMO_VIDEO_ID}_vdp_comments.json"
    echo ""
else
    echo "⚠️ VDP comments file not found"
fi

if [[ -f "${TMP_DIR}/${DEMO_VIDEO_ID}_stats.json" ]]; then
    echo "📈 Statistics summary:"
    cat "${TMP_DIR}/${DEMO_VIDEO_ID}_stats.json"
    echo ""
else
    echo "⚠️ Statistics file not found"
fi

# Demo 3: VDP Enhancement (if sample VDP exists)
echo "🎯 Demo 3: VDP Enhancement"
echo "========================="

# Check if we have a sample VDP to enhance
SAMPLE_VDP=""
if [[ -f "/Users/ted/Downloads/vdp-C000888.json" ]]; then
    SAMPLE_VDP="/Users/ted/Downloads/vdp-C000888.json"
elif [[ -f "${SCRIPT_DIR}/../schemas/vdp-sample.json" ]]; then
    SAMPLE_VDP="${SCRIPT_DIR}/../schemas/vdp-sample.json"
fi

if [[ -n "$SAMPLE_VDP" ]]; then
    echo "📄 Using sample VDP: $SAMPLE_VDP"
    echo "Running: ./scripts/enhance-vdp-with-youtube.sh $SAMPLE_VDP $DEMO_VIDEO_ID"
    echo ""
    
    if ./scripts/enhance-vdp-with-youtube.sh "$SAMPLE_VDP" "$DEMO_VIDEO_ID"; then
        echo "✅ VDP enhancement successful!"
        
        ENHANCED_FILE="${SAMPLE_VDP%.json}_enhanced.json"
        if [[ -f "$ENHANCED_FILE" ]]; then
            echo ""
            echo "📊 Enhancement preview (top_comments field):"
            jq '.overall_analysis.top_comments' "$ENHANCED_FILE" 2>/dev/null || echo "Could not preview top_comments"
        fi
    else
        echo "❌ VDP enhancement failed"
    fi
else
    echo "ℹ️ No sample VDP file found for enhancement demo"
    echo "To test VDP enhancement:"
    echo "1. Place a VDP JSON file in the project"
    echo "2. Run: npm run youtube:enhance /path/to/vdp.json $DEMO_VIDEO_ID"
fi

echo ""
echo "🎉 Demo Complete!"
echo ""
echo "🔧 Integration Tips:"
echo "==================="
echo "1. Add to your VDP pipeline: collect YouTube data → enhance VDP"
echo "2. Use cron job for regular comment updates"
echo "3. Monitor API quota usage for large-scale collection"
echo "4. Cache results to avoid redundant API calls"
echo ""
echo "📚 Documentation:"
echo "=================="
echo "- YouTube Data API: https://developers.google.com/youtube/v3"
echo "- API quotas: https://console.cloud.google.com/iam-admin/quotas"
echo "- VDP schema: /Users/ted/snap3/schemas/vdp-strict.schema.json"