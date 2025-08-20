#!/bin/bash
# TikTok VDP RAW Generation Pipeline - Upgraded Version
# Hook Genome 통합 + 자동 Hook Gate 판정

set -euo pipefail

# 설정
T2_URL="${T2_EXTRACT_URL:-https://t2-extract-355516763169.us-central1.run.app}"
RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw}"
GOLD_BUCKET="${GOLD_BUCKET:-tough-variety-gold}"

# 사용법
usage() {
    echo "사용법: $0 <MP4_FILE> <METADATA_JSON>"
    echo "예시: $0 video.mp4 metadata.json"
    echo ""
    echo "메타데이터 JSON 형식:"
    echo '{'
    echo '  "platform": "tiktok",'
    echo '  "content_id": "VIDEO_ID",'
    echo '  "source_url": "https://tiktok.com/@user/video/VIDEO_ID",'
    echo '  "creator": "username",'
    echo '  "description": "video description",'
    echo '  "hashtags": ["tag1", "tag2"]'
    echo '}'
    exit 1
}

if [ $# -ne 2 ]; then
    usage
fi

MP4_FILE="$1"
METADATA_FILE="$2"
UPLOAD_ID=$(uuidgen)
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# 파일 존재 확인
if [ ! -f "$MP4_FILE" ]; then
    echo "❌ MP4 파일을 찾을 수 없습니다: $MP4_FILE"
    exit 1
fi

if [ ! -f "$METADATA_FILE" ]; then
    echo "❌ 메타데이터 파일을 찾을 수 없습니다: $METADATA_FILE"
    exit 1
fi

# 메타데이터 파싱
CONTENT_ID=$(jq -r '.content_id // .video_id // "unknown"' "$METADATA_FILE")
SOURCE_URL=$(jq -r '.source_url // ""' "$METADATA_FILE")
CREATOR=$(jq -r '.creator // .username // ""' "$METADATA_FILE")
HASHTAGS=$(jq -r '.hashtags // [] | join(",")' "$METADATA_FILE")

echo "🎵 TikTok VDP RAW Generation Pipeline - Upgraded Version"
echo "====================================================="
echo "🎬 MP4 파일: $MP4_FILE"
echo "📄 메타데이터: $METADATA_FILE"
echo "🆔 Content ID: $CONTENT_ID"
echo "📦 Upload ID: $UPLOAD_ID"
echo "👤 Creator: $CREATOR"
echo "🔗 Source URL: $SOURCE_URL"
echo "🏷️ Hashtags: $HASHTAGS"
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

# 1. SHA256 해시 생성
echo "🔐 1단계: SHA256 해시 생성"
TSHA=$(shasum -a 256 "$MP4_FILE" | cut -d' ' -f1)
echo "✅ SHA256: $TSHA"
echo ""

# 2. GCS 업로드 (비디오)
echo "☁️ 2단계: TikTok 비디오 GCS 업로드"
GCS_VIDEO_URI="gs://${RAW_BUCKET}/raw/ingest/${TSHA}.mp4"

if ! gsutil -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
             -h "x-goog-meta-vdp-platform:tiktok" \
             -h "x-goog-meta-vdp-content-id:${CONTENT_ID}" \
             -h "x-goog-meta-vdp-source-url:${SOURCE_URL}" \
             -h "x-goog-meta-vdp-creator:${CREATOR}" \
             -h "x-goog-meta-vdp-hashtags:${HASHTAGS}" \
             cp "$MP4_FILE" "$GCS_VIDEO_URI"; then
    echo "❌ 비디오 GCS 업로드 실패"
    exit 1
fi
echo "✅ 비디오 업로드 완료: $GCS_VIDEO_URI"

# 3. GCS 업로드 (메타데이터)
echo "📄 3단계: TikTok 메타데이터 GCS 업로드"
GCS_META_URI="gs://${RAW_BUCKET}/raw/ingest/${TSHA}.json"

if ! gsutil -h "x-goog-meta-vdp-upload-id:${UPLOAD_ID}" \
             -h "x-goog-meta-vdp-platform:tiktok" \
             -h "x-goog-meta-vdp-content-id:${CONTENT_ID}" \
             cp "$METADATA_FILE" "$GCS_META_URI"; then
    echo "❌ 메타데이터 GCS 업로드 실패"
    exit 1
fi
echo "✅ 메타데이터 업로드 완료: $GCS_META_URI"
echo ""

# 4. VDP 추출 (업그레이드된 방식 - TikTok)
echo "🧬 4단계: TikTok VDP RAW + Hook Genome 추출 (업그레이드 버전)"
echo "📞 t2-extract API 호출 중..."

VDP_OUTPUT="/tmp/vdp.tiktok.${CONTENT_ID}.${TIMESTAMP}.json"

if ! curl -sS -X POST "$T2_URL/api/vdp/extract-vertex" \
          -H 'Content-Type: application/json' \
          -d "$(jq -n --arg g "$GCS_VIDEO_URI" '{gcsUri:$g, meta:{platform:"TikTok", language:"ko"}}')" \
          | tee "$VDP_OUTPUT"; then
    echo "❌ TikTok VDP 추출 실패"
    exit 1
fi
echo ""
echo "✅ TikTok VDP 추출 완료: $VDP_OUTPUT"
echo ""

# 5. Hook Gate 자동 판정
echo "🎯 5단계: TikTok Hook Gate 자동 판정"
HOOK_RESULT=$(jq '{
    start_sec: .vdp.overall_analysis.hookGenome.start_sec,
    strength: .vdp.overall_analysis.hookGenome.strength_score,
    pattern_code: .vdp.overall_analysis.hookGenome.pattern_code,
    delivery: .vdp.overall_analysis.hookGenome.delivery,
    pass: (.vdp.overall_analysis.hookGenome.start_sec <= 3 and .vdp.overall_analysis.hookGenome.strength_score >= 0.70)
}' "$VDP_OUTPUT")

echo "TikTok Hook Gate 판정 결과:"
echo "$HOOK_RESULT" | jq '.'

HOOK_PASS=$(echo "$HOOK_RESULT" | jq -r '.pass')
if [ "$HOOK_PASS" = "true" ]; then
    echo "✅ TikTok Hook Gate 통과!"
else
    echo "❌ TikTok Hook Gate 실패!"
    echo "⚠️  start_sec ≤ 3s 그리고 strength_score ≥ 0.70 조건을 만족해야 합니다."
fi
echo ""

# 6. 로컬 파일 저장
echo "💾 6단계: 로컬 TikTok VDP 파일 저장"
LOCAL_VDP="${CONTENT_ID}_${TIMESTAMP}_TIKTOK_UPGRADED.vdp.json"
cp "$VDP_OUTPUT" "$LOCAL_VDP"
echo "✅ 로컬 TikTok VDP 저장: $LOCAL_VDP"
echo ""

# 7. 요약 정보 출력
echo "📊 TikTok 추출 완료 요약"
echo "======================="
echo "🎬 비디오: $MP4_FILE → $GCS_VIDEO_URI"
echo "📄 메타데이터: $METADATA_FILE → $GCS_META_URI"
echo "🧬 VDP 파일: $LOCAL_VDP"
echo "🔐 SHA256: $TSHA"
echo "📦 Upload ID: $UPLOAD_ID"
echo "🆔 Content ID: $CONTENT_ID"

# Hook 정보 요약
START_SEC=$(echo "$HOOK_RESULT" | jq -r '.start_sec')
STRENGTH=$(echo "$HOOK_RESULT" | jq -r '.strength')
PATTERN=$(echo "$HOOK_RESULT" | jq -r '.pattern_code[]?' | tr '\n' ',' | sed 's/,$//')
DELIVERY=$(echo "$HOOK_RESULT" | jq -r '.delivery')

echo ""
echo "🎯 TikTok Hook Genome 요약:"
echo "   시작 시간: ${START_SEC}초"
echo "   강도 점수: $STRENGTH"
echo "   패턴 코드: [$PATTERN]"
echo "   전달 방식: $DELIVERY"
echo "   결과: $([ "$HOOK_PASS" = "true" ] && echo "✅ 통과" || echo "❌ 실패")"
echo ""

# 성공 메시지
if [ "$HOOK_PASS" = "true" ]; then
    echo "🎉 TikTok VDP RAW Generation Pipeline 완료! (업그레이드 버전)"
    echo "   모든 파일이 성공적으로 생성되었습니다."
else
    echo "⚠️  TikTok VDP 생성은 완료되었으나 Hook Gate를 통과하지 못했습니다."
    echo "   품질 개선이 필요할 수 있습니다."
fi

# 정리
rm -f "$VDP_OUTPUT"
echo ""
echo "🧹 임시 파일 정리 완료"