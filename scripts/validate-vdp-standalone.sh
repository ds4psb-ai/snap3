#!/usr/bin/env bash
set -euo pipefail

# 🔍 Standalone VDP Validation Script
# Purpose: Validate existing VDP files without requiring video files
# Usage: ./validate-vdp-standalone.sh <vdp.json> [<vdp2.json> ...]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCHEMA="schemas/vdp.schema.json"

# Usage check
if [[ $# -eq 0 ]]; then
  echo -e "${RED}❌ Usage: $0 <vdp.json> [<vdp2.json> ...]${NC}"
  echo ""
  echo "Examples:"
  echo "  $0 video.vdp.json"
  echo "  $0 *.vdp.json"
  echo "  $0 /path/to/vdp-files/*.json"
  exit 1
fi

# Check schema exists
if [[ ! -f "$SCHEMA" ]]; then
  echo -e "${RED}❌ Schema file not found: $SCHEMA${NC}"
  exit 1
fi

# Validation function for single file
validate_single_file() {
  local json_file="$1"
  local file_index="$2"
  local total_files="$3"
  
  echo -e "${BLUE}📄 [$file_index/$total_files] Validating: $(basename "$json_file")${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # File existence check
  if [[ ! -f "$json_file" ]]; then
    echo -e "${RED}❌ File not found: $json_file${NC}"
    return 1
  fi
  
  # JSON syntax check
  if ! jq empty "$json_file" 2>/dev/null; then
    echo -e "${RED}❌ Invalid JSON syntax${NC}"
    return 1
  fi
  
  # Schema validation
  echo -e "${YELLOW}🔍 Schema validation...${NC}"
  if npx ajv -s "$SCHEMA" -d "$json_file" --strict=false --errors=text; then
    echo -e "${GREEN}✅ Schema validation passed${NC}"
  else
    echo -e "${RED}❌ Schema validation failed${NC}"
    return 1
  fi
  
  # Content validation
  echo -e "${YELLOW}📋 Content validation...${NC}"
  
  # Top comments check
  if jq -e '(.top_comments|type) == "array" and (.top_comments | length <= 5)' "$json_file" >/dev/null; then
    local comment_count
    comment_count=$(jq -r '.top_comments | length' "$json_file")
    echo -e "${GREEN}✅ top_comments: $comment_count items${NC}"
  else
    echo -e "${RED}❌ Invalid top_comments structure${NC}"
    return 1
  fi
  
  # Core sections check
  local required_sections=("metadata" "overall_analysis" "scenes")
  for section in "${required_sections[@]}"; do
    if jq -e "has(\"$section\")" "$json_file" >/dev/null; then
      echo -e "${GREEN}✅ Section '$section' present${NC}"
    else
      echo -e "${RED}❌ Missing section: $section${NC}"
      return 1
    fi
  done
  
  # Scenes validation
  local scenes_count
  scenes_count=$(jq -r '.scenes | length' "$json_file")
  if [[ "$scenes_count" -ge 2 && "$scenes_count" -le 4 ]]; then
    echo -e "${GREEN}✅ Scenes count: $scenes_count${NC}"
  else
    echo -e "${RED}❌ Invalid scenes count: $scenes_count (must be 2-4)${NC}"
    return 1
  fi
  
  # Confidence validation
  local confidence
  confidence=$(jq -r '.overall_analysis.confidence // 0' "$json_file")
  if (( $(echo "$confidence >= 0.0 && $confidence <= 1.0" | bc -l) )); then
    echo -e "${GREEN}✅ Confidence: $confidence${NC}"
  else
    echo -e "${RED}❌ Invalid confidence: $confidence${NC}"
    return 1
  fi
  
  # IDs validation
  local content_id upload_id
  content_id=$(jq -r '.content_id // empty' "$json_file")
  upload_id=$(jq -r '.upload_id // empty' "$json_file")
  
  if [[ -n "$content_id" ]]; then
    echo -e "${GREEN}✅ Content ID: $content_id${NC}"
  else
    echo -e "${RED}❌ Missing content_id${NC}"
    return 1
  fi
  
  if [[ -n "$upload_id" ]]; then
    echo -e "${GREEN}✅ Upload ID: $upload_id${NC}"
  else
    echo -e "${RED}❌ Missing upload_id${NC}"
    return 1
  fi
  
  # JSONL compatibility
  if jq -c . "$json_file" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ JSONL compatible${NC}"
  else
    echo -e "${RED}❌ JSONL conversion failed${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ File validation complete${NC}"
  echo ""
  return 0
}

# Main validation loop
echo -e "${BLUE}🚀 Starting VDP Batch Validation${NC}"
echo -e "Files to validate: $#"
echo ""

total_files=$#
success_count=0
failure_count=0
failed_files=()

for ((i=1; i<=total_files; i++)); do
  json_file="${!i}"
  
  if validate_single_file "$json_file" "$i" "$total_files"; then
    ((success_count++))
  else
    ((failure_count++))
    failed_files+=("$json_file")
  fi
done

# Final summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "Total files: $total_files"
echo -e "${GREEN}Successful: $success_count${NC}"
echo -e "${RED}Failed: $failure_count${NC}"

if [[ ${#failed_files[@]} -gt 0 ]]; then
  echo ""
  echo -e "${RED}❌ Failed files:${NC}"
  for file in "${failed_files[@]}"; do
    echo -e "  - $file"
  done
fi

echo ""

if [[ $failure_count -eq 0 ]]; then
  echo -e "${GREEN}🎉 All files passed validation!${NC}"
  echo -e "${BLUE}🚀 Ready for BigQuery ingestion${NC}"
  exit 0
else
  echo -e "${RED}❌ Some files failed validation${NC}"
  echo -e "${YELLOW}🔧 Fix the issues above before proceeding${NC}"
  exit 1
fi