#!/usr/bin/env bash
set -euo pipefail

# 📤 Evidence Pack Uploader to GCS
# Purpose: Upload audio fingerprints and product evidence to GCS for Main2 T2 integration
# Usage: ./evidence-uploader.sh CONTENT_ID [LOCAL_MP4] [VDP_FILE]

CONTENT_ID="${1:-}"
LOCAL_MP4="${2:-}"
VDP_FILE="${3:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration (use environment variables)
GCS_EVIDENCE_DIR="${EVID_PREFIX:-gs://${RAW_BUCKET:-tough-variety-raw}/raw/vdp/evidence}"
GCS_INPUT_DIR="${INPUT_PREFIX:-gs://${RAW_BUCKET:-tough-variety-raw}/raw/input}"
OUTPUT_DIR="$HOME/snap3/out/meta"
TMP_DIR="$HOME/snap3/tmp"

# Validation
if [[ -z "$CONTENT_ID" ]]; then
    echo "❌ Usage: $0 CONTENT_ID [LOCAL_MP4] [VDP_FILE]"
    echo ""
    echo "Examples:"
    echo "  $0 55e6ScXfiZc"
    echo "  $0 C001 ~/Downloads/video.mp4 ~/vdp/C001.json"
    echo ""
    echo "Environment Variables:"
    echo "  GCS_EVIDENCE_DIR - GCS directory for evidence (default: gs://tough-variety-raw/raw/vdp/evidence)"
    echo ""
    exit 1
fi

echo "📤 Evidence Pack Uploader"
echo "========================"
echo "🆔 Content ID: $CONTENT_ID"
echo "☁️ GCS Directory: $GCS_EVIDENCE_DIR"
echo ""

# Create directories
mkdir -p "$OUTPUT_DIR" "$TMP_DIR"

# Auto-detect files if not provided
if [[ -z "$LOCAL_MP4" ]]; then
    # Try to find MP4 in common locations
    for path in "$TMP_DIR/${CONTENT_ID}.mp4" "$HOME/snap3/${CONTENT_ID}.mp4" "$(pwd)/${CONTENT_ID}.mp4"; do
        if [[ -f "$path" ]]; then
            LOCAL_MP4="$path"
            echo "📁 Auto-detected MP4: $LOCAL_MP4"
            break
        fi
    done
fi

if [[ -z "$VDP_FILE" ]]; then
    # Try to find VDP in common locations
    for path in "$HOME/snap3/out/vdp/${CONTENT_ID}.NEW.universal.download.json" \
                "$HOME/snap3/out/vdp/${CONTENT_ID}.vdp.json" \
                "$HOME/snap3/out/vdp/${CONTENT_ID}.json"; do
        if [[ -f "$path" ]]; then
            VDP_FILE="$path"
            echo "📄 Auto-detected VDP: $VDP_FILE"
            break
        fi
    done
fi

# Download MP4 from GCS if not found locally
if [[ -z "$LOCAL_MP4" || ! -f "$LOCAL_MP4" ]]; then
    echo "📥 Downloading MP4 from GCS..."
    GCS_MP4_PATH="${GCS_INPUT_DIR}/${CONTENT_ID}.mp4"
    LOCAL_MP4="$TMP_DIR/${CONTENT_ID}.mp4"
    
    if gsutil cp "$GCS_MP4_PATH" "$LOCAL_MP4" 2>/dev/null; then
        echo "✅ Downloaded: $LOCAL_MP4"
    else
        echo "❌ Failed to download MP4 from GCS: $GCS_MP4_PATH"
        echo "Please provide LOCAL_MP4 parameter"
        exit 1
    fi
fi

# Step 1: Generate Audio Fingerprint
echo ""
echo "🎵 Step 1: Generating audio fingerprint..."
AUDIO_FP_FILE="$OUTPUT_DIR/${CONTENT_ID}.audio.fp.json"

if "${SCRIPT_DIR}/audio-fingerprint-enhanced.sh" "$LOCAL_MP4" "$CONTENT_ID" "$AUDIO_FP_FILE"; then
    echo "✅ Audio fingerprint generated: $AUDIO_FP_FILE"
else
    echo "❌ Audio fingerprint generation failed"
    exit 1
fi

# Step 2: Generate Product Evidence (if VDP available)
echo ""
echo "🏷️ Step 2: Generating product evidence..."
PRODUCT_EVIDENCE_FILE="$OUTPUT_DIR/${CONTENT_ID}.product.evidence.json"

if [[ -n "$VDP_FILE" && -f "$VDP_FILE" ]]; then
    if cd "$SCRIPT_DIR" && node product-evidence.mjs "$VDP_FILE" "$PRODUCT_EVIDENCE_FILE"; then
        echo "✅ Product evidence generated: $PRODUCT_EVIDENCE_FILE"
    else
        echo "❌ Product evidence generation failed"
        exit 1
    fi
else
    echo "⚠️ VDP file not found - creating minimal product evidence"
    echo '{"product_mentions":[],"brand_detection_metrics":{"logo_hits":0,"ocr_hits":0,"object_hits":0,"normalized_score":0.0},"processing_info":{"note":"VDP file not available"}}' > "$PRODUCT_EVIDENCE_FILE"
fi

# Step 3: Upload to GCS
echo ""
echo "📤 Step 3: Uploading evidence to GCS..."

# Upload audio fingerprint
AUDIO_GCS_PATH="${GCS_EVIDENCE_DIR}/${CONTENT_ID}.audio.fp.json"
if gsutil cp "$AUDIO_FP_FILE" "$AUDIO_GCS_PATH"; then
    echo "✅ Audio fingerprint uploaded: $AUDIO_GCS_PATH"
else
    echo "❌ Failed to upload audio fingerprint"
    exit 1
fi

# Upload product evidence
PRODUCT_GCS_PATH="${GCS_EVIDENCE_DIR}/${CONTENT_ID}.product.evidence.json"
if gsutil cp "$PRODUCT_EVIDENCE_FILE" "$PRODUCT_GCS_PATH"; then
    echo "✅ Product evidence uploaded: $PRODUCT_GCS_PATH"
else
    echo "❌ Failed to upload product evidence"
    exit 1
fi

# Step 4: Generate upload summary
echo ""
echo "📋 Upload Summary:"
echo "=================="

# Get file sizes
AUDIO_SIZE=$(stat -f%z "$AUDIO_FP_FILE" 2>/dev/null || stat -c%s "$AUDIO_FP_FILE" 2>/dev/null || echo "unknown")
PRODUCT_SIZE=$(stat -f%z "$PRODUCT_EVIDENCE_FILE" 2>/dev/null || stat -c%s "$PRODUCT_EVIDENCE_FILE" 2>/dev/null || echo "unknown")

echo "📊 Files uploaded:"
echo "  🎵 Audio fingerprint: ${AUDIO_SIZE} bytes → $AUDIO_GCS_PATH"
echo "  🏷️ Product evidence: ${PRODUCT_SIZE} bytes → $PRODUCT_GCS_PATH"

# Quality metrics
if [[ -f "$AUDIO_FP_FILE" ]]; then
    CONFIDENCE=$(jq -r '.audio.same_bgm_confidence // "unknown"' "$AUDIO_FP_FILE")
    CLUSTER_ID=$(jq -r '.audio.same_bgm_cluster_id // "unknown"' "$AUDIO_FP_FILE")
    echo ""
    echo "🎯 Audio quality:"
    echo "  - BGM confidence: $CONFIDENCE"
    echo "  - Cluster ID: $CLUSTER_ID"
fi

if [[ -f "$PRODUCT_EVIDENCE_FILE" ]]; then
    PRODUCT_COUNT=$(jq -r '.product_mentions | length' "$PRODUCT_EVIDENCE_FILE")
    DETECTION_SCORE=$(jq -r '.brand_detection_metrics.normalized_score // 0' "$PRODUCT_EVIDENCE_FILE")
    echo ""
    echo "🏷️ Product detection:"
    echo "  - Mentions found: $PRODUCT_COUNT"
    echo "  - Detection score: $DETECTION_SCORE"
fi

echo ""
echo "🎉 Evidence pack upload complete!"
echo ""
echo "🔗 Integration info for Main2 T2:"
echo "  Content ID: $CONTENT_ID"
echo "  Audio fingerprint: $AUDIO_GCS_PATH"
echo "  Product evidence: $PRODUCT_GCS_PATH"
echo ""
echo "📝 Next steps:"
echo "  1. Main2 T2 can now fetch evidence from GCS"
echo "  2. Merge evidence into VDP during generation"
echo "  3. Evidence will enhance VDP trust score and metadata"

# Cleanup temporary files (optional)
if [[ "${KEEP_LOCAL:-}" != "1" ]]; then
    if [[ "$LOCAL_MP4" == *"$TMP_DIR"* ]]; then
        rm -f "$LOCAL_MP4"
        echo "🧹 Cleaned up temporary MP4"
    fi
fi