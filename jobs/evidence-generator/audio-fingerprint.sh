#!/usr/bin/env bash
set -euo pipefail

# 🎵 Audio Fingerprint Generator
# Purpose: Extract audio fingerprints using ChromaPrint for Evidence Pack
# Usage: ./audio-fingerprint.sh VIDEO_FILE [OUTPUT_DIR]

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

echo "🎵 Audio Fingerprint Generator"
echo "============================="
echo "📁 Input: $VIDEO_FILE"
echo "📂 Output: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Extract filename without extension for naming
BASENAME=$(basename "$VIDEO_FILE" | sed 's/\.[^.]*$//')
AUDIO_FILE="${OUTPUT_DIR}/${BASENAME}_audio.wav"
FINGERPRINT_FILE="${OUTPUT_DIR}/${BASENAME}_fingerprint.json"

# Step 1: Extract audio from video
echo "🔊 Extracting audio from video..."
if ffmpeg -i "$VIDEO_FILE" -vn -acodec pcm_s16le -ar 22050 -ac 1 "$AUDIO_FILE" -y 2>/dev/null; then
    echo "✅ Audio extracted: $AUDIO_FILE"
    
    # Get audio info
    DURATION=$(ffmpeg -i "$AUDIO_FILE" 2>&1 | grep "Duration" | cut -d ' ' -f 4 | sed 's/,//')
    echo "⏱️ Duration: $DURATION"
else
    echo "❌ Failed to extract audio"
    exit 1
fi

echo ""

# Step 2: Generate ChromaPrint fingerprint
echo "🔍 Generating audio fingerprint..."
if fpcalc -json -length 30 "$AUDIO_FILE" > "$FINGERPRINT_FILE"; then
    echo "✅ Fingerprint generated: $FINGERPRINT_FILE"
    
    # Display fingerprint info
    echo ""
    echo "📊 Fingerprint Details:"
    cat "$FINGERPRINT_FILE" | jq '{duration, fingerprint: (.fingerprint | length | tostring + " hash points")}'
else
    echo "❌ Failed to generate fingerprint"
    exit 1
fi

echo ""

# Step 3: Create enhanced fingerprint with metadata
echo "📋 Creating enhanced fingerprint metadata..."

ENHANCED_FINGERPRINT=$(jq -n \
    --arg source_file "$VIDEO_FILE" \
    --arg audio_file "$AUDIO_FILE" \
    --arg basename "$BASENAME" \
    --arg extracted_at "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")" \
    --argjson fingerprint_data "$(cat "$FINGERPRINT_FILE")" \
    '{
        source_file: $source_file,
        audio_file: $audio_file, 
        basename: $basename,
        extracted_at: $extracted_at,
        audio_fingerprint: {
            duration: $fingerprint_data.duration,
            fingerprint: $fingerprint_data.fingerprint,
            hash_count: ($fingerprint_data.fingerprint | length),
            algorithm: "chromaprint",
            version: "1.5.1",
            sample_rate: 22050,
            channels: 1,
            analysis_length: 30
        },
        quality_metrics: {
            fingerprint_density: (($fingerprint_data.fingerprint | length) / $fingerprint_data.duration),
            audio_duration: $fingerprint_data.duration,
            extraction_success: true
        }
    }')

ENHANCED_FILE="${OUTPUT_DIR}/${BASENAME}_audio_evidence.json"
echo "$ENHANCED_FINGERPRINT" > "$ENHANCED_FILE"

echo "✅ Enhanced audio evidence: $ENHANCED_FILE"

# Step 4: Quality validation
echo ""
echo "🔍 Quality Validation:"
echo "======================"

# Check fingerprint quality
HASH_COUNT=$(cat "$FINGERPRINT_FILE" | jq '.fingerprint | length')
DURATION=$(cat "$FINGERPRINT_FILE" | jq '.duration')
DENSITY=$(echo "scale=2; $HASH_COUNT / $DURATION" | bc -l 2>/dev/null || echo "0")

echo "📈 Hash Count: $HASH_COUNT"
echo "⏱️ Duration: ${DURATION}s"
echo "📊 Density: ${DENSITY} hashes/sec"

if (( $(echo "$DENSITY > 1.0" | bc -l) )); then
    echo "🌟 Quality: High density fingerprint"
elif (( $(echo "$DENSITY > 0.5" | bc -l) )); then
    echo "✨ Quality: Good density fingerprint"
else
    echo "📝 Quality: Basic density fingerprint"
fi

# Check for potential issues
if (( $(echo "$DURATION < 5" | bc -l) )); then
    echo "⚠️ Warning: Very short audio duration"
fi

if [[ "$HASH_COUNT" -lt 10 ]]; then
    echo "⚠️ Warning: Low hash count - may affect matching accuracy"
fi

echo ""
echo "🎉 Audio fingerprint generation complete!"
echo ""
echo "📁 Generated Files:"
echo "  - $AUDIO_FILE (extracted audio)"
echo "  - $FINGERPRINT_FILE (raw ChromaPrint)"
echo "  - $ENHANCED_FILE (evidence-ready metadata)"
echo ""
echo "🔧 Integration Commands:"
echo "  # View fingerprint"
echo "  cat $ENHANCED_FILE | jq '.audio_fingerprint'"
echo ""
echo "  # Check quality metrics"
echo "  cat $ENHANCED_FILE | jq '.quality_metrics'"
echo ""
echo "  # Ready for Evidence Pack integration"

# Cleanup temporary audio file (optional)
if [[ "${KEEP_AUDIO:-}" != "1" ]]; then
    rm -f "$AUDIO_FILE"
    echo "🧹 Cleaned up temporary audio file"
fi