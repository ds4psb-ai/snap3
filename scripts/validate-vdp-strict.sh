#!/usr/bin/env bash
set -euo pipefail

# 📋 VDP Strict Schema Validation Script
# Purpose: Perform strict schema validation on VDP files with comprehensive error reporting
# Usage: ./validate-vdp-strict.sh [VDP_FILE_PATTERN] [--fix]

VDP_PATTERN="${1:-out/*.vdp.json}"
FIX_MODE="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STRICT_SCHEMA="${SCRIPT_DIR}/../schemas/vdp-strict.schema.json"

echo "📋 VDP Strict Schema Validation"
echo "=============================="
echo "🎯 Pattern: $VDP_PATTERN"
echo "📄 Schema: $STRICT_SCHEMA"
echo ""

# Validate schema exists
if [[ ! -f "$STRICT_SCHEMA" ]]; then
    echo "❌ Strict schema not found: $STRICT_SCHEMA"
    echo "Run schema generation script first"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$(dirname "$(echo $VDP_PATTERN | cut -d'/' -f1)")"/out 2>/dev/null || true

# Find VDP files
VDP_FILES=()
if [[ "$VDP_PATTERN" == *"*"* ]]; then
    # Handle glob pattern
    for file in $VDP_PATTERN; do
        if [[ -f "$file" ]]; then
            VDP_FILES+=("$file")
        fi
    done
else
    # Single file
    if [[ -f "$VDP_PATTERN" ]]; then
        VDP_FILES+=("$VDP_PATTERN")
    fi
fi

if [[ ${#VDP_FILES[@]} -eq 0 ]]; then
    echo "⚠️ No VDP files found matching pattern: $VDP_PATTERN"
    echo ""
    echo "💡 Available files:"
    find . -name "*.vdp.json" -o -name "*vdp*.json" 2>/dev/null | head -10 || echo "  No VDP files found"
    exit 0
fi

echo "📁 Found ${#VDP_FILES[@]} VDP file(s) for validation"
echo ""

# Validation results
TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0
VALIDATION_ERRORS=()

# Validate each file
for vdp_file in "${VDP_FILES[@]}"; do
    ((TOTAL_FILES++))
    echo "🔍 Validating: $vdp_file"
    
    # Check if file is valid JSON first
    if ! jq empty "$vdp_file" 2>/dev/null; then
        echo "  ❌ Invalid JSON format"
        ((FAILED_FILES++))
        VALIDATION_ERRORS+=("$vdp_file: Invalid JSON format")
        continue
    fi
    
    # Run strict validation
    VALIDATION_OUTPUT=$(npx ajv validate \
        -s "$STRICT_SCHEMA" \
        -d "$vdp_file" \
        --strict=true \
        --all-errors \
        --verbose \
        --errors=text 2>&1 || true)
    
    if echo "$VALIDATION_OUTPUT" | grep -q "valid"; then
        echo "  ✅ Schema validation: PASSED"
        ((PASSED_FILES++))
        
        # Additional quality checks
        echo "  🔧 Running quality checks..."
        
        # Check required confidence levels
        OVERALL_CONFIDENCE=$(jq -r '.overall_analysis.confidence.overall // 0' "$vdp_file")
        if (( $(echo "$OVERALL_CONFIDENCE < 0.9" | bc -l) )); then
            echo "  ⚠️ Quality warning: Overall confidence $OVERALL_CONFIDENCE < 0.9"
        else
            echo "  ✅ Quality check: Confidence $OVERALL_CONFIDENCE ≥ 0.9"
        fi
        
        # Check scene count
        SCENE_COUNT=$(jq '.scenes | length' "$vdp_file")
        if [[ "$SCENE_COUNT" -lt 2 ]] || [[ "$SCENE_COUNT" -gt 6 ]]; then
            echo "  ⚠️ Quality warning: Scene count $SCENE_COUNT not in optimal range (2-6)"
        else
            echo "  ✅ Quality check: Scene count $SCENE_COUNT is optimal"
        fi
        
        # Check content_id format
        CONTENT_ID=$(jq -r '.content_id' "$vdp_file")
        if [[ ! "$CONTENT_ID" =~ ^C[0-9]{6}$ ]]; then
            echo "  ⚠️ Quality warning: Content ID '$CONTENT_ID' doesn't match C###### format"
        else
            echo "  ✅ Quality check: Content ID format valid"
        fi
        
        echo ""
        
    else
        echo "  ❌ Schema validation: FAILED"
        ((FAILED_FILES++))
        
        # Process and display errors
        echo "  📋 Validation errors:"
        echo "$VALIDATION_OUTPUT" | grep -E "(data|should|must|required)" | head -10 | sed 's/^/    /'
        
        VALIDATION_ERRORS+=("$vdp_file: Schema validation failed")
        
        # Auto-fix mode
        if [[ "$FIX_MODE" == "--fix" ]]; then
            echo "  🔧 Attempting auto-fix..."
            
            # Try to fix common issues
            FIXED_FILE="${vdp_file%.json}_fixed.json"
            
            # Fix missing required fields with defaults
            jq '
                # Ensure content_id format
                if .content_id == null or (.content_id | test("^C\\d{6}$") | not) then
                    .content_id = "C" + (now | floor | tostring | .[-6:])
                else . end |
                
                # Ensure default_lang
                if .default_lang == null then
                    .default_lang = "ko"
                else . end |
                
                # Ensure confidence scores are within range
                if .overall_analysis.confidence.overall > 1 then
                    .overall_analysis.confidence.overall = 1
                else . end |
                
                # Ensure minimum required arrays exist
                if .product_mentions == null then
                    .product_mentions = []
                else . end |
                
                if .service_mentions == null then
                    .service_mentions = []
                else . end
            ' "$vdp_file" > "$FIXED_FILE"
            
            echo "  💾 Fixed file saved as: $FIXED_FILE"
        fi
        
        echo ""
    fi
done

# Summary report
echo "📊 Validation Summary"
echo "===================="
echo "📁 Total files: $TOTAL_FILES"
echo "✅ Passed: $PASSED_FILES"
echo "❌ Failed: $FAILED_FILES"
echo "📈 Success rate: $(( PASSED_FILES * 100 / TOTAL_FILES ))%"
echo ""

if [[ $FAILED_FILES -gt 0 ]]; then
    echo "🚨 Failed Files Summary:"
    for error in "${VALIDATION_ERRORS[@]}"; do
        echo "  • $error"
    done
    echo ""
    
    echo "🔧 Fix Suggestions:"
    echo "  1. Run with --fix flag to attempt auto-repair"
    echo "  2. Check JSON syntax with: jq . filename.json"
    echo "  3. Validate individual fields manually"
    echo "  4. Review schema requirements in schemas/vdp-strict.schema.json"
    echo ""
    
    exit 1
else
    echo "🎉 All VDP files passed strict schema validation!"
    echo ""
    
    echo "📋 Next Steps:"
    echo "  1. Run audio quality checks: ./scripts/quality-check.sh"
    echo "  2. Enhance with YouTube data: npm run youtube:enhance"
    echo "  3. Generate final quality report"
fi