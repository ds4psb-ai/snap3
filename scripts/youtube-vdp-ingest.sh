#\!/usr/bin/env bash
set -euo pipefail

URL="$1"

echo "🎬 Starting YouTube VDP ingestion for: $URL"

# Generate unified upload ID for this ingestion
UPLOAD_ID="$(uuidgen)"
echo "🔖 Upload ID: $UPLOAD_ID"

# 1) VIDEO_ID
VIDEO_ID="$(yt-dlp --get-id "$URL")"
echo "📝 Video ID: $VIDEO_ID"

# 2) ENHANCED VIDEO+AUDIO 병합 (오디오 미싱 방지)
echo "⬇️ Downloading video with enhanced audio+video merge..."
yt-dlp \
  -f "bv*[vcodec!*=?][height<=1080][fps<=60]+ba/b[height<=1080][fps<=60]" \
  --merge-output-format mp4 \
  -N 4 -R 10 --fragment-retries 999 \
  --no-part \
  --postprocessor-args "ffmpeg:-c:v copy -c:a aac" \
  -o "${VIDEO_ID}.%(ext)s" \
  "$URL"

# Enhanced validation with audio stream check
if [[ ! -f "${VIDEO_ID}.mp4" ]]; then
    echo "❌ Error: Video download failed"
    exit 1
fi

# Check for audio streams if ffprobe available
if command -v ffprobe &> /dev/null; then
    AUDIO_CNT=$(ffprobe -v error -select_streams a -show_entries stream=index \
                        -of csv=p=0 "${VIDEO_ID}.mp4" 2>/dev/null | wc -l | xargs)
    if [[ "$AUDIO_CNT" -lt 1 ]]; then
        echo "⚠️ Warning: No audio streams detected in downloaded video"
        echo "🔧 Attempting to add silent audio track..."
        
        if ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
                   -i "${VIDEO_ID}.mp4" \
                   -c:v copy -c:a aac -shortest \
                   "${VIDEO_ID}.fixed.mp4" 2>/dev/null; then
            mv "${VIDEO_ID}.fixed.mp4" "${VIDEO_ID}.mp4"
            echo "✅ Added silent audio track"
        else
            echo "⚠️ Could not add audio track - proceeding with video-only"
        fi
    else
        echo "✅ Audio streams detected: $AUDIO_CNT"
    fi
fi

echo "✅ Downloaded: ${VIDEO_ID}.mp4"

# 3) 통계
echo "📊 Collecting YouTube statistics..."
: "${YOUTUBE_API_KEY:?Set YOUTUBE_API_KEY}"
STATS_JSON="$(curl -sS "https://youtube.googleapis.com/youtube/v3/videos?part=statistics&id=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")"

# API 응답 검증
if [[ $(echo "$STATS_JSON" | jq -r '.error.code // empty') ]]; then
    echo "❌ YouTube API Error:"
    echo "$STATS_JSON" | jq -r '.error.message'
    exit 1
fi

VIEW="$(echo "$STATS_JSON" | jq -r '.items[0].statistics.viewCount // "0"')"
LIKE="$(echo "$STATS_JSON" | jq -r '.items[0].statistics.likeCount // "0"')"
COMM="$(echo "$STATS_JSON" | jq -r '.items[0].statistics.commentCount // "0"')"
echo "✅ Stats - Views: $VIEW, Likes: $LIKE, Comments: $COMM"

# 4) 댓글(최대 5) - 실패해도 전체 플로우는 계속
echo "💬 Collecting top comments..."
COMMENTS="[]"
COMMENTS_RAW="$(curl -sS "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&order=relevance&maxResults=5&key=${YOUTUBE_API_KEY}" 2>/dev/null)" || true

if [[ -n "$COMMENTS_RAW" ]] && [[ $(echo "$COMMENTS_RAW" | jq -r '.error.code // empty') == "" ]]; then
    if [[ $(echo "$COMMENTS_RAW" | jq -r '.items | length') != "0" ]]; then
        # 제어 문자 제거하여 안전한 JSON 파싱
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

# 5) 사이드카 VDP JSON 생성
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

# 6) GCS 업로드 (통합 upload-id 메타데이터)
if [[ -n "${RAW_BUCKET:-}" ]]; then
    echo "📤 Uploading to GCS with unified upload-id..."
    
    # 비디오 파일 업로드
    gsutil -h "x-goog-meta-vdp-platform:youtube" \
           -h "x-goog-meta-vdp-source-url:${URL}" \
           -h "x-goog-meta-vdp-content-id:${VIDEO_ID}" \
           -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
           -h "x-goog-meta-vdp-view-count:${VIEW}" \
           -h "x-goog-meta-vdp-like-count:${LIKE}" \
           -h "x-goog-meta-vdp-comment-count:${COMM}" \
           cp "${VIDEO_ID}.mp4" "gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.mp4"
    
    # JSON 메타데이터 업로드
    gsutil -h "x-goog-meta-vdp-platform:youtube" \
           -h "x-goog-meta-vdp-source-url:${URL}" \
           -h "x-goog-meta-vdp-content-id:${VIDEO_ID}" \
           -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
           -h "x-goog-meta-content-type:application/json" \
           cp "${VIDEO_ID}.vdp.json" "gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.vdp.json"
    
    echo "✅ Uploaded both files with upload-id: ${UPLOAD_ID}"
else
    echo "ℹ️ RAW_BUCKET not set, skipping GCS upload"
fi

echo "OK ${VIDEO_ID}"
