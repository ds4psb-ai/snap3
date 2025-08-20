#!/bin/bash
# test-social-ingest.sh - Instagram/TikTok 인제스트 테스트

PLATFORM=${1:-instagram}
CONTENT_ID="test_${PLATFORM}_$(date +%s)"
GCS_URI="gs://tough-variety-raw/uploads/$PLATFORM/$CONTENT_ID.mp4"

echo "📱 $PLATFORM Ingest Test"
echo "Content ID: $CONTENT_ID"
echo "GCS URI: $GCS_URI"

# 테스트 파일이 GCS에 존재하는지 확인
if gsutil stat "$GCS_URI" >/dev/null 2>&1; then
  echo "✅ Test file exists in GCS"
else
  echo "⚠️ Test file not found, creating dummy file..."
  echo "dummy content" | gsutil cp - "$GCS_URI"
fi

RESPONSE=$(curl -sS http://localhost:8080/api/vdp/extract-vertex \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"$PLATFORM\",
    \"content_id\": \"$CONTENT_ID\",
    \"uploaded_gcs_uri\": \"$GCS_URI\",
    \"processing_options\": {
      \"force_full_pipeline\": true,
      \"hook_genome_analysis\": true,
      \"audio_fingerprint\": false,
      \"brand_detection\": false
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq

# 처리 상태 모니터링
PROCESSING_ID=$(echo "$RESPONSE" | jq -r '.processing_id // empty')
if [[ -n "$PROCESSING_ID" ]]; then
  echo "Processing ID: $PROCESSING_ID"
  ./scripts/monitor-processing.sh "$PROCESSING_ID"
fi