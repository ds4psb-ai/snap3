#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
[ -z "$FILE" ] && echo "Usage: $0 path/to/*.vdp.json" && exit 1

jq -e '
  .overall_analysis.hookGenome as $h
  | ($h.start_sec <= 3) as $win
  | ( ($h.microbeats_sec | map(select(.<=3 and .>=0)) | length) == ($h.microbeats_sec | length) ) as $beats
  | ( .scenes[0].narrative_unit.narrative_role | test("(?i)hook") ) as $scene0
  | if ($win and $beats and $scene0) then true else false end
' "$FILE" >/dev/null && echo "HOOK ✅ PASS: $FILE" || { echo "HOOK ❌ FAIL: $FILE"; exit 2; }