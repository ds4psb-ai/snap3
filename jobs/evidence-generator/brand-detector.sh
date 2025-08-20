#!/usr/bin/env bash
set -euo pipefail

# 🏷️ Brand/Product Detection System
# Purpose: Extract brand mentions and product placements for Evidence Pack
# Usage: ./brand-detector.sh VIDEO_FILE [OUTPUT_DIR]

VIDEO_FILE="${1:-}"
OUTPUT_DIR="${2:-./evidence-output}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validation
if [[ -z "$VIDEO_FILE" ]]; then
    echo "❌ Usage: $0 VIDEO_FILE [OUTPUT_DIR]"
    echo ""
    echo "Examples:"
    echo "  $0 ~/Downloads/video.mp4"
    echo "  $0 /path/to/video.mp4 ./custom-output"
    echo ""
    exit 1
fi

if [[ ! -f "$VIDEO_FILE" ]]; then
    echo "❌ Video file not found: $VIDEO_FILE"
    exit 1
fi

echo "🏷️ Brand/Product Detection System"
echo "================================="
echo "📁 Input: $VIDEO_FILE"
echo "📂 Output: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Extract filename without extension for naming
BASENAME=$(basename "$VIDEO_FILE" | sed 's/\.[^.]*$//')
FRAMES_DIR="${OUTPUT_DIR}/${BASENAME}_frames"
DETECTION_FILE="${OUTPUT_DIR}/${BASENAME}_brand_detection.json"

# Step 1: Extract key frames for visual analysis
echo "🖼️ Extracting key frames..."
mkdir -p "$FRAMES_DIR"

# Extract frames at different intervals (every 2 seconds for first 30 seconds)
if ffmpeg -i "$VIDEO_FILE" -vf "fps=1/2" -t 30 "${FRAMES_DIR}/frame_%03d.jpg" -y 2>/dev/null; then
    FRAME_COUNT=$(ls "${FRAMES_DIR}"/*.jpg 2>/dev/null | wc -l)
    echo "✅ Extracted $FRAME_COUNT frames: $FRAMES_DIR"
else
    echo "❌ Failed to extract frames"
    exit 1
fi

echo ""

# Step 2: OCR text extraction from frames
echo "📝 Extracting text from frames (OCR)..."
OCR_RESULTS=()

# Known brand keywords for detection
BRAND_KEYWORDS=(
    "apple" "samsung" "google" "microsoft" "amazon" "facebook" "meta"
    "nike" "adidas" "coca-cola" "pepsi" "mcdonald" "starbucks" "netflix"
    "spotify" "youtube" "instagram" "tiktok" "twitter" "linkedin"
    "bmw" "mercedes" "toyota" "honda" "tesla" "uber" "lyft"
    "iphone" "android" "macbook" "ipad" "galaxy" "pixel"
)

# Product category keywords
PRODUCT_KEYWORDS=(
    "phone" "smartphone" "laptop" "computer" "tablet" "watch" "earbuds"
    "shoes" "sneakers" "clothing" "fashion" "makeup" "skincare" 
    "food" "drink" "restaurant" "coffee" "tea" "snack"
    "car" "vehicle" "app" "software" "game" "service"
)

TEXT_DETECTIONS=""
VISUAL_DETECTIONS=""

# Basic text extraction using available tools (if tesseract is available)
if command -v tesseract >/dev/null 2>&1; then
    echo "🔍 Using Tesseract OCR..."
    for frame in "${FRAMES_DIR}"/*.jpg; do
        if [[ -f "$frame" ]]; then
            FRAME_NAME=$(basename "$frame" .jpg)
            TEXT=$(tesseract "$frame" stdout 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr '\n' ' ')
            if [[ -n "$TEXT" ]]; then
                TEXT_DETECTIONS+="Frame $FRAME_NAME: $TEXT\n"
            fi
        fi
    done
else
    echo "⚠️ Tesseract OCR not available - using filename-based detection"
fi

echo ""

# Step 3: Brand/Product keyword matching
echo "🔍 Analyzing for brand/product mentions..."

# Combine all text for analysis
ALL_TEXT="${TEXT_DETECTIONS}${BASENAME}"

# Convert to lowercase for matching
ALL_TEXT_LOWER=$(echo "$ALL_TEXT" | tr '[:upper:]' '[:lower:]')

DETECTED_BRANDS=()
DETECTED_PRODUCTS=()
CONFIDENCE_SCORES=()

# Brand detection
for brand in "${BRAND_KEYWORDS[@]}"; do
    if echo "$ALL_TEXT_LOWER" | grep -q "$brand"; then
        DETECTED_BRANDS+=("$brand")
        CONFIDENCE_SCORES+=("0.8")  # High confidence for exact keyword match
    fi
done

# Product detection  
for product in "${PRODUCT_KEYWORDS[@]}"; do
    if echo "$ALL_TEXT_LOWER" | grep -q "$product"; then
        DETECTED_PRODUCTS+=("$product")
        CONFIDENCE_SCORES+=("0.6")  # Medium confidence for category match
    fi
done

echo ""

# Step 4: Generate brand detection results
echo "📋 Generating brand detection results..."

# Create brand detection JSON
BRAND_DETECTION=$(jq -n \
    --arg source_file "$VIDEO_FILE" \
    --arg basename "$BASENAME" \
    --arg detected_at "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")" \
    --argjson detected_brands "$(printf '%s\n' "${DETECTED_BRANDS[@]}" | jq -R . | jq -s .)" \
    --argjson detected_products "$(printf '%s\n' "${DETECTED_PRODUCTS[@]}" | jq -R . | jq -s .)" \
    --arg ocr_available "$(command -v tesseract >/dev/null 2>&1 && echo 'true' || echo 'false')" \
    --arg frame_count "$FRAME_COUNT" \
    '{
        source_file: $source_file,
        basename: $basename,
        detected_at: $detected_at,
        brand_detection: {
            detected_brands: $detected_brands,
            detected_products: $detected_products,
            brand_count: ($detected_brands | length),
            product_count: ($detected_products | length),
            analysis_method: "keyword_matching",
            ocr_enabled: ($ocr_available == "true"),
            frame_analysis: {
                frames_extracted: ($frame_count | tonumber),
                analysis_duration: 30,
                sampling_rate: "1 frame per 2 seconds"
            }
        },
        quality_metrics: {
            detection_confidence: (if ($detected_brands | length) > 0 then 0.8 else 0.3 end),
            coverage_score: (($detected_brands | length) + ($detected_products | length)) * 0.1,
            analysis_completeness: (if ($ocr_available == "true") then 0.9 else 0.6 end)
        },
        suggestions: [
            (if ($detected_brands | length) == 0 then "No explicit brand mentions detected - may require manual review" else empty end),
            (if ($ocr_available == "false") then "Install tesseract for improved text detection: brew install tesseract" else empty end)
        ]
    }')

echo "$BRAND_DETECTION" > "$DETECTION_FILE"
echo "✅ Brand detection results: $DETECTION_FILE"

# Step 5: Results summary
echo ""
echo "📊 Detection Summary:"
echo "===================="

BRAND_COUNT=$(echo "$BRAND_DETECTION" | jq '.brand_detection.brand_count')
PRODUCT_COUNT=$(echo "$BRAND_DETECTION" | jq '.brand_detection.product_count')

echo "🏷️ Brands detected: $BRAND_COUNT"
if [[ "$BRAND_COUNT" -gt 0 ]]; then
    echo "$BRAND_DETECTION" | jq -r '.brand_detection.detected_brands[] | "  - " + .'
fi

echo "📦 Products detected: $PRODUCT_COUNT"
if [[ "$PRODUCT_COUNT" -gt 0 ]]; then
    echo "$BRAND_DETECTION" | jq -r '.brand_detection.detected_products[] | "  - " + .'
fi

CONFIDENCE=$(echo "$BRAND_DETECTION" | jq -r '.quality_metrics.detection_confidence')
echo "🎯 Detection confidence: $CONFIDENCE"

# Suggestions
SUGGESTIONS=$(echo "$BRAND_DETECTION" | jq -r '.suggestions[]? // empty')
if [[ -n "$SUGGESTIONS" ]]; then
    echo ""
    echo "💡 Suggestions:"
    echo "$SUGGESTIONS" | while read -r suggestion; do
        echo "  - $suggestion"
    done
fi

echo ""
echo "🎉 Brand/product detection complete!"
echo ""
echo "📁 Generated Files:"
echo "  - $DETECTION_FILE (detection results)"
echo "  - $FRAMES_DIR/ (extracted frames)"
echo ""
echo "🔧 Integration Commands:"
echo "  # View detection results"
echo "  cat $DETECTION_FILE | jq '.brand_detection'"
echo ""
echo "  # Check quality metrics"
echo "  cat $DETECTION_FILE | jq '.quality_metrics'"
echo ""
echo "  # Ready for Evidence Pack integration"

# Cleanup frames (optional)
if [[ "${KEEP_FRAMES:-}" != "1" ]]; then
    rm -rf "$FRAMES_DIR"
    echo "🧹 Cleaned up temporary frames"
fi