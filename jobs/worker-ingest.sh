#!/usr/bin/env bash
set -euo pipefail

# 🔄 Ingest Request Polling Worker
# Purpose: Monitor ingest/requests/*.json → Video download → Evidence Pack → Main2 T2 VDP trigger
# Usage: ./worker-ingest.sh [--once]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables
if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env"
else
    echo "❌ .env file not found. Please create from .env.example"
    exit 1
fi

# Configuration with fallbacks
RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw}"
REQ_PREFIX="${REQ_PREFIX:-gs://tough-variety-raw/ingest/requests}"
INPUT_PREFIX="${INPUT_PREFIX:-gs://tough-variety-raw/raw/input}"
EVID_PREFIX="${EVID_PREFIX:-gs://tough-variety-raw/raw/vdp/evidence}"
US_T2="${US_T2:-https://t2-vdp-355516763169.us-central1.run.app}"

WORKDIR="${HOME}/snap3/jobs/work"
PROCESSED_DIR="${WORKDIR}/processed"
FAILED_DIR="${WORKDIR}/failed"
EVIDENCE_GEN_DIR="$SCRIPT_DIR/evidence-generator"

# Create working directories
mkdir -p "$WORKDIR" "$PROCESSED_DIR" "$FAILED_DIR"

# Check if running once or continuously
RUN_ONCE="${1:-}"

echo "🔄 Ingest Request Polling Worker"
echo "================================"
echo "📍 Polling: $REQ_PREFIX"
echo "📁 Work dir: $WORKDIR"
echo "🎯 VDP Service: $US_T2"
echo ""

# Function to process a single request
process_request() {
    local gcs_file="$1"
    local base="$(basename "$gcs_file")"
    local local_json="${WORKDIR}/${base}"
    local done_marker="${PROCESSED_DIR}/${base}.done"
    local failed_marker="${FAILED_DIR}/${base}.failed"
    
    # Skip if already processed or failed
    if [[ -f "$done_marker" || -f "$failed_marker" ]]; then
        return 0
    fi
    
    echo "📥 Processing: $base"
    
    # Download request file
    if ! gsutil cp "$gcs_file" "$local_json"; then
        echo "❌ Failed to download request file: $gcs_file"
        return 1
    fi
    
    # Parse request
    if ! content_id=$(jq -r '.content_id // empty' "$local_json") || [[ -z "$content_id" ]]; then
        echo "❌ Invalid content_id in request: $base"
        touch "$failed_marker"
        return 1
    fi
    
    platform=$(jq -r '.platform // "unknown"' "$local_json")
    src_url=$(jq -r '.source_url // empty' "$local_json")
    out_gcs=$(jq -r '.outGcsUri // empty' "$local_json")
    
    if [[ -z "$src_url" ]]; then
        echo "❌ Missing source_url in request: $base"
        touch "$failed_marker"
        return 1
    fi
    
    echo "🆔 Content ID: $content_id"
    echo "🌐 Platform: $platform"
    echo "🔗 Source URL: $src_url"
    
    # Platform-specific processing
    case "${platform,,}" in
        "youtube"*|"youtube shorts")
            process_youtube_request "$content_id" "$platform" "$src_url" "$out_gcs" "$local_json" "$done_marker" "$failed_marker"
            ;;
        "instagram"*|"tiktok"*)
            process_social_metadata_only "$content_id" "$platform" "$src_url" "$local_json" "$done_marker" "$failed_marker"
            ;;
        *)
            echo "⚠️ Unknown platform: $platform, treating as YouTube"
            process_youtube_request "$content_id" "$platform" "$src_url" "$out_gcs" "$local_json" "$done_marker" "$failed_marker"
            ;;
    esac
    
    return $?
}

# YouTube processing: Full pipeline with video download + Evidence Pack + T2 trigger
process_youtube_request() {
    local content_id="$1"
    local platform="$2"
    local src_url="$3"
    local out_gcs="$4"
    local local_json="$5"
    local done_marker="$6"
    local failed_marker="$7"
    
    # 1) Video download with yt-dlp → GCS upload (720p max)
    echo ""
    echo "📺 Step 1: Downloading YouTube video (≤720p)..."
    local mp4_gcs_path="${INPUT_PREFIX}/${content_id}.mp4"
    local temp_mp4="${WORKDIR}/${content_id}.mp4"
    
    # Download video to local temp file first (720p max for efficiency)
    if ! yt-dlp -f "best[height<=720][ext=mp4]/mp4[height<=720]/best[height<=720]/best" -o "$temp_mp4" "$src_url"; then
        echo "❌ yt-dlp download failed for: $src_url"
        touch "$failed_marker"
        return 1
    fi
    
    # Upload to GCS
    if ! gsutil cp "$temp_mp4" "$mp4_gcs_path"; then
        echo "❌ Failed to upload video to GCS: $mp4_gcs_path"
        rm -f "$temp_mp4"
        touch "$failed_marker"
        return 1
    fi
    
    echo "✅ Video uploaded: $mp4_gcs_path"
    
    # 2) Evidence Pack generation
    echo ""
    echo "🔍 Step 2: Generating Evidence Pack..."
    
    # Audio fingerprint generation
    local audio_fp_local="${WORKDIR}/${content_id}.audio.fp.json"
    local audio_fp_gcs="${EVID_PREFIX}/${content_id}.audio.fp.json"
    
    if "$EVIDENCE_GEN_DIR/audio-fingerprint-enhanced.sh" "$temp_mp4" "$content_id" "$audio_fp_local"; then
        if gsutil cp "$audio_fp_local" "$audio_fp_gcs"; then
            echo "✅ Audio fingerprint uploaded: $audio_fp_gcs"
        else
            echo "⚠️ Failed to upload audio fingerprint"
            audio_fp_gcs=""
        fi
    else
        echo "⚠️ Audio fingerprint generation failed"
        audio_fp_gcs=""
    fi
    
    # Product evidence generation (requires VDP seed - create minimal)
    local product_ev_local="${WORKDIR}/${content_id}.product.evidence.json"
    local product_ev_gcs="${EVID_PREFIX}/${content_id}.product.evidence.json"
    
    # Create minimal VDP seed for product evidence
    local vdp_seed="${WORKDIR}/${content_id}.vdp.seed.json"
    cat > "$vdp_seed" <<EOF
{
  "content_id": "$content_id",
  "platform": "$platform",
  "source_url": "$src_url",
  "metadata": $(jq '.metadata // {}' "$local_json"),
  "overall_analysis": {
    "asr_transcript": "",
    "ocr_text": "",
    "scene_analysis": []
  }
}
EOF
    
    if cd "$EVIDENCE_GEN_DIR" && node product-evidence.mjs "$vdp_seed" "$product_ev_local"; then
        if gsutil cp "$product_ev_local" "$product_ev_gcs"; then
            echo "✅ Product evidence uploaded: $product_ev_gcs"
        else
            echo "⚠️ Failed to upload product evidence"
            product_ev_gcs=""
        fi
    else
        echo "⚠️ Product evidence generation failed"
        product_ev_gcs=""
    fi
    
    # Cleanup temp video file
    rm -f "$temp_mp4"
    
    # 3) Main2 T2 VDP generation trigger
    echo ""
    echo "🚀 Step 3: Triggering VDP generation..."
    
    # Build T2 server payload with required format
    local trigger_payload
    trigger_payload=$(jq -n \
        --arg gcsUri "$mp4_gcs_path" \
        --arg platform "$platform" \
        --arg content_id "$content_id" \
        --arg audioFpGcsUri "$audio_fp_gcs" \
        --arg productEvidenceGcsUri "$product_ev_gcs" \
        --arg outGcsUri "$out_gcs" \
        '{
            gcsUri: $gcsUri,
            meta: {
                platform: $platform,
                content_id: $content_id,
                audioFpGcsUri: ($audioFpGcsUri | if . == "" then null else . end),
                productEvidenceGcsUri: ($productEvidenceGcsUri | if . == "" then null else . end),
                video_origin: "real_footage",
                language: "ko"
            },
            outGcsUri: $outGcsUri,
            async: true
        }')
    
    local trigger_response
    if trigger_response=$(curl -sS -X POST "${US_T2}/api/vdp/extract-vertex?async=true" \
        -H 'Content-Type: application/json' \
        -d "$trigger_payload" 2>/dev/null); then
        
        echo "✅ VDP generation triggered successfully"
        echo "📋 Response: $trigger_response"
        
        # Mark as processed
        touch "$done_marker"
        echo "🎉 Request processed successfully: $content_id"
        
    else
        echo "❌ Failed to trigger VDP generation"
        touch "$failed_marker"
        return 1
    fi
    
    # Cleanup local files
    rm -f "$local_json" "$audio_fp_local" "$product_ev_local" "$vdp_seed"
    
    return 0
}

# Instagram/TikTok processing: Metadata-only to BigQuery (no video download)
process_social_metadata_only() {
    local content_id="$1"
    local platform="$2" 
    local src_url="$3"
    local local_json="$4"
    local done_marker="$5"
    local failed_marker="$6"
    
    echo ""
    echo "📊 Processing metadata-only for $platform..."
    echo "⚠️ Video download skipped (authentication/legal constraints)"
    
    # 1) Parse metadata from request
    local metadata
    metadata=$(jq -r '.metadata // {}' "$local_json")
    local request_time
    request_time=$(jq -r '.metadata.requested_at // now' "$local_json")
    
    # 2) Create BigQuery record for social_ingest.link_requests table
    local bq_record="${WORKDIR}/${content_id}.bq.json"
    cat > "$bq_record" <<EOF
{
    "content_id": "$content_id",
    "platform": "$platform",
    "source_url": "$src_url",
    "request_time": "$request_time",
    "processing_status": "metadata_only",
    "video_available": false,
    "audio_fingerprint_available": false,
    "evidence_pack_available": false,
    "metadata": $metadata,
    "notes": "Video download not attempted due to platform constraints"
}
EOF
    
    # 3) Upload to BigQuery staging (could be direct bq load or GCS staging)
    local bq_staging_path="gs://${RAW_BUCKET}/staging/social_metadata/${content_id}.json"
    if gsutil cp "$bq_record" "$bq_staging_path"; then
        echo "✅ Metadata uploaded to BigQuery staging: $bq_staging_path"
        
        # 4) Optional: Direct BigQuery insert (if bq CLI available)
        if command -v bq >/dev/null 2>&1; then
            echo "📋 Attempting direct BigQuery insert..."
            if bq insert --ignore_unknown_values \
                "${PROJECT_ID}:social_ingest.link_requests" \
                "$bq_record" 2>/dev/null; then
                echo "✅ Record inserted to BigQuery directly"
            else
                echo "⚠️ Direct insert failed, record available in staging"
            fi
        fi
        
        # Mark as processed
        touch "$done_marker"
        echo "🎉 $platform metadata processed: $content_id"
        
    else
        echo "❌ Failed to upload metadata to staging"
        touch "$failed_marker"
        return 1
    fi
    
    # Cleanup
    rm -f "$local_json" "$bq_record"
    
    return 0
}

# Main polling loop
poll_requests() {
    local iteration=0
    
    while true; do
        iteration=$((iteration + 1))
        echo ""
        echo "🔍 Polling iteration #$iteration - $(date)"
        
        # Get list of request files (compatible with all bash versions)
        local request_files_raw
        request_files_raw=$(gsutil ls "${REQ_PREFIX}/*.json" 2>/dev/null || true)
        local request_files=()
        while IFS= read -r line; do
            [[ -n "$line" ]] && request_files+=("$line")
        done <<< "$request_files_raw"
        
        if [[ ${#request_files[@]} -eq 0 ]]; then
            echo "📭 No requests found"
        else
            echo "📬 Found ${#request_files[@]} request(s)"
            
            for request_file in "${request_files[@]}"; do
                if [[ -n "$request_file" ]]; then
                    process_request "$request_file" || true
                fi
            done
        fi
        
        # Exit if running once
        if [[ "$RUN_ONCE" == "--once" ]]; then
            echo "🏁 Single run completed"
            break
        fi
        
        echo "⏳ Sleeping 10 seconds..."
        sleep 10
    done
}

# Trap for graceful shutdown
trap 'echo "🛑 Worker shutting down..."; exit 0' SIGINT SIGTERM

# Start polling
echo "🚀 Starting worker (Ctrl+C to stop)..."
poll_requests