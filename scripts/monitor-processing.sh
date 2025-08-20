#!/bin/bash
# monitor-processing.sh - 처리 상태 실시간 모니터링

PROCESSING_ID=$1
if [[ -z "$PROCESSING_ID" ]]; then
  echo "Usage: $0 <processing_id>"
  exit 1
fi

echo "🔍 Monitoring Processing ID: $PROCESSING_ID"

MAX_WAIT=300  # 5분 최대 대기
WAIT_COUNT=0

while [[ $WAIT_COUNT -lt $MAX_WAIT ]]; do
  STATUS_RESPONSE=$(curl -sS "http://localhost:3000/api/processing/$PROCESSING_ID/status")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // "unknown"')
  
  echo "[$(date +%H:%M:%S)] Status: $STATUS"
  
  case $STATUS in
    "completed")
      echo "✅ Processing completed successfully"
      echo "$STATUS_RESPONSE" | jq '.result'
      break
      ;;
    "failed")
      echo "❌ Processing failed"
      echo "$STATUS_RESPONSE" | jq '.error'
      break
      ;;
    "processing"|"queued")
      echo "🔄 Still processing..."
      sleep 10
      WAIT_COUNT=$((WAIT_COUNT + 10))
      ;;
    *)
      echo "❓ Unknown status: $STATUS"
      sleep 5
      WAIT_COUNT=$((WAIT_COUNT + 5))
      ;;
  esac
done

if [[ $WAIT_COUNT -ge $MAX_WAIT ]]; then
  echo "⏰ Timeout waiting for processing completion"
  exit 1
fi