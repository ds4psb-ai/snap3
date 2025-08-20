#!/usr/bin/env bash
set -euo pipefail

# 🩹 Download Quality Hotfix Script
# Purpose: Enhanced download and repair for corrupted videos and missing audio
# Usage: ./download-quality-hotfix.sh [VIDEO_FILE|URL] [--analyze-only]

INPUT="${1:-}"
ANALYZE_ONLY="${2:-}"

if [[ -z "$INPUT" ]]; then
    echo "❌ Usage: $0 [VIDEO_FILE|URL] [--analyze-only]"
    echo ""
    echo "Modes:"
    echo "  1. Download & Fix: $0 'https://www.youtube.com/shorts/VIDEO_ID'"
    echo "  2. Repair Local:   $0 path/to/video.mp4"
    echo "  3. Analyze Only:   $0 path/to/video.mp4 --analyze-only"
    echo ""
    echo "Features:"
    echo "  - Enhanced yt-dlp download with audio guarantee"
    echo "  - Stream corruption detection and auto-recovery"
    echo "  - Silent audio track injection for missing audio"
    echo "  - Audio quality enhancement (codec, sample rate, bitrate)"
    echo "  - Duration correction for corrupted files"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🩹 Download Quality Hotfix${NC}"
echo "========================="

# Determine mode: URL download or local file repair
if [[ "$INPUT" =~ ^https?:// ]]; then
    MODE="download"
    URL="$INPUT"
    echo -e "🔧 Mode: Download & Fix"
    echo -e "📺 URL: $URL"
elif [[ -f "$INPUT" ]]; then
    MODE="repair"
    VIDEO_FILE="$INPUT"
    echo -e "🔧 Mode: Local File Repair"
    echo -e "📹 File: $VIDEO_FILE"
elif [[ "$INPUT" == gs://* ]]; then
    echo -e "${YELLOW}☁️ Cloud storage file detected - download first${NC}"
    echo -e "  Use: gsutil cp $INPUT . && $0 ./$(basename $INPUT)"
    exit 1
else
    echo -e "${RED}❌ Invalid input: $INPUT${NC}"
    echo "Must be either a YouTube URL or existing video file"
    exit 1
fi

echo -e "🎯 Analysis mode: ${ANALYZE_ONLY:-full-repair}"
echo ""

# Initialize tracking
ISSUES_FOUND=()
FIXES_APPLIED=()
BACKUP_FILE=""
NEEDS_REPAIR=false

# Check dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
MISSING_DEPS=()

# Check dependencies based on mode
if [[ "$MODE" == "download" ]] && ! command -v yt-dlp &> /dev/null; then
    MISSING_DEPS+=("yt-dlp")
fi

if ! command -v ffmpeg &> /dev/null; then
    MISSING_DEPS+=("ffmpeg")
fi

if ! command -v ffprobe &> /dev/null; then
    MISSING_DEPS+=("ffprobe")
fi

if ! command -v jq &> /dev/null; then
    MISSING_DEPS+=("jq")
fi

if ! command -v bc &> /dev/null; then
    MISSING_DEPS+=("bc")
fi

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    echo "📥 Install with: brew install ${MISSING_DEPS[*]}"
    exit 1
fi

echo -e "${GREEN}✅ All dependencies available${NC}"

echo ""

# Execute based on mode
if [[ "$MODE" == "download" ]]; then
    # 1. Download Phase
    echo -e "${BLUE}⬇️ Enhanced Download Phase${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Extract video ID
    echo -e "${YELLOW}📝 Extracting Video ID...${NC}"
    VIDEO_ID="$(yt-dlp --get-id "$URL")"
    echo -e "${GREEN}✅ Video ID: $VIDEO_ID${NC}"
    
    echo ""
    echo -e "${YELLOW}📋 Enhanced download strategy:${NC}"
    echo "  • bv*[vcodec!*=?]: Best video with explicit codec (avoids corruption)"
    echo "  • [height<=1080][fps<=60]: Limit to 1080p/60fps for compatibility"
    echo "  • +ba/b[height<=1080][fps<=60]: Best audio OR fallback with constraints"
    echo "  • --fragment-retries 999: Maximum retry resilience"
    echo "  • --postprocessor-args: Force proper encoding"
    echo ""
    
    # Enhanced download with multiple fallback strategies
    DOWNLOAD_SUCCESS=false
    
    # Strategy 1: Best quality with audio merge
    echo -e "${YELLOW}🔄 Attempting high-quality download with audio merge...${NC}"
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
      echo -e "${GREEN}✅ High-quality download successful${NC}"
    else
      echo -e "${YELLOW}⚠️ High-quality download failed, trying fallback...${NC}"
      
      # Strategy 2: Standard quality fallback
      if yt-dlp \
        -f "best[height<=720]" \
        --merge-output-format mp4 \
        -o "${VIDEO_ID}.%(ext)s" \
        "$URL" 2>/dev/null; then
        
        VIDEO_FILE="${VIDEO_ID}.mp4"
        DOWNLOAD_SUCCESS=true
        echo -e "${GREEN}✅ Standard quality download successful${NC}"
      else
        echo -e "${YELLOW}⚠️ Standard download failed, trying worst quality...${NC}"
        
        # Strategy 3: Any available format
        if yt-dlp \
          -f "worst" \
          -o "${VIDEO_ID}.%(ext)s" \
          "$URL" 2>/dev/null; then
          
          VIDEO_FILE=$(find . -name "${VIDEO_ID}.*" -not -name "*.json" | head -1)
          DOWNLOAD_SUCCESS=true
          echo -e "${GREEN}✅ Fallback download successful${NC}"
        fi
      fi
    fi
    
    if [[ "$DOWNLOAD_SUCCESS" != true ]]; then
        echo -e "${RED}❌ All download strategies failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}📹 Downloaded: $VIDEO_FILE${NC}"
    echo ""
fi

# 2. Stream Analysis Phase  
echo -e "${BLUE}🔍 Stream Analysis Phase${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# File validation
if [[ ! -f "$VIDEO_FILE" ]]; then
    echo -e "${RED}❌ Video file not found: $VIDEO_FILE${NC}"
    exit 1
fi

# File size check
FILE_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE" 2>/dev/null || echo "0")
if [[ "$FILE_SIZE" -lt 1024 ]]; then
    echo -e "${RED}❌ File too small (${FILE_SIZE} bytes) - likely corrupted${NC}"
    ISSUES_FOUND+=("corrupted_file")
    exit 1
fi

echo -e "${GREEN}✅ File size: $FILE_SIZE bytes${NC}"

# Get detailed stream information
echo -e "${YELLOW}📊 Running stream analysis...${NC}"
STREAM_INFO=$(ffprobe -v quiet -print_format json -show_streams -show_format "$VIDEO_FILE" 2>/dev/null || echo '{}')

if [[ "$STREAM_INFO" == '{}' ]]; then
    echo -e "${RED}❌ Failed to read video file - file may be corrupted${NC}"
    ISSUES_FOUND+=("corrupted_file")
    exit 1
fi

VIDEO_STREAMS=$(echo "$STREAM_INFO" | jq '[.streams[] | select(.codec_type=="video")] | length' 2>/dev/null || echo "0")
AUDIO_STREAMS=$(echo "$STREAM_INFO" | jq '[.streams[] | select(.codec_type=="audio")] | length' 2>/dev/null || echo "0")
DURATION=$(echo "$STREAM_INFO" | jq -r '.format.duration // "0"' 2>/dev/null || echo "0")

echo -e "  📹 Video streams: $VIDEO_STREAMS"
echo -e "  🎵 Audio streams: $AUDIO_STREAMS"
echo -e "  ⏱️ Duration: ${DURATION}s"

# 3. Issue Detection
echo -e "${YELLOW}🔍 Issue Detection:${NC}"

# Check 1: Missing audio stream
if [[ "$AUDIO_STREAMS" -eq 0 ]]; then
    echo -e "  ${RED}❌ No audio stream detected${NC}"
    ISSUES_FOUND+=("missing_audio")
    NEEDS_REPAIR=true
fi

# Check 2: Corrupted duration
if (( $(echo "$DURATION < 1" | bc -l) )); then
    echo -e "  ${RED}❌ Invalid duration detected${NC}"
    ISSUES_FOUND+=("invalid_duration")
    NEEDS_REPAIR=true
fi

# Check 3: Audio quality issues
if [[ "$AUDIO_STREAMS" -gt 0 ]]; then
    AUDIO_CODEC=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="audio") | .codec_name' | head -1)
    SAMPLE_RATE=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="audio") | .sample_rate' | head -1)
    BIT_RATE=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="audio") | .bit_rate // "0"' | head -1)
    
    echo -e "  📊 Audio codec: ${AUDIO_CODEC:-unknown}"
    echo -e "  📊 Sample rate: ${SAMPLE_RATE:-unknown}Hz"
    echo -e "  📊 Bit rate: ${BIT_RATE:-unknown}bps"
    
    if [[ "$AUDIO_CODEC" == "opus" ]] || [[ "$AUDIO_CODEC" == "vorbis" ]]; then
        echo -e "  ${YELLOW}⚠️ Suboptimal audio codec: $AUDIO_CODEC${NC}"
        ISSUES_FOUND+=("suboptimal_audio_codec")
        NEEDS_REPAIR=true
    fi
    
    if [[ -n "$SAMPLE_RATE" ]] && [[ "$SAMPLE_RATE" -lt 44100 ]]; then
        echo -e "  ${YELLOW}⚠️ Low sample rate: ${SAMPLE_RATE}Hz${NC}"
        ISSUES_FOUND+=("low_sample_rate")
        NEEDS_REPAIR=true
    fi
    
    if [[ -n "$BIT_RATE" ]] && [[ "$BIT_RATE" != "0" ]] && [[ "$BIT_RATE" -lt 128000 ]]; then
        echo -e "  ${YELLOW}⚠️ Low audio bitrate: ${BIT_RATE}bps${NC}"
        ISSUES_FOUND+=("low_bitrate")
        NEEDS_REPAIR=true
    fi
fi

# Check 4: Video quality issues
if [[ "$VIDEO_STREAMS" -gt 0 ]]; then
    VIDEO_CODEC=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="video") | .codec_name' | head -1)
    WIDTH=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="video") | .width' | head -1)
    HEIGHT=$(echo "$STREAM_INFO" | jq -r '.streams[] | select(.codec_type=="video") | .height' | head -1)
    
    echo -e "  📊 Video codec: ${VIDEO_CODEC:-unknown}"
    echo -e "  📊 Resolution: ${WIDTH:-unknown}x${HEIGHT:-unknown}"
    
    if [[ -n "$WIDTH" && -n "$HEIGHT" ]] && [[ "$WIDTH" -lt 640 ]] && [[ "$HEIGHT" -lt 480 ]]; then
        echo -e "  ${YELLOW}⚠️ Very low resolution: ${WIDTH}x${HEIGHT}${NC}"
        ISSUES_FOUND+=("low_resolution")
    fi
fi

echo ""

# 4. Analysis Summary
echo -e "${BLUE}📋 Analysis Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ${#ISSUES_FOUND[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ No quality issues detected${NC}"
    echo -e "📊 Video quality score: ${GREEN}95/100${NC}"
    
    if [[ "$ANALYZE_ONLY" == "--analyze-only" ]]; then
        exit 0
    fi
else
    echo -e "${YELLOW}⚠️ Found ${#ISSUES_FOUND[@]} quality issue(s):${NC}"
    for issue in "${ISSUES_FOUND[@]}"; do
        case "$issue" in
            "missing_audio") echo -e "  • ${RED}Missing audio stream${NC} - will add silent audio track" ;;
            "invalid_duration") echo -e "  • ${RED}Invalid duration${NC} - will attempt duration correction" ;;
            "suboptimal_audio_codec") echo -e "  • ${YELLOW}Suboptimal audio codec${NC} - will convert to AAC" ;;
            "low_sample_rate") echo -e "  • ${YELLOW}Low sample rate${NC} - will upsample to 44.1kHz" ;;
            "low_bitrate") echo -e "  • ${YELLOW}Low audio bitrate${NC} - will enhance to 128kbps" ;;
            "low_resolution") echo -e "  • ${YELLOW}Low resolution${NC} - recommend re-downloading if possible" ;;
        esac
    done
    echo ""
fi

# Analysis-only mode exit
if [[ "$ANALYZE_ONLY" == "--analyze-only" ]]; then
    echo -e "${BLUE}🔍 Analysis-only mode complete${NC}"
    echo "Quality Score: $((100 - ${#ISSUES_FOUND[@]} * 15))/100"
    echo ""
    echo "To apply fixes, run:"
    echo "  $0 $VIDEO_FILE"
    exit 0
fi

# 5. Repair Phase
if [[ "$NEEDS_REPAIR" == true ]]; then
    echo -e "${BLUE}🔧 Repair Phase${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Create backup
    BACKUP_FILE="${VIDEO_FILE%.mp4}_backup.mp4"
    echo -e "${YELLOW}💾 Creating backup: $BACKUP_FILE${NC}"
    cp "$VIDEO_FILE" "$BACKUP_FILE"
    
    # Build repair command
    REPAIRED_FILE="${VIDEO_FILE%.mp4}_repaired.mp4"
    FFMPEG_CMD="ffmpeg -y -i \"$VIDEO_FILE\""
    
    # Add silent audio if missing
    if [[ " ${ISSUES_FOUND[*]} " =~ " missing_audio " ]]; then
        echo -e "${YELLOW}🔇 Adding silent audio track...${NC}"
        FFMPEG_CMD="$FFMPEG_CMD -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100"
        FFMPEG_CMD="$FFMPEG_CMD -c:v copy -c:a aac -shortest"
        FIXES_APPLIED+=("silent_audio_added")
    else
        # Enhance existing audio
        AUDIO_FIXES=("aac")
        
        if [[ " ${ISSUES_FOUND[*]} " =~ " low_sample_rate " ]]; then
            AUDIO_FIXES+=("-ar" "44100")
        fi
        
        if [[ " ${ISSUES_FOUND[*]} " =~ " low_bitrate " ]]; then
            AUDIO_FIXES+=("-b:a" "128k")
        fi
        
        echo -e "${YELLOW}🎵 Enhancing audio quality...${NC}"
        FFMPEG_CMD="$FFMPEG_CMD -c:v copy -c:a ${AUDIO_FIXES[*]}"
        FIXES_APPLIED+=("audio_enhanced")
    fi
    
    # Add duration fix if needed
    if [[ " ${ISSUES_FOUND[*]} " =~ " invalid_duration " ]]; then
        echo -e "${YELLOW}⏱️ Fixing duration issues...${NC}"
        FFMPEG_CMD="$FFMPEG_CMD -avoid_negative_ts make_zero"
        FIXES_APPLIED+=("duration_fixed")
    fi
    
    FFMPEG_CMD="$FFMPEG_CMD \"$REPAIRED_FILE\""
    
    # Execute repair
    echo -e "${YELLOW}🛠️ Executing repair...${NC}"
    
    if eval "$FFMPEG_CMD" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Repair completed successfully${NC}"
        
        # Replace original with repaired
        mv "$REPAIRED_FILE" "$VIDEO_FILE"
        
        # Verify repair
        echo -e "${YELLOW}🔍 Verifying repair...${NC}"
        NEW_AUDIO_STREAMS=$(ffprobe -v quiet -select_streams a -show_entries stream=index -of csv=p=0 "$VIDEO_FILE" 2>/dev/null | wc -l | xargs)
        NEW_DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null || echo "0")
        
        echo -e "  📊 Audio streams after repair: $NEW_AUDIO_STREAMS"
        echo -e "  📊 Duration after repair: ${NEW_DURATION}s"
        
        if [[ "$NEW_AUDIO_STREAMS" -gt 0 ]]; then
            echo -e "  ${GREEN}✅ Audio verification: PASSED${NC}"
        else
            echo -e "  ${RED}❌ Audio verification: FAILED${NC}"
        fi
        
        if (( $(echo "$NEW_DURATION > 1" | bc -l) )); then
            echo -e "  ${GREEN}✅ Duration verification: PASSED${NC}"
        else
            echo -e "  ${RED}❌ Duration verification: FAILED${NC}"
        fi
        
    else
        echo -e "${RED}❌ Repair failed${NC}"
        echo -e "${YELLOW}🔄 Restoring from backup...${NC}"
        mv "$BACKUP_FILE" "$VIDEO_FILE"
        exit 1
    fi
    
    echo ""
fi

# 6. Final Summary
echo -e "${GREEN}🎉 Download Quality Hotfix Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📋 Summary:"
echo "  📹 File: $VIDEO_FILE"
echo "  📊 File size: $FILE_SIZE bytes"
echo "  🔍 Issues found: ${#ISSUES_FOUND[@]}"
echo "  🔧 Fixes applied: ${#FIXES_APPLIED[@]}"

if [[ ${#FIXES_APPLIED[@]} -gt 0 ]]; then
    echo "  ✅ Applied fixes:"
    for fix in "${FIXES_APPLIED[@]}"; do
        echo "    • $fix"
    done
fi

if [[ -n "$BACKUP_FILE" ]]; then
    echo "  💾 Backup saved: $BACKUP_FILE"
fi

FINAL_SCORE=$((100 - ${#ISSUES_FOUND[@]} * 10 + ${#FIXES_APPLIED[@]} * 15))
if [[ $FINAL_SCORE -gt 100 ]]; then
    FINAL_SCORE=100
fi

echo "  📊 Final quality score: ${FINAL_SCORE}/100"

if [[ $FINAL_SCORE -ge 90 ]]; then
    echo -e "${GREEN}🚀 Video ready for pipeline processing${NC}"
elif [[ $FINAL_SCORE -ge 70 ]]; then
    echo -e "${YELLOW}⚠️ Video has minor quality issues but is usable${NC}"
else
    echo -e "${RED}🚨 Video has significant quality issues - consider re-downloading${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Run quality check: npm run quality:check $VIDEO_FILE path/to/vdp.json"
echo "  2. Test with VDP pipeline: ./scripts/vdp-oneshot-pipeline.sh"
echo "  3. Integration: This method is integrated into vdp-oneshot-pipeline.sh"