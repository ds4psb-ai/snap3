#!/usr/bin/env bash
set -euo pipefail

# 🎯 VDP One-Shot Pipeline with Stream Recovery & Audio Fix
# Purpose: YouTube/Shorts → Download → Stream Recovery → Upload → Extract → Gold
# Usage: ./vdp-oneshot-pipeline.sh "https://www.youtube.com/shorts/VIDEO_ID"

# Input validation
if [[ $# -eq 0 ]]; then
    echo "❌ Usage: $0 'https://www.youtube.com/shorts/VIDEO_ID'"
    exit 1
fi

URL="$1"
echo "🚀 Starting VDP One-Shot Pipeline for: $URL"

# Required environment variables
: "${GCP_PROJECT:?Set GCP_PROJECT}"
: "${RAW_BUCKET:?Set RAW_BUCKET}"
: "${YOUTUBE_API_KEY:?Set YOUTUBE_API_KEY}"

# Optional environment variables with defaults
T2_URL="${T2_URL:-http://localhost:3001/api/v1/extract}"
GCP_REGION="${GCP_REGION:-us-central1}"

echo "🌐 Configuration:"
echo "  - GCP Project: $GCP_PROJECT"
echo "  - Raw Bucket: $RAW_BUCKET"
echo "  - T2 URL: $T2_URL"
echo "  - GCP Region: $GCP_REGION"

# Step 1: Generate unified upload ID
UPLOAD_ID="$(uuidgen)"
echo "🔖 Generated Upload ID: $UPLOAD_ID"

# Step 2: Extract Video ID from YouTube URL
echo "📝 Extracting Video ID..."
VIDEO_ID="$(yt-dlp --get-id "$URL")"
echo "✅ Video ID: $VIDEO_ID"

# Step 3: Download video with enhanced settings and fallback strategy
echo "⬇️ Downloading video with enhanced audio+video merge..."

# Enhanced download with multiple fallback strategies
DOWNLOAD_SUCCESS=false
VIDEO_FILE=""

# Strategy 1: Best quality with audio merge
echo "🔄 Attempting high-quality download with audio merge..."
if yt-dlp \
  -f "bv*[vcodec!*=?][height<=1080][fps<=60]+ba/b[height<=1080][fps<=60]" \
  --merge-output-format mp4 \
  -N 4 -R 10 --fragment-retries 999 \
  --no-part \
  --postprocessor-args "ffmpeg:-c:v copy -c:a aac" \
  -o "${VIDEO_ID}.%(ext)s" \
  "$URL" 2>/dev/null; then
  
  VIDEO_FILE="${VIDEO_ID}.mp4"
  DOWNLOAD_SUCCESS=true
  echo "✅ High-quality download successful"
else
  echo "⚠️ High-quality download failed, trying fallback..."
  
  # Strategy 2: Standard quality fallback
  if yt-dlp \
    -f "best[height<=720]" \
    --merge-output-format mp4 \
    -o "${VIDEO_ID}.%(ext)s" \
    "$URL" 2>/dev/null; then
    
    VIDEO_FILE="${VIDEO_ID}.mp4"
    DOWNLOAD_SUCCESS=true
    echo "✅ Standard quality download successful"
  else
    echo "⚠️ Standard download failed, trying worst quality..."
    
    # Strategy 3: Any available format
    if yt-dlp \
      -f "worst" \
      -o "${VIDEO_ID}.%(ext)s" \
      "$URL" 2>/dev/null; then
      
      VIDEO_FILE=$(find . -name "${VIDEO_ID}.*" -not -name "*.json" | head -1)
      DOWNLOAD_SUCCESS=true
      echo "✅ Fallback download successful"
    fi
  fi
fi

if [[ "$DOWNLOAD_SUCCESS" != true ]]; then
  echo "❌ All download strategies failed"
  exit 1
fi

# Step 3.1: Stream Corruption Detection & Auto-Recovery
echo "🔍 Analyzing stream integrity and fixing issues..."

ISSUES_FIXED=()
ORIGINAL_FILE="$VIDEO_FILE"

# Check stream integrity
if command -v ffprobe >/dev/null 2>&1; then
  echo "📊 Running stream analysis..."
  
  # Get detailed stream information
  STREAM_INFO=$(ffprobe -v quiet -print_format json -show_streams -show_format "$VIDEO_FILE" 2>/dev/null || echo '{}')
  
  VIDEO_STREAMS=$(echo "$STREAM_INFO" | jq '[.streams[] | select(.codec_type=="video")] | length' 2>/dev/null || echo "0")
  AUDIO_STREAMS=$(echo "$STREAM_INFO" | jq '[.streams[] | select(.codec_type=="audio")] | length' 2>/dev/null || echo "0")
  DURATION=$(echo "$STREAM_INFO" | jq -r '.format.duration // "0"' 2>/dev/null || echo "0")
  
  echo "  📹 Video streams: $VIDEO_STREAMS"
  echo "  🎵 Audio streams: $AUDIO_STREAMS"
  echo "  ⏱️ Duration: ${DURATION}s"
  
  # Issue detection and auto-fix
  NEEDS_REPAIR=false
  
  # Check 1: Missing audio stream
  if [[ "$AUDIO_STREAMS" -eq 0 ]]; then
    echo "⚠️ No audio stream detected - adding silent audio"
    NEEDS_REPAIR=true
    ISSUES_FIXED+=("silent_audio_added")
  fi
  
  # Check 2: Corrupted duration
  if (( $(echo "$DURATION < 1" | bc -l) )); then
    echo "⚠️ Invalid duration detected - attempting repair"
    NEEDS_REPAIR=true
    ISSUES_FIXED+=("duration_repaired")
  fi
  
  # Check 3: Audio quality issues
  if [[ "$AUDIO_STREAMS" -gt 0 ]]; then
    AUDIO_CODEC=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="audio") | .codec_name' | head -1)
    SAMPLE_RATE=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="audio") | .sample_rate' | head -1)
    
    if [[ "$AUDIO_CODEC" == "opus" ]] || [[ "$AUDIO_CODEC" == "vorbis" ]] || [[ "$SAMPLE_RATE" -lt 44100 ]]; then
      echo "⚠️ Suboptimal audio quality detected - enhancing"
      NEEDS_REPAIR=true
      ISSUES_FIXED+=("audio_enhanced")
    fi
  fi
  
  # Apply repairs if needed
  if [[ "$NEEDS_REPAIR" == true ]]; then
    echo "🔧 Applying automatic repairs..."
    REPAIRED_FILE="${VIDEO_ID}_repaired.mp4"
    
    # Build ffmpeg command for repairs
    FFMPEG_CMD="ffmpeg -i \"$VIDEO_FILE\""
    
    # Add silent audio if missing
    if [[ "$AUDIO_STREAMS" -eq 0 ]]; then
      FFMPEG_CMD="$FFMPEG_CMD -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100"
      FFMPEG_CMD="$FFMPEG_CMD -c:v copy -c:a aac -shortest"
    else
      # Enhance existing audio
      FFMPEG_CMD="$FFMPEG_CMD -c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k"
    fi
    
    # Add duration fix if needed
    if (( $(echo "$DURATION < 1" | bc -l) )); then
      FFMPEG_CMD="$FFMPEG_CMD -avoid_negative_ts make_zero"
    fi
    
    FFMPEG_CMD="$FFMPEG_CMD \"$REPAIRED_FILE\""
    
    # Execute repair
    if eval "$FFMPEG_CMD" >/dev/null 2>&1; then
      echo "✅ Stream repairs completed successfully"
      VIDEO_FILE="$REPAIRED_FILE"
      
      # Verify repair
      NEW_AUDIO_STREAMS=$(ffprobe -v quiet -select_streams a -show_entries stream=index -of csv=p=0 "$VIDEO_FILE" 2>/dev/null | wc -l | xargs)
      if [[ "$NEW_AUDIO_STREAMS" -gt 0 ]]; then
        echo "✅ Audio stream verification: PASSED"
      fi
    else
      echo "⚠️ Stream repair failed, using original file"
      VIDEO_FILE="$ORIGINAL_FILE"
    fi
  else
    echo "✅ Stream integrity check: PASSED"
  fi
  
else
  echo "⚠️ ffprobe not available - skipping stream analysis"
fi

echo "🎬 Using video file: $VIDEO_FILE"

# Validate download success and file integrity
if [[ ! -f "${VIDEO_ID}.mp4" ]]; then
    echo "❌ Error: Video download failed - file not found"
    exit 1
fi

# Check file size (should be > 1KB for valid video)
FILE_SIZE=$(stat -f%z "${VIDEO_ID}.mp4" 2>/dev/null || stat -c%s "${VIDEO_ID}.mp4" 2>/dev/null || echo "0")
if [[ "$FILE_SIZE" -lt 1024 ]]; then
    echo "❌ Error: Downloaded file too small (${FILE_SIZE} bytes) - likely corrupted"
    exit 1
fi

# Quick ffprobe validation to ensure audio+video streams
echo "🔍 Validating audio+video streams..."
if ! command -v ffprobe &> /dev/null; then
    echo "⚠️ ffprobe not available - skipping stream validation"
else
    AUDIO_STREAMS=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "${VIDEO_ID}.mp4" 2>/dev/null | wc -l | xargs)
    VIDEO_STREAMS=$(ffprobe -v error -select_streams v -show_entries stream=index -of csv=p=0 "${VIDEO_ID}.mp4" 2>/dev/null | wc -l | xargs)
    
    if [[ "$AUDIO_STREAMS" -lt 1 ]]; then
        echo "❌ Error: No audio streams found in downloaded video"
        echo "🔧 Attempting audio track injection with silent audio..."
        
        # Create backup and attempt to add silent audio track
        cp "${VIDEO_ID}.mp4" "${VIDEO_ID}.backup.mp4"
        
        if ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
                   -i "${VIDEO_ID}.backup.mp4" \
                   -c:v copy -c:a aac -shortest \
                   "${VIDEO_ID}.fixed.mp4" 2>/dev/null; then
            mv "${VIDEO_ID}.fixed.mp4" "${VIDEO_ID}.mp4"
            rm "${VIDEO_ID}.backup.mp4"
            echo "✅ Added silent audio track successfully"
        else
            echo "❌ Failed to add audio track - continuing with video-only file"
            mv "${VIDEO_ID}.backup.mp4" "${VIDEO_ID}.mp4"
        fi
    else
        echo "✅ Audio streams: $AUDIO_STREAMS"
    fi
    
    if [[ "$VIDEO_STREAMS" -lt 1 ]]; then
        echo "❌ Error: No video streams found in downloaded file"
        exit 1
    else
        echo "✅ Video streams: $VIDEO_STREAMS"
    fi
fi

echo "✅ Downloaded and validated: ${VIDEO_ID}.mp4 (${FILE_SIZE} bytes)"

# Step 4: Collect YouTube statistics
echo "📊 Collecting YouTube statistics..."
STATS_JSON="$(curl -sS "https://youtube.googleapis.com/youtube/v3/videos?part=statistics&id=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")"

# API response validation
if [[ $(echo "$STATS_JSON" | jq -r '.error.code // empty') ]]; then
    echo "❌ YouTube API Error:"
    echo "$STATS_JSON" | jq -r '.error.message'
    exit 1
fi

VIEW="$(echo "$STATS_JSON" | jq -r '.items[0].statistics.viewCount // "0"')"
LIKE="$(echo "$STATS_JSON" | jq -r '.items[0].statistics.likeCount // "0"')"
COMM="$(echo "$STATS_JSON" | jq -r '.items[0].statistics.commentCount // "0"')"
echo "✅ Stats - Views: $VIEW, Likes: $LIKE, Comments: $COMM"

# Step 5: Collect top comments (max 5) - non-blocking
echo "💬 Collecting top comments..."
COMMENTS="[]"
COMMENTS_RAW="$(curl -sS "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&order=relevance&maxResults=5&key=${YOUTUBE_API_KEY}" 2>/dev/null)" || true

if [[ -n "$COMMENTS_RAW" ]] && [[ $(echo "$COMMENTS_RAW" | jq -r '.error.code // empty') == "" ]]; then
    if [[ $(echo "$COMMENTS_RAW" | jq -r '.items | length') != "0" ]]; then
        # Remove control characters for safe JSON parsing
        COMMENTS="$(echo "$COMMENTS_RAW" | jq -r '.items' | jq '[.[] | {
            text: (.snippet.topLevelComment.snippet.textDisplay // "" | gsub("[\u0000-\u001F\u007F]"; "")),
            author: (.snippet.topLevelComment.snippet.authorDisplayName // ""),
            likes: (.snippet.topLevelComment.snippet.likeCount // 0),
            timestamp: (.snippet.topLevelComment.snippet.publishedAt // "")
        }]')"
        echo "✅ Collected comments successfully"
    else
        echo "ℹ️ No comments found"
    fi
else
    echo "⚠️ Comments API failed or restricted"
fi

# Step 6: Generate VDP metadata
echo "📝 Generating VDP metadata..."
cat > "${VIDEO_ID}.vdp.json" <<JSON
{
  "platform": "youtube",
  "source_url": "${URL}",
  "content_id": "${VIDEO_ID}",
  "upload_id": "${UPLOAD_ID}",
  "view_count": ${VIEW},
  "like_count": ${LIKE},
  "comment_count": ${COMM},
  "top_comments": ${COMMENTS},
  "ingestion_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

echo "✅ Generated VDP metadata: ${VIDEO_ID}.vdp.json"

# Step 6.5: Quality check before upload
echo "🔍 Running quality checks..."
if ! ./scripts/quality-check.sh "${VIDEO_ID}.mp4" "${VIDEO_ID}.vdp.json"; then
    echo "❌ Quality check failed - aborting pipeline"
    exit 1
fi
echo "✅ Quality checks passed"

# Step 7: Upload to GCS with unified metadata
echo "📤 Uploading to GCS with unified upload-id..."

# Upload video file with comprehensive metadata
gsutil -h "x-goog-meta-vdp-platform:youtube" \
       -h "x-goog-meta-vdp-source-url:${URL}" \
       -h "x-goog-meta-vdp-content-id:${VIDEO_ID}" \
       -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
       -h "x-goog-meta-vdp-view-count:${VIEW}" \
       -h "x-goog-meta-vdp-like-count:${LIKE}" \
       -h "x-goog-meta-vdp-comment-count:${COMM}" \
       cp "${VIDEO_ID}.mp4" "gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.mp4"

# Upload JSON metadata
gsutil -h "x-goog-meta-vdp-platform:youtube" \
       -h "x-goog-meta-vdp-source-url:${URL}" \
       -h "x-goog-meta-vdp-content-id:${VIDEO_ID}" \
       -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
       -h "x-goog-meta-content-type:application/json" \
       cp "${VIDEO_ID}.vdp.json" "gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.vdp.json"

echo "✅ Uploaded both files with upload-id: ${UPLOAD_ID}"

# Step 8: Call T2 extraction API with Hook Genome schema
echo "🧠 Calling T2 extraction API with Hook Genome schema..."

# Use Hook-specific schema if available, otherwise fallback to basic schema
if [[ -n "${VDP_SCHEMA_PATH:-}" ]] && [[ -f "${VDP_SCHEMA_PATH}" ]]; then
  echo "✅ Using Hook Genome schema: $VDP_SCHEMA_PATH"
  HOOK_SCHEMA="$(cat "$VDP_SCHEMA_PATH")"
else
  echo "⚠️ Hook Genome schema not found, using basic schema"
  HOOK_SCHEMA='{
    "type": "object",
    "properties": {
      "content_id": {"type": "string"},
      "platform": {"type": "string"},
      "video_origin": {"type": "string", "enum": ["Real-Footage", "AI-Generated"]},
      "overall_analysis": {
        "type": "object",
        "properties": {
          "emotional_arc": {"type": "string"},
          "overall_sentiment": {"type": "string"},
          "potential_meme_template": {"type": "boolean"},
          "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0}
        },
        "required": ["emotional_arc", "overall_sentiment", "confidence"]
      },
      "scenes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "narrative_role": {"type": "string", "enum": ["Hook", "Demonstration", "Problem_Solution", "Conclusion"]},
            "duration_sec": {"type": "number", "minimum": 0.1, "maximum": 10.0},
            "visual_summary": {"type": "string"},
            "audio_summary": {"type": "string"}
          },
          "required": ["narrative_role", "duration_sec", "visual_summary"]
        },
        "minItems": 2,
        "maxItems": 4
      }
    },
    "required": ["content_id", "platform", "video_origin", "overall_analysis", "scenes"]
  }'
fi

# Use Hook-specific prompt if available
if [[ -n "${HOOK_PROMPT_PATH:-}" ]] && [[ -f "${HOOK_PROMPT_PATH}" ]]; then
  echo "✅ Using Hook Genome prompt: $HOOK_PROMPT_PATH"
  HOOK_PROMPT="$(cat "$HOOK_PROMPT_PATH")"
else
  echo "⚠️ Hook Genome prompt not found, using default"
  HOOK_PROMPT="Analyze this video with focus on the 0-3 second hook window. Identify hook patterns, timing, and effectiveness."
fi

EXTRACTION_PAYLOAD=$(jq -n --arg gcs_uri "gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.mp4" \
                        --arg upload_id "$UPLOAD_ID" \
                        --arg source_url "$URL" \
                        --arg hook_prompt "$HOOK_PROMPT" \
                        --argjson hook_schema "$HOOK_SCHEMA" \
'{
  "gcs_uri": $gcs_uri,
  "upload_id": $upload_id,
  "source_url": $source_url,
  "model": "gemini-2.5-pro",
  "structured_output": true,
  "hook_prompt": $hook_prompt,
  "response_schema": $hook_schema
}')

# Call T2 API
T2_RESPONSE="$(curl -s -X POST "$T2_URL" \
  -H "Content-Type: application/json" \
  -d "$EXTRACTION_PAYLOAD")"

# Check T2 response
if [[ $(echo "$T2_RESPONSE" | jq -r '.error // empty') ]]; then
    echo "❌ T2 Extraction Error:"
    echo "$T2_RESPONSE" | jq -r '.error'
    exit 1
fi

JOB_ID="$(echo "$T2_RESPONSE" | jq -r '.job_id // .id // empty')"
if [[ -n "$JOB_ID" ]]; then
    echo "✅ T2 extraction job started: $JOB_ID"
    echo "🔍 Monitor with: curl -s ${T2_URL%/*}/jobs/${JOB_ID}"
else
    echo "⚠️ T2 response received but no job_id found"
    echo "$T2_RESPONSE" | jq .
fi

# Step 9: Cleanup local files (optional)
echo "🧹 Cleaning up local files..."
rm -f "${VIDEO_ID}.mp4" "${VIDEO_ID}.vdp.json"
echo "✅ Local files cleaned up"

# Final summary
echo ""
echo "🎉 VDP One-Shot Pipeline Complete!"
echo "📝 Summary:"
echo "  - Video ID: $VIDEO_ID"
echo "  - Upload ID: $UPLOAD_ID"
echo "  - GCS URI: gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.mp4"
echo "  - T2 Job ID: ${JOB_ID:-N/A}"
echo ""
echo "🔄 Next steps:"
echo "  1. Monitor T2 job: curl -s ${T2_URL%/*}/jobs/${JOB_ID:-JOB_ID}"
echo "  2. Check GOLD bucket for JSONL output"
echo "  3. Verify BigQuery ingestion"