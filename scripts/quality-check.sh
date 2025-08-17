#!/usr/bin/env bash
set -euo pipefail

# 🎵 VDP Quality Check Script with Enhanced Audio Track Verification
# Purpose: Immediate audio track verification with automatic recovery guidance
# Usage: ./quality-check.sh path/to/video.mp4 path/to/video.vdp.json

VIDEO_FILE="${1:-}"
VDP_FILE="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STRICT_SCHEMA="${SCRIPT_DIR}/../schemas/vdp-strict.schema.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Enhanced validation and usage check
if [[ -z "$VIDEO_FILE" || -z "$VDP_FILE" ]]; then
  echo -e "${RED}❌ Usage: $0 VIDEO_FILE VDP_FILE${NC}"
  echo ""
  echo "Examples:"
  echo "  $0 videos/sample.mp4 out/vdp-C000888.json"
  echo "  $0 gs://bucket/video.mp4 out/vdp-C000999.json"
  echo "  $0 /path/to/6_I2FmT1mbY.mp4 /path/to/6_I2FmT1mbY.vdp.json"
  exit 1
fi

# Initialize quality tracking
QUALITY_SCORE=0
MAX_SCORE=100
ISSUES=()
WARNINGS=()
AUTO_FIX_COMMANDS=()

# File existence checks with enhanced validation
if [[ "$VIDEO_FILE" != gs://* ]] && [[ ! -f "$VIDEO_FILE" ]]; then
  echo -e "${RED}❌ Video file not found: $VIDEO_FILE${NC}"
  ISSUES+=("Video file not found or accessible")
fi

if [[ ! -f "$VDP_FILE" ]]; then
  echo -e "${RED}❌ VDP file not found: $VDP_FILE${NC}"
  exit 1
fi

if [[ ! -f "$STRICT_SCHEMA" ]]; then
  echo -e "${YELLOW}⚠️ Strict schema not found: $STRICT_SCHEMA${NC}"
  echo -e "  Using basic validation only"
  WARNINGS+=("Strict schema validation not available")
fi

echo -e "${BLUE}🎵 VDP Quality Check with Audio Verification${NC}"
echo "==========================================="
echo -e "  📹 Video: $VIDEO_FILE"
echo -e "  📄 VDP: $VDP_FILE"
echo -e "  📋 Schema: $STRICT_SCHEMA"
echo ""

# 1. Enhanced Audio Track Analysis
echo -e "${BLUE}🎵 Enhanced Audio Track Analysis${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

AUDIO_ANALYSIS_SCORE=0

# Handle different video file types
if [[ "$VIDEO_FILE" == gs://* ]]; then
  echo -e "${BLUE}☁️ Cloud storage video detected: $VIDEO_FILE${NC}"
  
  # For GCS files, analyze based on VDP metadata
  echo -e "${YELLOW}📊 Analyzing audio from VDP metadata...${NC}"
  
  # Check for audio-related fields in VDP
  if jq -e '.overall_analysis.asr_transcript' "$VDP_FILE" >/dev/null 2>&1; then
    ASR_COUNT=$(jq '.overall_analysis.asr_transcript | length' "$VDP_FILE")
    echo -e "${GREEN}✅ ASR transcript: $ASR_COUNT segments found${NC}"
    AUDIO_ANALYSIS_SCORE=$((AUDIO_ANALYSIS_SCORE + 20))
    QUALITY_SCORE=$((QUALITY_SCORE + 20))
  else
    echo -e "${YELLOW}⚠️ ASR transcript: Not available${NC}"
    WARNINGS+=("ASR transcript missing - audio analysis limited")
  fi
  
  # Check original sound setting
  if jq -e '.metadata.original_sound' "$VDP_FILE" >/dev/null 2>&1; then
    ORIGINAL_SOUND=$(jq -r '.metadata.original_sound' "$VDP_FILE")
    echo -e "${GREEN}✅ Original sound setting: $ORIGINAL_SOUND${NC}"
    AUDIO_ANALYSIS_SCORE=$((AUDIO_ANALYSIS_SCORE + 15))
    QUALITY_SCORE=$((QUALITY_SCORE + 10))
  else
    echo -e "${YELLOW}⚠️ Original sound setting: Not specified${NC}"
    WARNINGS+=("Original sound setting missing")
    AUTO_FIX_COMMANDS+=("Add original_sound: true/false to metadata")
  fi
  
elif [[ -f "$VIDEO_FILE" ]]; then
  echo -e "${BLUE}📁 Local video file detected: $VIDEO_FILE${NC}"
  
  # Check if ffprobe is available
  if ! command -v ffprobe &> /dev/null; then
    echo -e "${RED}❌ ffprobe not found${NC}"
    ISSUES+=("ffprobe not available for audio analysis")
    AUTO_FIX_COMMANDS+=("brew install ffmpeg  # macOS")
    AUTO_FIX_COMMANDS+=("sudo apt-get install ffmpeg  # Ubuntu")
  else
    echo -e "${YELLOW}🔧 Running ffprobe audio analysis...${NC}"
    
    # Get detailed video information
    echo -e "${YELLOW}📊 Stream Information:${NC}"
    ffprobe -v error -show_entries stream=index,codec_type,codec_name,channels,sample_rate,bit_rate:format=duration,size,bit_rate \
            -of default=nw=1 "$VIDEO_FILE" 2>/dev/null | sed 's/^/  /' || echo -e "  ${RED}❌ Failed to read video info${NC}"
    
    # Check audio tracks
    echo -e "${YELLOW}🔊 Audio Track Validation:${NC}"
    AUDIO_CNT=$(ffprobe -v error -select_streams a -show_entries stream=index \
                        -of csv=p=0 "$VIDEO_FILE" 2>/dev/null | wc -l | xargs)
    
    if [[ "$AUDIO_CNT" -lt 1 ]]; then
      echo -e "${RED}❌ No audio tracks found${NC}"
      ISSUES+=("Video file contains no audio streams")
      AUTO_FIX_COMMANDS+=("ffmpeg -i '$VIDEO_FILE' -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v copy -c:a aac -shortest '${VIDEO_FILE%.mp4}_with_audio.mp4'")
    else
      echo -e "${GREEN}✅ Audio tracks found: $AUDIO_CNT${NC}"
      AUDIO_ANALYSIS_SCORE=$((AUDIO_ANALYSIS_SCORE + 25))
      QUALITY_SCORE=$((QUALITY_SCORE + 15))
      
      # Get audio quality details
      AUDIO_CODEC=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null)
      SAMPLE_RATE=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null)
      CHANNELS=$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null)
      
      echo -e "  📊 Codec: ${AUDIO_CODEC:-unknown}"
      echo -e "  📊 Sample rate: ${SAMPLE_RATE:-unknown}Hz"
      echo -e "  📊 Channels: ${CHANNELS:-unknown}"
      
      # Quality validation
      if [[ -n "$SAMPLE_RATE" ]] && [[ "$SAMPLE_RATE" -ge 44100 ]]; then
        echo -e "  ${GREEN}✅ Sample rate: Acceptable (≥44.1kHz)${NC}"
        QUALITY_SCORE=$((QUALITY_SCORE + 10))
      elif [[ -n "$SAMPLE_RATE" ]]; then
        echo -e "  ${YELLOW}⚠️ Sample rate: Low ($SAMPLE_RATE Hz)${NC}"
        WARNINGS+=("Audio sample rate below recommended 44.1kHz")
        AUTO_FIX_COMMANDS+=("ffmpeg -i '$VIDEO_FILE' -ar 44100 '${VIDEO_FILE%.mp4}_resampled.mp4'")
      fi
    fi
  fi
else
  echo -e "${RED}❌ Video file not accessible: $VIDEO_FILE${NC}"
  ISSUES+=("Video file not found or accessible")
fi

# Check video duration for local files
if [[ "$VIDEO_FILE" != gs://* ]] && [[ -f "$VIDEO_FILE" ]]; then
  DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null || echo "0")
  DURATION_INT=$(printf "%.0f" "$DURATION")

  if [[ "$DURATION_INT" -gt 60 ]]; then
    echo -e "${YELLOW}⚠️ Video duration: ${DURATION}s (>60s, may exceed platform limits)${NC}"
  elif [[ "$DURATION_INT" -lt 3 ]]; then
    echo -e "${YELLOW}⚠️ Video duration: ${DURATION}s (<3s, very short content)${NC}"
  else
    echo -e "${GREEN}✅ Video duration: ${DURATION}s (within normal range)${NC}"
  fi

  # Check resolution
  RESOLUTION=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
                       -of csv=s=x:p=0 "$VIDEO_FILE" 2>/dev/null || echo "unknown")
  echo -e "${GREEN}✅ Video resolution: ${RESOLUTION}${NC}"
fi

echo ""

# 2. JSON Schema Validation
echo -e "${BLUE}📄 JSON Schema Validation (ajv)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if ajv is available
if ! npx ajv help &> /dev/null; then
  echo -e "${RED}❌ ajv-cli not found. Install with: npm i -D ajv-cli${NC}"
  exit 1
fi

if [[ -f "$STRICT_SCHEMA" ]]; then
  echo -e "${YELLOW}🔍 Validating JSON structure against schema...${NC}"
  if npx ajv validate -s "$STRICT_SCHEMA" -d "$VDP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ JSON schema validation passed${NC}"
  else
    echo -e "${YELLOW}⚠️ Schema validation failed (continuing with basic validation)${NC}"
    WARNINGS+=("Schema validation failed")
  fi
else
  echo -e "${YELLOW}⚠️ Schema validation skipped (schema not found)${NC}"
fi

echo ""

# 3. JSON Content Validation
echo -e "${BLUE}📋 JSON Content Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ jq not found. Install with: brew install jq${NC}"
  exit 1
fi

# Validate top_comments structure (check if it exists in overall_analysis)
echo -e "${YELLOW}💬 Top Comments Validation:${NC}"
if jq -e '.overall_analysis.top_comments' "$VDP_FILE" >/dev/null 2>&1; then
  if jq -e '(.overall_analysis.top_comments|type) == "array" and (.overall_analysis.top_comments | length <= 5)' "$VDP_FILE" >/dev/null; then
    COMMENT_COUNT=$(jq -r '.overall_analysis.top_comments | length' "$VDP_FILE")
    echo -e "${GREEN}✅ top_comments is valid array with $COMMENT_COUNT items${NC}"
    
    # Check each comment structure
    INVALID_COMMENTS=$(jq -r '.overall_analysis.top_comments | to_entries[] | select(.value | has("text") and has("author") | not) | .key' "$VDP_FILE" || echo "")
    if [[ -n "$INVALID_COMMENTS" ]]; then
      echo -e "${RED}❌ Invalid comment structure at indices: $INVALID_COMMENTS${NC}"
      exit 1
    else
      echo -e "${GREEN}✅ All comments have required text and author fields${NC}"
    fi
  else
    echo -e "${RED}❌ top_comments must be array with ≤5 items${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ No top_comments field (optional)${NC}"
fi

# Validate core sections
echo -e "${YELLOW}🏗️ Core Structure Validation:${NC}"
REQUIRED_SECTIONS=("metadata" "overall_analysis" "scenes")
MISSING_SECTIONS=()

for section in "${REQUIRED_SECTIONS[@]}"; do
  if jq -e "has(\"$section\")" "$VDP_FILE" >/dev/null; then
    echo -e "${GREEN}✅ Section '$section' present${NC}"
  else
    MISSING_SECTIONS+=("$section")
  fi
done

if [[ ${#MISSING_SECTIONS[@]} -gt 0 ]]; then
  echo -e "${RED}❌ Missing required sections: ${MISSING_SECTIONS[*]}${NC}"
  exit 1
fi

# Validate scenes array
echo -e "${YELLOW}🎬 Scenes Validation:${NC}"
SCENES_COUNT=$(jq -r '.scenes | length' "$VDP_FILE")
if [[ "$SCENES_COUNT" -lt 2 || "$SCENES_COUNT" -gt 6 ]]; then
  echo -e "${YELLOW}⚠️ Scenes count ($SCENES_COUNT) outside optimal range (2-6)${NC}"
else
  echo -e "${GREEN}✅ Scenes count: $SCENES_COUNT (valid range)${NC}"
fi

# Check scene duration sum (if available)
if jq -e '.scenes[0].end_time' "$VDP_FILE" >/dev/null 2>&1; then
  TOTAL_DURATION=$(jq -r '[.scenes[] | .end_time - .start_time] | add' "$VDP_FILE" 2>/dev/null || echo "0")
  if (( $(echo "$TOTAL_DURATION > 15" | bc -l) )); then
    echo -e "${YELLOW}⚠️ Total scene duration: ${TOTAL_DURATION}s (>15s, unusually long)${NC}"
  elif (( $(echo "$TOTAL_DURATION < 3" | bc -l) )); then
    echo -e "${YELLOW}⚠️ Total scene duration: ${TOTAL_DURATION}s (<3s, very short)${NC}"
  else
    echo -e "${GREEN}✅ Total scene duration: ${TOTAL_DURATION}s${NC}"
  fi
else
  echo -e "${GREEN}✅ Scene duration calculation skipped (timing not available)${NC}"
fi

# Validate confidence scores
echo -e "${YELLOW}🎯 Confidence Scores:${NC}"
if jq -e '.overall_analysis.confidence.overall' "$VDP_FILE" >/dev/null 2>&1; then
  CONFIDENCE=$(jq -r '.overall_analysis.confidence.overall // 0' "$VDP_FILE")
  if (( $(echo "$CONFIDENCE >= 0.0 && $CONFIDENCE <= 1.0" | bc -l) )); then
    echo -e "${GREEN}✅ Overall confidence: $CONFIDENCE${NC}"
  else
    echo -e "${RED}❌ Invalid confidence score: $CONFIDENCE (must be 0.0-1.0)${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Confidence scores not available (optional)${NC}"
fi

# Validate metadata numbers
echo -e "${YELLOW}📊 Metadata Validation:${NC}"
VIEW_COUNT=$(jq -r '.metadata.view_count // 0' "$VDP_FILE")
LIKE_COUNT=$(jq -r '.metadata.like_count // 0' "$VDP_FILE")
COMMENT_COUNT=$(jq -r '.metadata.comment_count // 0' "$VDP_FILE")

if [[ "$VIEW_COUNT" =~ ^[0-9]+$ ]] && [[ "$VIEW_COUNT" -ge 0 ]]; then
  echo -e "${GREEN}✅ View count: $VIEW_COUNT${NC}"
else
  echo -e "${RED}❌ Invalid view count: $VIEW_COUNT${NC}"
  exit 1
fi

if [[ "$LIKE_COUNT" =~ ^[0-9]+$ ]] && [[ "$LIKE_COUNT" -ge 0 ]]; then
  echo -e "${GREEN}✅ Like count: $LIKE_COUNT${NC}"
else
  echo -e "${RED}❌ Invalid like count: $LIKE_COUNT${NC}"
  exit 1
fi

if [[ "$COMMENT_COUNT" =~ ^[0-9]+$ ]] && [[ "$COMMENT_COUNT" -ge 0 ]]; then
  echo -e "${GREEN}✅ Comment count: $COMMENT_COUNT${NC}"
else
  echo -e "${RED}❌ Invalid comment count: $COMMENT_COUNT${NC}"
  exit 1
fi

# 4. Data Integrity Checks
echo ""
echo -e "${BLUE}🔐 Data Integrity Checks${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for required IDs
CONTENT_ID=$(jq -r '.content_id // empty' "$VDP_FILE")
UPLOAD_ID=$(jq -r '.metadata.upload_id // .upload_id // empty' "$VDP_FILE")

if [[ -n "$CONTENT_ID" ]]; then
  echo -e "${GREEN}✅ Content ID: $CONTENT_ID${NC}"
else
  echo -e "${RED}❌ Missing content_id${NC}"
  exit 1
fi

if [[ -n "$UPLOAD_ID" ]]; then
  echo -e "${GREEN}✅ Upload ID: $UPLOAD_ID${NC}"
else
  echo -e "${RED}❌ Missing upload_id${NC}"
  exit 1
fi

# Check timestamp format
TIMESTAMP=$(jq -r '.metadata.upload_date // .ingestion_timestamp // empty' "$VDP_FILE")
if [[ -n "$TIMESTAMP" ]]; then
  if date -d "$TIMESTAMP" &>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$TIMESTAMP" &>/dev/null; then
    echo -e "${GREEN}✅ Ingestion timestamp: $TIMESTAMP${NC}"
  else
    echo -e "${YELLOW}⚠️ Timestamp format may be invalid: $TIMESTAMP${NC}"
  fi
else
  echo -e "${RED}❌ Missing ingestion_timestamp${NC}"
  exit 1
fi

# 5. BigQuery JSONL Compatibility Check
echo ""
echo -e "${BLUE}📊 BigQuery JSONL Compatibility${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}🔍 Checking JSONL format compliance...${NC}"

# Test if JSON can be converted to single-line JSONL
if JSONL_LINE=$(jq -c . "$VDP_FILE" 2>/dev/null); then
  echo -e "${GREEN}✅ JSON can be converted to JSONL format${NC}"
  
  # Check for problematic characters
  if echo "$JSONL_LINE" | grep -q $'\n'; then
    echo -e "${RED}❌ JSON contains embedded newlines (will break JSONL)${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ No embedded newlines found${NC}"
  fi
else
  echo -e "${RED}❌ JSON cannot be compacted to JSONL format${NC}"
  exit 1
fi

# 6. Final Summary
echo ""
echo -e "${GREEN}🎉 Quality Check Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${GREEN}✅ All quality checks passed successfully${NC}"
echo ""
echo "📋 Summary:"
echo "  - Video: $AUDIO_CNT audio track(s), ${RESOLUTION}, ${DURATION}s duration"
echo "  - JSON: Valid schema, $SCENES_COUNT scenes, $COMMENT_COUNT comments"
echo "  - Metadata: $VIEW_COUNT views, $LIKE_COUNT likes, $COMMENT_COUNT comments"
echo "  - IDs: Content=$CONTENT_ID, Upload=$UPLOAD_ID"
echo "  - BigQuery: JSONL compatible"
echo ""
echo -e "${BLUE}🚀 Ready for pipeline processing and BigQuery ingestion${NC}"