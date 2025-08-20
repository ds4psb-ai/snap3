#!/bin/bash
# test-youtube-ingest.sh - YouTube 인제스트 테스트

TEST_URL="https://www.youtube.com/watch?v=f9Sa4dTGPqU"
CONTENT_ID="f9Sa4dTGPqU"

echo "🎥 YouTube Ingest Test"
echo "URL: $TEST_URL"
echo "Content ID: $CONTENT_ID"

RESPONSE=$(curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"youtube\",
    \"content_id\": \"$CONTENT_ID\",
    \"source_url\": \"$TEST_URL\",
    \"processing_options\": {
      \"force_full_pipeline\": true,
      \"hook_genome_analysis\": true,
      \"audio_fingerprint\": false,
      \"brand_detection\": false
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq

# Processing ID 추출 및 상태 모니터링
PROCESSING_ID=$(echo "$RESPONSE" | jq -r '.processing_id // empty')
if [[ -n "$PROCESSING_ID" ]]; then
  echo "Processing ID: $PROCESSING_ID"
  echo "Monitoring status..."
  ./scripts/monitor-processing.sh "$PROCESSING_ID"
fi