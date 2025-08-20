#!/bin/bash
# VDP Schema Backfill Utility
# Converts legacy VDP format (hookSec) to new format (hookGenome)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Usage
usage() {
    echo -e "${CYAN}VDP Schema Backfill Utility${NC}"
    echo "==========================="
    echo ""
    echo "Converts legacy VDP format to new hookGenome format"
    echo ""
    echo "Usage: $0 <input_pattern> [output_directory]"
    echo ""
    echo "Examples:"
    echo "  $0 'legacy/*.vdp.json'"
    echo "  $0 'old_vdp/*.json' 'backfilled/'"
    echo "  $0 'single_file.vdp.json'"
    echo ""
    echo "Conversion:"
    echo "  Legacy: overall_analysis.hookSec"
    echo "  New:    overall_analysis.hookGenome"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

INPUT_PATTERN="$1"
OUTPUT_DIR="${2:-.}"  # Default to current directory

echo -e "${CYAN}🔄 VDP Schema Backfill Utility${NC}"
echo "==============================="
echo -e "📁 Input Pattern: ${YELLOW}$INPUT_PATTERN${NC}"
echo -e "📂 Output Directory: ${YELLOW}$OUTPUT_DIR${NC}"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Count input files
FILES=($(ls $INPUT_PATTERN 2>/dev/null || true))
if [ ${#FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No files found matching pattern: $INPUT_PATTERN${NC}"
    exit 1
fi

echo -e "📊 Found ${#FILES[@]} file(s) to process"
echo ""

TOTAL_FILES=${#FILES[@]}
CONVERTED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

# Backfill conversion jq script
BACKFILL_JQ='
if .overall_analysis and .overall_analysis.hookSec and (.overall_analysis.hookGenome | not)
then 
    .overall_analysis.hookGenome = {
        pattern_code: "UNKNOWN",
        delivery: "unknown", 
        trigger_modalities: [],
        start_sec: (.overall_analysis.hookSec),
        strength_score: 0.70,
        microbeats_sec: []
    } |
    .overall_analysis |= del(.hookSec)
else . 
end'

# Process each file
for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    output_file="$OUTPUT_DIR/${filename%.json}.patched.vdp.json"
    
    echo -e "${YELLOW}🔧 Processing: $filename${NC}"
    
    # Check if file has legacy format
    HAS_LEGACY=$(jq -r 'if .overall_analysis.hookSec then "true" else "false" end' "$file" 2>/dev/null || echo "false")
    HAS_NEW=$(jq -r 'if .overall_analysis.hookGenome then "true" else "false" end' "$file" 2>/dev/null || echo "false")
    
    if [ "$HAS_LEGACY" = "false" ] && [ "$HAS_NEW" = "true" ]; then
        echo -e "   ${GREEN}✅ Already in new format, skipping${NC}"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        continue
    fi
    
    if [ "$HAS_LEGACY" = "false" ] && [ "$HAS_NEW" = "false" ]; then
        echo -e "   ${YELLOW}⚠️  No hookSec or hookGenome found, creating default${NC}"
    fi
    
    # Perform backfill conversion
    if jq "$BACKFILL_JQ" "$file" > "$output_file" 2>/dev/null; then
        # Verify conversion worked
        NEW_HAS_GENOME=$(jq -r 'if .overall_analysis.hookGenome then "true" else "false" end' "$output_file" 2>/dev/null || echo "false")
        
        if [ "$NEW_HAS_GENOME" = "true" ]; then
            echo -e "   ${GREEN}✅ Converted successfully${NC}"
            
            # Show conversion details
            START_SEC=$(jq -r '.overall_analysis.hookGenome.start_sec // "N/A"' "$output_file")
            STRENGTH=$(jq -r '.overall_analysis.hookGenome.strength_score // "N/A"' "$output_file")
            echo -e "      🎯 start_sec: $START_SEC"
            echo -e "      💪 strength_score: $STRENGTH"
            
            CONVERTED_COUNT=$((CONVERTED_COUNT + 1))
        else
            echo -e "   ${RED}❌ Conversion failed - no hookGenome in output${NC}"
            rm -f "$output_file"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    else
        echo -e "   ${RED}❌ JSON processing error${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    echo ""
done

# Summary
echo -e "${CYAN}📋 Backfill Summary${NC}"
echo "==================="
echo -e "📁 Total Files: $TOTAL_FILES"
echo -e "${GREEN}✅ Converted: $CONVERTED_COUNT${NC}"
echo -e "${YELLOW}⏭️  Skipped: $SKIPPED_COUNT${NC}"
echo -e "${RED}❌ Errors: $ERROR_COUNT${NC}"
echo ""

if [ $CONVERTED_COUNT -gt 0 ]; then
    echo -e "${GREEN}🎉 Backfill completed successfully!${NC}"
    echo -e "📂 Converted files saved in: ${YELLOW}$OUTPUT_DIR${NC}"
    echo -e "📄 Files have '.patched.vdp.json' extension"
fi

if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}⚠️  Some files had conversion errors${NC}"
    exit 1
else
    exit 0
fi