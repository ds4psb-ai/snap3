#!/bin/bash
# 범용 스키마 검증기
set -euo pipefail

SCHEMA_FILE="$1"
DATA_FILE="$2"

echo "🔍 [T4] 스키마 검증: $SCHEMA_FILE vs $DATA_FILE"

if command -v ajv >/dev/null 2>&1; then
    ajv validate -s "$SCHEMA_FILE" -d "$DATA_FILE"
    echo "✅ [T4] 스키마 검증 통과"
else
    echo "⚠️ [T4] AJV 미설치 - npm install -g ajv-cli 필요"
fi
