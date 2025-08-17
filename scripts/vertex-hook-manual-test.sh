#!/bin/bash
# Manual Vertex AI Hook Test with Error Recovery
set -euo pipefail

PROJECT_ID="tough-variety-466003-c5"
LOCATION="us-west1"
MODEL_ID="gemini-2.5-pro"
GCS_URI="${GCS_URI:-gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4}"

echo "🔧 Manual Vertex AI Hook Test..."
echo "📹 Video: $GCS_URI"
echo "🧠 Model: $MODEL_ID @ $LOCATION"

# Check if service agent provisioning is still in progress
ACCESS_TOKEN="$(gcloud auth print-access-token)"
ENDPOINT="https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models/$MODEL_ID:generateContent"

# Load schema and prompt
SCHEMA_JSON="$(cat schemas/vdp-vertex-hook.schema.json)"
PROMPT_TEXT="$(cat prompts/hook_genome.ko.txt)"

# Create simplified test request without file_data (text-only test)
jq -n --argjson schema "$SCHEMA_JSON" --arg p "$PROMPT_TEXT" '{
  contents: [{
    role: "user",
    parts: [
      { text: "이 텍스트 프롬프트를 기반으로 hookGenome 스키마를 채우는 샘플 JSON을 생성해 주세요. 실제 비디오가 없으므로 예제 데이터로 채워주세요.\n\n" + $p }
    ]
  }],
  generationConfig: {
    response_mime_type: "application/json",
    response_schema: $schema,
    temperature: 0.2
  }
}' > scripts/tmp/vertex_manual_req.json

echo "📤 Text-only hook schema test (no video)..."
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @scripts/tmp/vertex_manual_req.json \
  > scripts/tmp/vertex_manual_res.json

echo "📊 Response received:"
cat scripts/tmp/vertex_manual_res.json | jq .

# Extract response content if successful
if jq -e '.candidates[0].content.parts[0].text' scripts/tmp/vertex_manual_res.json >/dev/null 2>&1; then
  echo "✅ Extracting generated VDP JSON..."
  jq -r '.candidates[0].content.parts[0].text' scripts/tmp/vertex_manual_res.json > out/hook/manual-test.vdp.json
  
  echo "🔍 Validating generated JSON..."
  if jq empty out/hook/manual-test.vdp.json 2>/dev/null; then
    echo "✅ Valid JSON generated"
    echo "📋 hookGenome content:"
    jq '.overall_analysis.hookGenome' out/hook/manual-test.vdp.json
  else
    echo "❌ Invalid JSON generated"
  fi
else
  echo "❌ No valid response content found"
fi