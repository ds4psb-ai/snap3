#!/usr/bin/env bash
set -euo pipefail
SCHEMA="schemas/vdp-vertex-hook.schema.json"
set -x
# JSON Schema validation for all VDP files
for f in out/**/*.vdp.json; do
  [[ -f "$f" ]] || continue
  npx -y @jirutka/ajv-cli validate -s "$SCHEMA" "$f" || { echo "❌ Schema validation failed: $f"; exit 1; }
done
# 핵심 불변식: 0-3초, strength>=임계치, scenes[0] Hook
for f in out/**/*.vdp.json; do
  jq -e --arg ms "${HOOK_MIN_STRENGTH:-0.7}" '
    .overall_analysis.hookGenome as $h
    | ($h!=null)
    and ($h.start_sec|tonumber) <= 3
    and ($h.strength_score|tonumber) >= ($ms|tonumber)
  ' "$f" >/dev/null || { echo "❌ Regression failed: $f"; exit 1; }
  role="$(jq -r '.scenes[0].narrative_unit.narrative_role // ""' "$f")"
  [[ "$role" =~ ^[Hh]ook$ ]] || { echo "❌ scenes[0].narrative_unit.narrative_role!=Hook: $f"; exit 1; }
done
echo "✅ Regression passed"
