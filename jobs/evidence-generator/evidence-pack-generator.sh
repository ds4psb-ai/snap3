#!/usr/bin/env bash
set -euo pipefail

# 📦 Evidence Pack Generator
# Purpose: Combine audio fingerprints + brand detection into unified Evidence Pack
# Usage: ./evidence-pack-generator.sh VIDEO_FILE [METADATA_FILE] [OUTPUT_DIR]

VIDEO_FILE="${1:-}"
METADATA_FILE="${2:-}"
OUTPUT_DIR="${3:-./evidence-output}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validation
if [[ -z "$VIDEO_FILE" ]]; then
    echo "❌ Usage: $0 VIDEO_FILE [METADATA_FILE] [OUTPUT_DIR]"
    echo ""
    echo "Examples:"
    echo "  $0 ~/Downloads/video.mp4"
    echo "  $0 video.mp4 metadata.json ./output"
    echo "  $0 55e6ScXfiZc.mp4 55e6ScXfiZc.youtube.meta.json"
    echo ""
    exit 1
fi

if [[ ! -f "$VIDEO_FILE" ]]; then
    echo "❌ Video file not found: $VIDEO_FILE"
    exit 1
fi

echo "📦 Evidence Pack Generator"
echo "=========================="
echo "📁 Video: $VIDEO_FILE"
if [[ -n "$METADATA_FILE" && -f "$METADATA_FILE" ]]; then
    echo "📋 Metadata: $METADATA_FILE"
fi
echo "📂 Output: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Extract filename without extension for naming
BASENAME=$(basename "$VIDEO_FILE" | sed 's/\.[^.]*$//')
EVIDENCE_DIR="${OUTPUT_DIR}/${BASENAME}_evidence"
FINAL_EVIDENCE_PACK="${OUTPUT_DIR}/${BASENAME}_evidence_pack.json"

mkdir -p "$EVIDENCE_DIR"

echo "🔄 Processing Evidence Components..."
echo ""

# Step 1: Generate audio fingerprint
echo "🎵 Step 1: Audio fingerprint extraction..."
if "${SCRIPT_DIR}/audio-fingerprint.sh" "$VIDEO_FILE" "$EVIDENCE_DIR"; then
    AUDIO_EVIDENCE="${EVIDENCE_DIR}/${BASENAME}_audio_evidence.json"
    echo "✅ Audio evidence ready: $AUDIO_EVIDENCE"
else
    echo "❌ Audio fingerprint extraction failed"
    exit 1
fi

echo ""

# Step 2: Generate brand detection
echo "🏷️ Step 2: Brand/product detection..."
if "${SCRIPT_DIR}/brand-detector.sh" "$VIDEO_FILE" "$EVIDENCE_DIR"; then
    BRAND_EVIDENCE="${EVIDENCE_DIR}/${BASENAME}_brand_detection.json"
    echo "✅ Brand evidence ready: $BRAND_EVIDENCE"
else
    echo "❌ Brand detection failed"
    exit 1
fi

echo ""

# Step 3: Load metadata if provided
METADATA_CONTENT="{}"
if [[ -n "$METADATA_FILE" && -f "$METADATA_FILE" ]]; then
    echo "📋 Step 3: Loading source metadata..."
    METADATA_CONTENT=$(cat "$METADATA_FILE")
    echo "✅ Metadata loaded from: $METADATA_FILE"
else
    echo "📋 Step 3: No metadata file provided - using minimal metadata"
fi

echo ""

# Step 4: Create unified Evidence Pack
echo "📦 Step 4: Creating unified Evidence Pack..."

# Load evidence components
AUDIO_DATA=$(cat "$AUDIO_EVIDENCE")
BRAND_DATA=$(cat "$BRAND_EVIDENCE")

# Generate comprehensive Evidence Pack
EVIDENCE_PACK=$(jq -n \
    --arg video_file "$VIDEO_FILE" \
    --arg basename "$BASENAME" \
    --arg pack_id "$(uuidgen | tr '[:upper:]' '[:lower:]')" \
    --arg generated_at "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")" \
    --argjson metadata "$METADATA_CONTENT" \
    --argjson audio_evidence "$AUDIO_DATA" \
    --argjson brand_evidence "$BRAND_DATA" \
    '{
        evidence_pack_id: $pack_id,
        source_file: $video_file,
        basename: $basename,
        generated_at: $generated_at,
        version: "1.0",
        evidence_components: {
            audio_fingerprint: {
                fingerprint: $audio_evidence.audio_fingerprint.fingerprint,
                duration: $audio_evidence.audio_fingerprint.duration,
                hash_count: $audio_evidence.audio_fingerprint.hash_count,
                algorithm: $audio_evidence.audio_fingerprint.algorithm,
                quality_score: $audio_evidence.quality_metrics.fingerprint_density
            },
            brand_detection: {
                detected_brands: $brand_evidence.brand_detection.detected_brands,
                detected_products: $brand_evidence.brand_detection.detected_products,
                brand_count: $brand_evidence.brand_detection.brand_count,
                product_count: $brand_evidence.brand_detection.product_count,
                confidence_score: $brand_evidence.quality_metrics.detection_confidence
            },
            source_metadata: $metadata
        },
        trust_score: (
            # Calculate trust score from various factors
            ($audio_evidence.quality_metrics.fingerprint_density * 0.4) +
            ($brand_evidence.quality_metrics.detection_confidence * 0.3) +
            (if ($metadata | keys | length) > 3 then 0.3 else 0.1 end)
        ),
        evidence_chips: [
            (if ($audio_evidence.audio_fingerprint.hash_count > 20) then "High-quality audio signature" else "Basic audio signature" end),
            (if ($brand_evidence.brand_detection.brand_count > 0) then "Brand mentions detected" else "No explicit brand content" end),
            (if ($brand_evidence.brand_detection.product_count > 0) then "Product placements identified" else "Minimal product placement" end),
            (if ($metadata | keys | length) > 5 then "Rich metadata available" else "Limited metadata" end)
        ],
        provenance: {
            extraction_tools: ["ffmpeg", "chromaprint", "keyword_matching"],
            processing_pipeline: "jobs_t2_evidence_generator",
            component_count: 3,
            integrity_hash: ($pack_id | @base64)
        },
        gcs_ready: {
            upload_path: "evidence-packs/" + $basename + "/" + $pack_id + ".json",
            content_type: "application/json",
            size_estimate: (input | @json | length),
            compression_recommended: false
        }
    }')

echo "$EVIDENCE_PACK" > "$FINAL_EVIDENCE_PACK"
echo "✅ Evidence Pack created: $FINAL_EVIDENCE_PACK"

# Step 5: Quality validation and summary
echo ""
echo "🔍 Evidence Pack Validation:"
echo "============================"

TRUST_SCORE=$(echo "$EVIDENCE_PACK" | jq -r '.trust_score')
BRAND_COUNT=$(echo "$EVIDENCE_PACK" | jq -r '.evidence_components.brand_detection.brand_count')
HASH_COUNT=$(echo "$EVIDENCE_PACK" | jq -r '.evidence_components.audio_fingerprint.hash_count')
CHIP_COUNT=$(echo "$EVIDENCE_PACK" | jq '.evidence_chips | length')

echo "🎯 Trust Score: $TRUST_SCORE"
echo "🏷️ Brands detected: $BRAND_COUNT"
echo "🔊 Audio hashes: $HASH_COUNT"
echo "💎 Evidence chips: $CHIP_COUNT"

# Quality assessment
if (( $(echo "$TRUST_SCORE > 0.7" | bc -l) )); then
    echo "🌟 Quality: High-confidence evidence pack"
elif (( $(echo "$TRUST_SCORE > 0.4" | bc -l) )); then
    echo "✨ Quality: Good evidence pack"
else
    echo "📝 Quality: Basic evidence pack"
fi

# Display evidence chips
echo ""
echo "💎 Evidence Chips:"
echo "$EVIDENCE_PACK" | jq -r '.evidence_chips[] | "  - " + .'

# GCS upload info
echo ""
echo "☁️ GCS Upload Information:"
GCS_PATH=$(echo "$EVIDENCE_PACK" | jq -r '.gcs_ready.upload_path')
SIZE_EST=$(echo "$EVIDENCE_PACK" | jq -r '.gcs_ready.size_estimate')
echo "  📍 Path: $GCS_PATH"
echo "  📏 Size: ~${SIZE_EST} bytes"

echo ""
echo "🎉 Evidence Pack generation complete!"
echo ""
echo "📁 Generated Files:"
echo "  - $FINAL_EVIDENCE_PACK (unified Evidence Pack)"
echo "  - $AUDIO_EVIDENCE (audio fingerprint)"
echo "  - $BRAND_EVIDENCE (brand detection)"
echo ""
echo "🔧 Integration Commands:"
echo "  # View Evidence Pack"
echo "  cat $FINAL_EVIDENCE_PACK | jq ."
echo ""
echo "  # Check trust score"
echo "  cat $FINAL_EVIDENCE_PACK | jq '.trust_score'"
echo ""
echo "  # Upload to GCS (example)"
echo "  gsutil cp $FINAL_EVIDENCE_PACK gs://your-bucket/$GCS_PATH"
echo ""
echo "  # Ready for Main2 T2 VDP merger integration"

# Cleanup intermediate files (optional)
if [[ "${KEEP_INTERMEDIATE:-}" != "1" ]]; then
    rm -rf "$EVIDENCE_DIR"
    echo "🧹 Cleaned up intermediate files"
fi