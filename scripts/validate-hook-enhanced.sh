#!/usr/bin/env bash
# Enhanced Hook Validator with detailed diagnostics
set -euo pipefail

FILE="${1:-}"
[ -z "$FILE" ] && echo "Usage: $0 path/to/*.vdp.json" && exit 1

if [ ! -f "$FILE" ]; then
  echo "HOOK ❌ FAIL: File not found: $FILE"
  exit 2
fi

echo "🔍 Hook Validation: $FILE"

# Check if file is valid JSON
if ! jq empty "$FILE" 2>/dev/null; then
  echo "❌ Invalid JSON format"
  echo "📄 File content:"
  head -3 "$FILE"
  exit 2
fi

# Check if overall_analysis exists
if ! jq -e '.overall_analysis' "$FILE" >/dev/null 2>&1; then
  echo "❌ Missing overall_analysis field"
  exit 2
fi

# Check if hookGenome exists
if ! jq -e '.overall_analysis.hookGenome' "$FILE" >/dev/null 2>&1; then
  echo "❌ Missing hookGenome field"
  echo "📋 Available fields in overall_analysis:"
  jq -r '.overall_analysis | keys[]' "$FILE" 2>/dev/null || echo "Unable to list fields"
  exit 2
fi

echo "✅ hookGenome field exists"

# Extract hookGenome for inspection
echo "📊 hookGenome content:"
jq '.overall_analysis.hookGenome' "$FILE"

# Detailed validation
VALIDATION_RESULT=$(jq -r '
  .overall_analysis.hookGenome as $h
  | {
      has_start_sec: ($h.start_sec != null),
      start_sec_valid: ($h.start_sec <= 3 and $h.start_sec >= 0),
      has_microbeats: ($h.microbeats_sec != null),
      microbeats_valid: (if $h.microbeats_sec then (($h.microbeats_sec | map(select(.<=3 and .>=0)) | length) == ($h.microbeats_sec | length)) else false end),
      has_scenes: (.scenes != null and (.scenes | length) > 0),
      scene0_hook: (if .scenes[0] then (.scenes[0].narrative_unit.narrative_role | test("(?i)hook")) else false end)
    }
' "$FILE")

echo "📋 Validation details:"
echo "$VALIDATION_RESULT" | jq .

# Final validation
FINAL_CHECK=$(jq -e '
  .overall_analysis.hookGenome as $h
  | ($h.start_sec <= 3 and $h.start_sec >= 0) as $win
  | (if $h.microbeats_sec then (($h.microbeats_sec | map(select(.<=3 and .>=0)) | length) == ($h.microbeats_sec | length)) else false end) as $beats
  | (if .scenes[0] then (.scenes[0].narrative_unit.narrative_role | test("(?i)hook")) else false end) as $scene0
  | ($win and $beats and $scene0)
' "$FILE" 2>/dev/null)

if [ "$FINAL_CHECK" = "true" ]; then
  echo "HOOK ✅ PASS: $FILE"
  exit 0
else
  echo "HOOK ❌ FAIL: $FILE"
  exit 2
fi