#!/bin/bash
# Test Hook Genome Pipeline Integration
set -euo pipefail

echo "🧪 Hook Genome Pipeline Integration Test"
echo "======================================="

# Set Hook Genome environment variables
export VDP_SCHEMA_PATH="$PWD/schemas/vdp-vertex-hook.schema.json"
export HOOK_PROMPT_PATH="$PWD/prompts/hook_genome.ko.txt"

echo "📋 Environment Variables:"
echo "  VDP_SCHEMA_PATH: $VDP_SCHEMA_PATH"
echo "  HOOK_PROMPT_PATH: $HOOK_PROMPT_PATH"
echo ""

# Verify files exist
echo "🔍 File Verification:"
if [[ -f "$VDP_SCHEMA_PATH" ]]; then
  echo "  ✅ Hook schema found: $(stat -f%z "$VDP_SCHEMA_PATH") bytes"
else
  echo "  ❌ Hook schema not found: $VDP_SCHEMA_PATH"
  exit 1
fi

if [[ -f "$HOOK_PROMPT_PATH" ]]; then
  echo "  ✅ Hook prompt found: $(stat -f%z "$HOOK_PROMPT_PATH") bytes"
else
  echo "  ❌ Hook prompt not found: $HOOK_PROMPT_PATH"
  exit 1
fi

echo ""

# Test schema loading in oneshot pipeline
echo "📊 Testing Pipeline Schema Integration:"

# Mock the T2 extraction payload generation section
echo "  🔧 Testing payload generation..."
MOCK_VIDEO_ID="test123"
MOCK_UPLOAD_ID="test-upload-id"
MOCK_URL="https://www.youtube.com/shorts/test123"
RAW_BUCKET="tough-variety-raw"

# Load hook schema
if [[ -n "${VDP_SCHEMA_PATH:-}" ]] && [[ -f "${VDP_SCHEMA_PATH}" ]]; then
  echo "  ✅ Loading Hook Genome schema: $VDP_SCHEMA_PATH"
  HOOK_SCHEMA="$(cat "$VDP_SCHEMA_PATH")"
else
  echo "  ❌ Hook Genome schema not accessible"
  exit 1
fi

# Load hook prompt
if [[ -n "${HOOK_PROMPT_PATH:-}" ]] && [[ -f "${HOOK_PROMPT_PATH}" ]]; then
  echo "  ✅ Loading Hook Genome prompt: $HOOK_PROMPT_PATH"
  HOOK_PROMPT="$(cat "$HOOK_PROMPT_PATH")"
else
  echo "  ❌ Hook Genome prompt not accessible"
  exit 1
fi

# Generate test extraction payload
echo "  🛠️ Generating extraction payload..."
EXTRACTION_PAYLOAD=$(jq -n --arg gcs_uri "gs://${RAW_BUCKET}/raw/ingest/${MOCK_VIDEO_ID}.mp4" \
                        --arg upload_id "$MOCK_UPLOAD_ID" \
                        --arg source_url "$MOCK_URL" \
                        --arg hook_prompt "$HOOK_PROMPT" \
                        --argjson hook_schema "$HOOK_SCHEMA" \
'{
  "gcs_uri": $gcs_uri,
  "upload_id": $upload_id,
  "source_url": $source_url,
  "model": "gemini-2.5-pro",
  "structured_output": true,
  "hook_prompt": $hook_prompt,
  "response_schema": $hook_schema
}')

# Validate payload structure
echo "  ✅ Testing payload JSON structure..."
if echo "$EXTRACTION_PAYLOAD" | jq empty 2>/dev/null; then
  echo "  ✅ Payload JSON valid"
else
  echo "  ❌ Payload JSON invalid"
  exit 1
fi

# Check key fields
PAYLOAD_SIZE=$(echo "$EXTRACTION_PAYLOAD" | wc -c | xargs)
SCHEMA_SIZE=$(echo "$EXTRACTION_PAYLOAD" | jq '.response_schema' | wc -c | xargs)
PROMPT_SIZE=$(echo "$EXTRACTION_PAYLOAD" | jq -r '.hook_prompt' | wc -c | xargs)

echo "  📊 Payload Statistics:"
echo "    - Total payload: ${PAYLOAD_SIZE} bytes"
echo "    - Schema size: ${SCHEMA_SIZE} bytes" 
echo "    - Prompt size: ${PROMPT_SIZE} bytes"

# Verify hookGenome field is present in schema
if echo "$EXTRACTION_PAYLOAD" | jq -e '.response_schema.properties.overall_analysis.properties.hookGenome' >/dev/null 2>&1; then
  echo "  ✅ hookGenome field present in schema"
else
  echo "  ❌ hookGenome field missing from schema"
  exit 1
fi

echo ""
echo "🎉 Pipeline Integration Test Results:"
echo "  ✅ Environment variables configured"
echo "  ✅ Hook schema and prompt files accessible" 
echo "  ✅ Payload generation functional"
echo "  ✅ hookGenome field integrated"
echo "  ✅ JSON structure valid"
echo ""
echo "📌 Ready for production pipeline execution with:"
echo "  VDP_SCHEMA_PATH=\"\$PWD/schemas/vdp-vertex-hook.schema.json\" \\"
echo "  HOOK_PROMPT_PATH=\"\$PWD/prompts/hook_genome.ko.txt\" \\"
echo "  ./scripts/vdp-oneshot-pipeline.sh \"https://www.youtube.com/shorts/VIDEO_ID\""