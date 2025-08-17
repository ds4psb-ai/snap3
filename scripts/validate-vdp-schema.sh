#!/bin/bash
# VDP Schema Validation Script using AJV
# Validates VDP JSON files against the official schema

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCHEMA_FILE="vdp.schema.json"

# Usage
usage() {
    echo -e "${BLUE}VDP Schema Validation Script${NC}"
    echo "============================"
    echo ""
    echo "Usage: $0 <VDP_FILE_PATTERN>"
    echo ""
    echo "Examples:"
    echo "  $0 '/tmp/*.vdp.json'"
    echo "  $0 'out/hook/*.vdp.json'"
    echo "  $0 'test_file.vdp.json'"
    echo ""
    echo "Schema: $SCHEMA_FILE"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

VDP_PATTERN="$1"

echo -e "${BLUE}📋 VDP Schema Validation${NC}"
echo "========================"
echo -e "📁 Pattern: ${YELLOW}$VDP_PATTERN${NC}"
echo -e "📄 Schema: ${YELLOW}$SCHEMA_FILE${NC}"
echo ""

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    echo -e "${YELLOW}💡 Run from project root or ensure vdp.schema.json exists${NC}"
    exit 1
fi

# Check if AJV CLI is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js and npm${NC}"
    exit 1
fi

# Count files
FILES=($(ls $VDP_PATTERN 2>/dev/null || true))
if [ ${#FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No VDP files found matching pattern: $VDP_PATTERN${NC}"
    exit 1
fi

echo -e "📊 Found ${#FILES[@]} VDP file(s) to validate"
echo ""

# Individual file validation for detailed reporting
TOTAL_FILES=${#FILES[@]}
VALID_COUNT=0
INVALID_COUNT=0

for file in "${FILES[@]}"; do
    echo -e "${YELLOW}🔍 Validating: $(basename "$file")${NC}"
    
    # Run AJV validation and capture output
    if npx ajv-cli validate -s "$SCHEMA_FILE" -d "$file" --spec=draft2020 2>/dev/null; then
        echo -e "   ${GREEN}✅ Schema Valid${NC}"
        VALID_COUNT=$((VALID_COUNT + 1))
    else
        echo -e "   ${RED}❌ Schema Invalid${NC}"
        
        # Get detailed validation errors
        echo -e "   ${YELLOW}📋 Validation Errors:${NC}"
        npx ajv-cli validate -s "$SCHEMA_FILE" -d "$file" --spec=draft2020 2>&1 | \
        sed 's/^/      /' | head -10
        
        INVALID_COUNT=$((INVALID_COUNT + 1))
    fi
    echo ""
done

# Batch validation summary
echo -e "${BLUE}🚀 Running Batch Schema Validation${NC}"
echo "===================================="

if npx ajv-cli validate -s "$SCHEMA_FILE" -d "$VDP_PATTERN" --spec=draft2020 2>/dev/null; then
    echo -e "${GREEN}✅ All files passed batch validation${NC}"
else
    echo -e "${RED}❌ Some files failed batch validation${NC}"
fi

echo ""

# Final Summary
echo -e "${BLUE}📋 Schema Validation Summary${NC}"
echo "============================="
echo -e "📁 Total Files: $TOTAL_FILES"
echo -e "${GREEN}✅ Valid: $VALID_COUNT${NC}"
echo -e "${RED}❌ Invalid: $INVALID_COUNT${NC}"

if [ $INVALID_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All files passed schema validation!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some files failed schema validation${NC}"
    echo -e "${YELLOW}💡 Check individual file errors above for details${NC}"
    exit 1
fi