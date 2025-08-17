#!/bin/bash
# VDP RAW Generation Pipeline - Upgraded Version
# Hook Genome 통합 + 자동 Hook Gate 판정

set -euo pipefail

# 설정
T2_URL="${T2_EXTRACT_URL:-https://t2-extract-355516763169.us-central1.run.app}"
PROJECT_ID="${PROJECT_ID:-tough-variety-466003-c5}"
RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw}"
GOLD_BUCKET="${GOLD_BUCKET:-tough-variety-gold}"

# 사용법 표시
usage() {
    echo "사용법: $0 <YOUTUBE_URL>"
    echo "예시: $0 https://www.youtube.com/shorts/6_I2FmT1mbY"
    echo ""
    echo "환경변수:"
    echo "  T2_EXTRACT_URL: t2-extract 서비스 URL (기본값: https://t2-extract-355516763169.us-central1.run.app)"
    echo "  RAW_BUCKET: GCS RAW 버킷명 (기본값: tough-variety-raw)"
    echo "  GOLD_BUCKET: GCS GOLD 버킷명 (기본값: tough-variety-gold)"
    exit 1
}

# 인수 확인
if [ $# -ne 1 ]; then
    usage
fi

YOUTUBE_URL="$1"
VIDEO_ID=$(basename "$YOUTUBE_URL" | sed 's/.*\///')
UPLOAD_ID=$(uuidgen)
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo "🎬 VDP RAW Generation Pipeline - Upgraded Version"
echo "================================================"
echo "📹 YouTube URL: $YOUTUBE_URL"
echo "🆔 Video ID: $VIDEO_ID"
echo "📦 Upload ID: $UPLOAD_ID"
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

# 1. 비디오 다운로드
echo "📥 1단계: YouTube 비디오 다운로드"
if ! yt-dlp --format mp4 --output "${VIDEO_ID}.%(ext)s" "$YOUTUBE_URL"; then
    echo "❌ 비디오 다운로드 실패"
    exit 1
fi
echo "✅ 비디오 다운로드 완료: ${VIDEO_ID}.mp4"
echo ""

# 2. SHA256 해시 생성
echo "🔐 2단계: SHA256 해시 생성"
SHA256=$(shasum -a 256 "${VIDEO_ID}.mp4" | cut -d' ' -f1)
echo "✅ SHA256: $SHA256"
echo ""

# 3. GCS 업로드
echo "☁️ 3단계: GCS RAW 버킷 업로드"
GCS_URI="gs://${RAW_BUCKET}/raw/ingest/${SHA256}.mp4"

if ! gsutil -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
             -h "x-goog-meta-vdp-platform:youtube" \
             -h "x-goog-meta-vdp-content-id:${VIDEO_ID}" \
             -h "x-goog-meta-vdp-source-url:${YOUTUBE_URL}" \
             cp "${VIDEO_ID}.mp4" "$GCS_URI"; then
    echo "❌ GCS 업로드 실패"
    exit 1
fi
echo "✅ GCS 업로드 완료: $GCS_URI"
echo ""

# 4. VDP 추출 (업그레이드된 방식)
echo "🧬 4단계: VDP RAW + Hook Genome 추출 (업그레이드 버전)"
echo "📞 t2-extract API 호출 중..."

VDP_OUTPUT="/tmp/vdp.${VIDEO_ID}.${TIMESTAMP}.json"

if ! curl -sS -X POST "$T2_URL/api/vdp/extract-vertex" \
          -H 'Content-Type: application/json' \
          -d "$(jq -n --arg g "$GCS_URI" '{gcsUri:$g, meta:{platform:"YouTube", language:"ko"}}')" \
          | tee "$VDP_OUTPUT"; then
    echo "❌ VDP 추출 실패"
    exit 1
fi
echo ""
echo "✅ VDP 추출 완료: $VDP_OUTPUT"
echo ""

# 5. Hook Gate 자동 판정
echo "🎯 5단계: Hook Gate 자동 판정"
HOOK_RESULT=$(jq '{
    start_sec: .vdp.overall_analysis.hookGenome.start_sec,
    strength: .vdp.overall_analysis.hookGenome.strength_score,
    pattern_code: .vdp.overall_analysis.hookGenome.pattern_code,
    delivery: .vdp.overall_analysis.hookGenome.delivery,
    pass: (.vdp.overall_analysis.hookGenome.start_sec <= 3 and .vdp.overall_analysis.hookGenome.strength_score >= 0.70)
}' "$VDP_OUTPUT")

echo "Hook Gate 판정 결과:"
echo "$HOOK_RESULT" | jq '.'

HOOK_PASS=$(echo "$HOOK_RESULT" | jq -r '.pass')
if [ "$HOOK_PASS" = "true" ]; then
    echo "✅ Hook Gate 통과!"
else
    echo "❌ Hook Gate 실패!"
    echo "⚠️  start_sec ≤ 3s 그리고 strength_score ≥ 0.70 조건을 만족해야 합니다."
fi
echo ""

# 6. 로컬 파일 저장
echo "💾 6단계: 로컬 VDP 파일 저장"
LOCAL_VDP="${VIDEO_ID}_${TIMESTAMP}_UPGRADED.vdp.json"
cp "$VDP_OUTPUT" "$LOCAL_VDP"
echo "✅ 로컬 VDP 저장: $LOCAL_VDP"
echo ""

# 7. 요약 정보 출력
echo "📊 추출 완료 요약"
echo "=================="
echo "🎬 비디오: ${VIDEO_ID}.mp4"
echo "🧬 VDP 파일: $LOCAL_VDP"
echo "☁️ GCS URI: $GCS_URI"
echo "🔐 SHA256: $SHA256"
echo "📦 Upload ID: $UPLOAD_ID"

# Hook 정보 요약
START_SEC=$(echo "$HOOK_RESULT" | jq -r '.start_sec')
STRENGTH=$(echo "$HOOK_RESULT" | jq -r '.strength')
PATTERN=$(echo "$HOOK_RESULT" | jq -r '.pattern_code[]' | tr '\n' ',' | sed 's/,$//')
DELIVERY=$(echo "$HOOK_RESULT" | jq -r '.delivery')

echo ""
echo "🎯 Hook Genome 요약:"
echo "   시작 시간: ${START_SEC}초"
echo "   강도 점수: $STRENGTH"
echo "   패턴 코드: [$PATTERN]"
echo "   전달 방식: $DELIVERY"
echo "   결과: $([ "$HOOK_PASS" = "true" ] && echo "✅ 통과" || echo "❌ 실패")"
echo ""

# 성공 메시지
if [ "$HOOK_PASS" = "true" ]; then
    echo "🎉 VDP RAW Generation Pipeline 완료! (업그레이드 버전)"
    echo "   모든 파일이 성공적으로 생성되었습니다."
else
    echo "⚠️  VDP 생성은 완료되었으나 Hook Gate를 통과하지 못했습니다."
    echo "   품질 개선이 필요할 수 있습니다."
fi

# 정리
rm -f "$VDP_OUTPUT"
echo ""
echo "🧹 임시 파일 정리 완료"