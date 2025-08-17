#!/usr/bin/env bash
set -euo pipefail

# 🎵 Enhanced Audio Fingerprint Generator (3 Samples: Start/Mid/End)
# Purpose: Generate ChromaPrint fingerprints from 3 strategic positions
# Usage: ./audio-fingerprint-enhanced.sh INPUT.mp4 CONTENT_ID [OUTPUT.json]

if [ $# -lt 2 ]; then
  echo "Usage: $0 <input.mp4> <content_id> [out.json]"
  echo ""
  echo "Examples:"
  echo "  $0 video.mp4 55e6ScXfiZc"
  echo "  $0 ~/Downloads/video.mp4 C001 ~/output/fingerprint.json"
  exit 1
fi

IN="$1"
CID="$2" 
OUT="${3:-$HOME/snap3/out/meta/${CID}.audio.fp.json}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "🎵 Enhanced Audio Fingerprint Generator"
echo "======================================"
echo "📁 Input: $IN"
echo "🆔 Content ID: $CID"
echo "📄 Output: $OUT"
echo ""

# Ensure output directory exists
mkdir -p "$(dirname "$OUT")"

# 1) Get total duration in seconds
echo "⏱️ Analyzing video duration..."
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$IN")
DUR_INT=$(python3 - <<PY
d=float("$DUR"); 
print(int(d))
PY
)

echo "✅ Duration: ${DUR_INT} seconds"

# 2) Calculate 10-second sample offsets
MID=$(( DUR_INT / 2 ))
TAIL=$(( DUR_INT - 10 ))
[ $TAIL -lt 0 ] && TAIL=0

echo "📍 Sample positions:"
echo "  - Head: 0s (first 10s)"
echo "  - Mid: ${MID}s (middle 10s)" 
echo "  - Tail: ${TAIL}s (last 10s)"
echo ""

# 3) Extract 10-second segments (mono 11.025kHz) → fpcalc -json
extract_fp() {
  local NAME="$1" 
  local OFF="$2"
  echo "🔊 Extracting $NAME segment (offset: ${OFF}s)..."
  
  ffmpeg -hide_banner -loglevel error -ss "$OFF" -t 10 -i "$IN" -ac 1 -ar 11025 -f wav "$TMP/${NAME}.wav"
  if fpcalc -json -length 10 "$TMP/${NAME}.wav" > "$TMP/${NAME}.json"; then
    echo "✅ $NAME fingerprint generated"
  else
    echo "❌ Failed to generate $NAME fingerprint"
    exit 1
  fi
}

extract_fp head 0
extract_fp mid  "$MID"
extract_fp tail "$TAIL"

echo ""

# 4) Combine JSON + simple cluster/confidence rules (2/3 match = high confidence)
echo "🔗 Combining fingerprints and calculating confidence..."

jq -n --arg cid "$CID" --arg dur "$DUR_INT" \
  --slurpfile H "$TMP/head.json" --slurpfile M "$TMP/mid.json" --slurpfile T "$TMP/tail.json" '
  def f0: .[0];
  def fp(x): (x.fingerprint);
  def same(a;b): (a==b);
  def agreement(a;b;c):
    ( (a==b) or (b==c) or (a==c) ) as $ok
    | {ok:$ok, conf: ( if $ok then 0.95 else 0.60 end) };

  (fp(f0($H))) as $h | (fp(f0($M))) as $m | (fp(f0($T))) as $t
  | (agreement($h;$m;$t)) as $ag
  | { content_id:$cid,
      audio: {
        provider:"chromaprint",
        version:1,
        duration_sec: ($dur|tonumber),
        fingerprints:[
          {t:0, fp:$h, c:1.0},
          {t:(($dur|tonumber)/2|floor), fp:$m, c:1.0},
          {t:(($dur|tonumber)-10|floor), fp:$t, c:1.0}
        ],
        same_bgm_confidence: $ag.conf,
        quality_metrics: {
          total_samples: 3,
          agreement_score: $ag.conf,
          coverage_percentage: (30.0 / ($dur|tonumber) * 100),
          fingerprint_algorithm: "chromaprint_1.5.1"
        }
      }
    }' > "$OUT"

# 5) Generate fixed cluster ID: connect 3 fingerprints → SHA1 → first 12 chars
echo "🔑 Generating cluster ID..."
SIG=$(jq -r '.audio.fingerprints[].fp' "$OUT" | tr '\n' '|' | shasum | awk '{print $1}')
CID_SHORT=$(echo "$SIG" | cut -c1-12)
jq --arg cid "bgm:${CID_SHORT}" '.audio.same_bgm_cluster_id=$cid' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"

echo "✅ Cluster ID generated: bgm:${CID_SHORT}"

# 6) Quality validation and summary
echo ""
echo "📊 Fingerprint Quality Report:"
echo "=============================="

CONFIDENCE=$(jq -r '.audio.same_bgm_confidence' "$OUT")
COVERAGE=$(jq -r '.audio.quality_metrics.coverage_percentage' "$OUT")
SAMPLE_COUNT=$(jq -r '.audio.quality_metrics.total_samples' "$OUT")

echo "🎯 BGM Confidence: $CONFIDENCE"
echo "📏 Coverage: ${COVERAGE}%"
echo "🔢 Samples: $SAMPLE_COUNT"

# Quality assessment
if (( $(echo "$CONFIDENCE > 0.9" | bc -l) )); then
    echo "🌟 Quality: High-confidence audio signature"
elif (( $(echo "$CONFIDENCE > 0.7" | bc -l) )); then
    echo "✨ Quality: Good audio signature"
else
    echo "📝 Quality: Basic audio signature"
fi

# Coverage assessment
if (( $(echo "$COVERAGE > 50.0" | bc -l) )); then
    echo "📈 Coverage: Comprehensive sampling"
elif (( $(echo "$COVERAGE > 20.0" | bc -l) )); then
    echo "📊 Coverage: Good sampling"
else
    echo "📉 Coverage: Limited sampling (short video)"
fi

echo ""
echo "🎉 Enhanced audio fingerprint generation complete!"
echo ""
echo "📁 Generated File:"
echo "  - $OUT"
echo ""
echo "🔧 Integration Commands:"
echo "  # View fingerprint details"
echo "  cat $OUT | jq '.audio'"
echo ""
echo "  # Check cluster ID"
echo "  cat $OUT | jq -r '.audio.same_bgm_cluster_id'"
echo ""
echo "  # View quality metrics"
echo "  cat $OUT | jq '.audio.quality_metrics'"
echo ""
echo "✅ Ready for Evidence Pack integration"