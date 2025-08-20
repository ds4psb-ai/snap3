#!/bin/bash
# Validate Vertex AI Payload for Hook Genome Analysis
set -euo pipefail

PAYLOAD_FILE="${1:-scripts/tmp/vertex_req_retry.json}"

echo "🔍 Vertex AI Payload Validation Report"
echo "======================================"
echo "📄 Payload File: $PAYLOAD_FILE"
echo ""

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "❌ Payload file not found: $PAYLOAD_FILE"
  exit 1
fi

echo "🔧 A. 구조화 출력 설정 확인:"

# Check response_mime_type
MIME_TYPE=$(jq -r '.generationConfig.response_mime_type' "$PAYLOAD_FILE")
if [[ "$MIME_TYPE" == "application/json" ]]; then
  echo "  ✅ response_mime_type: $MIME_TYPE"
else
  echo "  ❌ response_mime_type: $MIME_TYPE (should be 'application/json')"
fi

# Check response_schema exists
HAS_SCHEMA=$(jq 'has("generationConfig") and (.generationConfig | has("response_schema"))' "$PAYLOAD_FILE")
if [[ "$HAS_SCHEMA" == "true" ]]; then
  echo "  ✅ response_schema: present"
else
  echo "  ❌ response_schema: missing"
fi

echo ""
echo "📹 B. 비디오 입력 형식 확인:"

# Check file_data URI
FILE_URI=$(jq -r '.contents[0].parts[0].file_data.file_uri // "null"' "$PAYLOAD_FILE")
if [[ "$FILE_URI" =~ ^gs:// ]]; then
  echo "  ✅ file_uri: $FILE_URI"
  echo "  ✅ format: Google Cloud Storage (공식 비디오 입력 방식)"
else
  echo "  ❌ file_uri: $FILE_URI (should start with 'gs://')"
fi

echo ""
echo "🎯 C. Hook Genome 스키마 확인:"

# Check hookGenome field exists in schema
HAS_HOOK_GENOME=$(jq 'has("generationConfig") and (.generationConfig.response_schema.properties.overall_analysis.properties | has("hookGenome"))' "$PAYLOAD_FILE")
if [[ "$HAS_HOOK_GENOME" == "true" ]]; then
  echo "  ✅ hookGenome: present in schema"
  
  # Check hookGenome field structure
  HOOK_FIELDS=$(jq -r '.generationConfig.response_schema.properties.overall_analysis.properties.hookGenome.properties | keys | join(", ")' "$PAYLOAD_FILE")
  echo "  ✅ hookGenome fields: $HOOK_FIELDS"
  
  # Verify required hook fields
  REQUIRED_FIELDS=("start_sec" "pattern_code" "delivery" "trigger_modalities" "microbeats_sec" "strength_score")
  MISSING_FIELDS=()
  
  for field in "${REQUIRED_FIELDS[@]}"; do
    HAS_FIELD=$(jq ".generationConfig.response_schema.properties.overall_analysis.properties.hookGenome.properties | has(\"$field\")" "$PAYLOAD_FILE")
    if [[ "$HAS_FIELD" != "true" ]]; then
      MISSING_FIELDS+=("$field")
    fi
  done
  
  if [[ ${#MISSING_FIELDS[@]} -eq 0 ]]; then
    echo "  ✅ All required hook fields present"
  else
    echo "  ❌ Missing hook fields: ${MISSING_FIELDS[*]}"
  fi
else
  echo "  ❌ hookGenome: missing from schema"
fi

echo ""
echo "📊 D. 페이로드 통계:"
PAYLOAD_SIZE=$(wc -c < "$PAYLOAD_FILE" | xargs)
SCHEMA_SIZE=$(jq '.generationConfig.response_schema' "$PAYLOAD_FILE" | wc -c | xargs)
echo "  📏 Total payload size: ${PAYLOAD_SIZE} bytes"
echo "  📏 Schema size: ${SCHEMA_SIZE} bytes"

echo ""
echo "📝 E. 검증 결과 요약:"

ISSUES=0

if [[ "$MIME_TYPE" != "application/json" ]]; then
  echo "  ❌ response_mime_type not set to application/json"
  ((ISSUES++))
fi

if [[ "$HAS_SCHEMA" != "true" ]]; then
  echo "  ❌ response_schema missing"
  ((ISSUES++))
fi

if [[ ! "$FILE_URI" =~ ^gs:// ]]; then
  echo "  ❌ file_uri not using GCS format"
  ((ISSUES++))
fi

if [[ "$HAS_HOOK_GENOME" != "true" ]]; then
  echo "  ❌ hookGenome field missing from schema"
  ((ISSUES++))
fi

if [[ ${#MISSING_FIELDS[@]} -gt 0 ]]; then
  echo "  ❌ Required hook fields missing: ${MISSING_FIELDS[*]}"
  ((ISSUES++))
fi

if [[ $ISSUES -eq 0 ]]; then
  echo "  🎉 All validations passed - payload ready for Hook Genome analysis"
  exit 0
else
  echo "  ⚠️ Found $ISSUES issues - please fix before proceeding"
  exit 1
fi