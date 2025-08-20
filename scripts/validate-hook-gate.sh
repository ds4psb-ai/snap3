#!/bin/bash
# Hook Gate Validation Script
# Validates VDP files for Hook Gate compliance (≤3s & ≥0.70)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage
usage() {
    echo -e "${BLUE}Hook Gate Validation Script${NC}"
    echo "==============================="
    echo ""
    echo "Usage: $0 <VDP_FILE_PATTERN>"
    echo ""
    echo "Examples:"
    echo "  $0 '/tmp/*.vdp.json'"
    echo "  $0 'out/hook/*.vdp.json'"
    echo "  $0 '*.vdp.json'"
    echo ""
    echo "Hook Gate Rules:"
    echo "  - start_sec ≤ 3.0 seconds"
    echo "  - strength_score ≥ 0.70"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

VDP_PATTERN="$1"

echo -e "${BLUE}🎯 Hook Gate Validation${NC}"
echo "========================"
echo -e "📁 Pattern: ${YELLOW}$VDP_PATTERN${NC}"
echo ""

# Count files
FILES=($(ls $VDP_PATTERN 2>/dev/null || true))
if [ ${#FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No VDP files found matching pattern: $VDP_PATTERN${NC}"
    exit 1
fi

echo -e "📊 Found ${#FILES[@]} VDP file(s) to validate"
echo ""

TOTAL_FILES=${#FILES[@]}
PASS_COUNT=0
FAIL_COUNT=0

# Validate each file
for file in "${FILES[@]}"; do
    echo -e "${YELLOW}🔍 Validating: $(basename "$file")${NC}"
    
    # Hook Gate validation using jq
    HOOK_RESULT=$(jq -r '{
        start_sec: .overall_analysis.hookGenome.start_sec,
        strength: .overall_analysis.hookGenome.strength_score,
        pattern_code: .overall_analysis.hookGenome.pattern_code,
        delivery: .overall_analysis.hookGenome.delivery,
        pass: (.overall_analysis.hookGenome.start_sec <= 3 and .overall_analysis.hookGenome.strength_score >= 0.70)
    }' "$file" 2>/dev/null || echo '{"error": "parsing_failed"}')
    
    # Check for parsing errors
    if echo "$HOOK_RESULT" | jq -e '.error' >/dev/null 2>&1; then
        echo -e "   ${RED}❌ JSON Parsing Failed${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi
    
    # Extract values
    START_SEC=$(echo "$HOOK_RESULT" | jq -r '.start_sec // "null"')
    STRENGTH=$(echo "$HOOK_RESULT" | jq -r '.strength // "null"')
    PATTERN_CODE=$(echo "$HOOK_RESULT" | jq -r '.pattern_code // "unknown"')
    DELIVERY=$(echo "$HOOK_RESULT" | jq -r '.delivery // "unknown"')
    HOOK_PASS=$(echo "$HOOK_RESULT" | jq -r '.pass // false')
    
    # Display results
    echo "   📊 Hook Analysis:"
    echo "      Start Time: ${START_SEC}s"
    echo "      Strength: $STRENGTH"
    echo "      Pattern: $PATTERN_CODE"
    echo "      Delivery: $DELIVERY"
    
    # Validation result
    if [ "$HOOK_PASS" = "true" ]; then
        echo -e "   ${GREEN}✅ Hook Gate PASSED${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "   ${RED}❌ Hook Gate FAILED${NC}"
        
        # Detailed failure reasons
        if [ "$START_SEC" != "null" ] && [ "$STRENGTH" != "null" ]; then
            if (( $(echo "$START_SEC > 3" | bc -l) )); then
                echo -e "      ${RED}⚠️  Start time exceeds 3.0s limit${NC}"
            fi
            if (( $(echo "$STRENGTH < 0.70" | bc -l) )); then
                echo -e "      ${RED}⚠️  Strength score below 0.70 threshold${NC}"
            fi
        else
            echo -e "      ${RED}⚠️  Missing required hookGenome fields${NC}"
        fi
        
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    echo ""
done

# Summary
echo -e "${BLUE}📋 Hook Gate Validation Summary${NC}"
echo "================================"
echo -e "📁 Total Files: $TOTAL_FILES"
echo -e "${GREEN}✅ Passed: $PASS_COUNT${NC}"
echo -e "${RED}❌ Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All files passed Hook Gate validation!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some files failed Hook Gate validation${NC}"
    exit 1
fi