#!/usr/bin/env bash
set -euo pipefail

# 🔥 VDP 추출 트리거 - 프로덕션 워크플로우
# Purpose: 완전한 VDP 추출 파이프라인 (GCS 업로드 → 비동기 추출 → 상태 폴링)
# Usage: ./vdp-trigger-production-workflow.sh VIDEO_FILE [META_FILE]

echo "🔥 VDP 추출 트리거 - 프로덕션 워크플로우"
echo "======================================="

# 📋 Configuration
US_T2="https://t2-vdp-355516763169.us-central1.run.app"
GCP_PROJECT="${GCP_PROJECT:-tough-variety-466003-c5}"
RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw-central1}"
GOLD_BUCKET="${GOLD_BUCKET:-tough-variety-gold}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📍 서비스: $US_T2"
echo "📦 프로젝트: $GCP_PROJECT"
echo "🪣 Raw 버킷: $RAW_BUCKET"
echo "🏆 Gold 버킷: $GOLD_BUCKET"
echo ""

# 📥 Input validation
VIDEO_FILE="${1:-}"
META_FILE="${2:-}"

if [[ -z "$VIDEO_FILE" ]]; then
    echo "❌ Usage: $0 VIDEO_FILE [META_FILE]"
    echo ""
    echo "Examples:"
    echo "  $0 sample.mp4"
    echo "  $0 sample.mp4 sample-meta.json"
    echo ""
    echo "Available test videos:"
    find . -name "*.mp4" -type f | head -5 | sed 's/^/  /'
    exit 1
fi

if [[ ! -f "$VIDEO_FILE" ]]; then
    echo "❌ 비디오 파일을 찾을 수 없습니다: $VIDEO_FILE"
    exit 1
fi

echo "📹 입력 비디오: $VIDEO_FILE"

# 🏷️ Metadata handling
if [[ -z "$META_FILE" ]]; then
    echo "🏷️ 메타데이터 자동 생성 중..."
    
    VIDEO_BASENAME=$(basename "$VIDEO_FILE" .mp4)
    META_FILE="meta-${VIDEO_BASENAME}-${TIMESTAMP}.json"
    
    # Extract basic video info if ffprobe is available
    DURATION_SEC=""
    if command -v ffprobe >/dev/null 2>&1; then
        DURATION_SEC=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$VIDEO_FILE" 2>/dev/null | cut -d. -f1 || echo "")
    fi
    
    cat > "$META_FILE" << EOF
{
  "content_id": "PROD_${VIDEO_BASENAME}_${TIMESTAMP}",
  "platform": "YouTube",
  "language": "ko",
  "source_url": "https://youtube.com/shorts/${VIDEO_BASENAME}",
  "creator": "production_test",
  "upload_date": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "processing_timestamp": "$TIMESTAMP"$(if [[ -n "$DURATION_SEC" ]]; then echo ",
  \"duration_sec\": $DURATION_SEC"; fi)
}
EOF
    
    echo "✅ 메타데이터 생성: $META_FILE"
else
    if [[ ! -f "$META_FILE" ]]; then
        echo "❌ 메타데이터 파일을 찾을 수 없습니다: $META_FILE"
        exit 1
    fi
    echo "📋 메타데이터: $META_FILE"
fi

# Validate metadata JSON
if ! jq empty "$META_FILE" 2>/dev/null; then
    echo "❌ 메타데이터가 유효한 JSON이 아닙니다"
    exit 1
fi

echo "✅ 메타데이터 유효성 확인 완료"
echo ""

# 🔧 Environment checks
echo "🔧 환경 검증"
echo "============"

# Check gcloud auth
if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | head -1 >/dev/null 2>&1; then
    echo "❌ GCP 인증이 필요합니다"
    echo "🔑 실행: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" | head -1)
echo "✅ GCP 인증: $ACTIVE_ACCOUNT"

# Check project access
if ! gcloud projects describe "$GCP_PROJECT" >/dev/null 2>&1; then
    echo "❌ 프로젝트 접근 불가: $GCP_PROJECT"
    exit 1
fi

echo "✅ 프로젝트 접근: $GCP_PROJECT"

# Check bucket access
if ! gsutil ls "gs://$RAW_BUCKET/" >/dev/null 2>&1; then
    echo "❌ Raw 버킷 접근 불가: $RAW_BUCKET"
    echo "🔧 버킷 생성: gsutil mb gs://$RAW_BUCKET"
    exit 1
fi

echo "✅ Raw 버킷 접근: $RAW_BUCKET"

# Check service health
if ! curl -s --max-time 10 "$US_T2/health" | jq -e '.ok == true' >/dev/null 2>&1; then
    echo "❌ VDP 서비스 접근 불가: $US_T2"
    exit 1
fi

echo "✅ VDP 서비스 상태: 정상"
echo ""

# 📤 GCS Upload
echo "📤 GCS 업로드"
echo "============"

# Generate file hash for unique naming
FILE_HASH=$(shasum -a 256 "$VIDEO_FILE" | cut -d' ' -f1 | head -c 16)
GCS_VIDEO_URI="gs://${RAW_BUCKET}/vdp-trigger/${FILE_HASH}_${TIMESTAMP}.mp4"
GCS_OUTPUT_URI="gs://${GOLD_BUCKET}/vdp-output/${FILE_HASH}_${TIMESTAMP}.vdp.json"

echo "📤 업로드 중: $VIDEO_FILE → $GCS_VIDEO_URI"

if ! gsutil cp "$VIDEO_FILE" "$GCS_VIDEO_URI" 2>/dev/null; then
    echo "❌ GCS 업로드 실패"
    exit 1
fi

echo "✅ GCS 업로드 완료: $GCS_VIDEO_URI"
echo "📥 출력 경로: $GCS_OUTPUT_URI"
echo ""

# 🚀 VDP Extraction Request
echo "🚀 VDP 추출 요청"
echo "==============="

# Build request payload
REQUEST_PAYLOAD=$(jq -n \
    --arg gcs_uri "$GCS_VIDEO_URI" \
    --argjson meta "$(cat "$META_FILE")" \
    --arg out_gcs "$GCS_OUTPUT_URI" \
    '{
        "gcsUri": $gcs_uri,
        "meta": $meta,
        "outGcsUri": $out_gcs
    }')

echo "📋 요청 페이로드:"
echo "$REQUEST_PAYLOAD" | jq -C '.'
echo ""

# Save request for debugging
mkdir -p "out/vdp-trigger"
REQUEST_FILE="out/vdp-trigger/request-${TIMESTAMP}.json"
echo "$REQUEST_PAYLOAD" > "$REQUEST_FILE"
echo "💾 요청 저장: $REQUEST_FILE"

# Make async API call
echo "🔄 비동기 VDP 추출 시작..."

RESPONSE_FILE="out/vdp-trigger/response-${TIMESTAMP}.json"

# Make the API call with timeout and error handling
if ! curl -sS -X POST "$US_T2/api/vdp/extract-vertex" \
    -H 'Content-Type: application/json' \
    -d "$REQUEST_PAYLOAD" \
    -o "$RESPONSE_FILE" \
    --max-time 120 \
    -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"; then
    echo "❌ API 호출 실패"
    exit 1
fi

echo ""
echo "💾 응답 저장: $RESPONSE_FILE"

# Analyze response
if ! jq empty "$RESPONSE_FILE" 2>/dev/null; then
    echo "❌ 응답이 유효한 JSON이 아닙니다"
    echo "Raw response:"
    cat "$RESPONSE_FILE"
    exit 1
fi

echo "📊 API 응답:"
jq -C '.' "$RESPONSE_FILE"
echo ""

# Check for errors
if jq -e '.error' "$RESPONSE_FILE" >/dev/null 2>&1; then
    echo "❌ VDP 추출 실패:"
    jq -r '.error' "$RESPONSE_FILE"
    
    # Cleanup uploaded file on error
    echo "🧹 업로드된 파일 정리 중..."
    gsutil rm "$GCS_VIDEO_URI" 2>/dev/null || true
    exit 1
fi

# 📊 Success handling
echo "✅ VDP 추출 요청 성공!"

# Extract task ID if available
TASK_ID=$(jq -r '.taskId // .job_id // .request_id // "unknown"' "$RESPONSE_FILE")
if [[ "$TASK_ID" != "unknown" ]]; then
    echo "🆔 작업 ID: $TASK_ID"
fi

# Check if synchronous response includes VDP data
if jq -e '.overall_analysis' "$RESPONSE_FILE" >/dev/null 2>&1; then
    echo "⚡ 동기 처리 완료 - VDP 데이터 포함됨"
    
    # Save VDP data separately
    VDP_FILE="out/vdp-trigger/vdp-${TIMESTAMP}.json"
    jq '.' "$RESPONSE_FILE" > "$VDP_FILE"
    echo "📄 VDP 저장: $VDP_FILE"
    
    # Basic VDP validation
    CONFIDENCE=$(jq -r '.overall_analysis.confidence.overall // 0' "$VDP_FILE")
    SCENE_COUNT=$(jq '.scenes | length // 0' "$VDP_FILE")
    
    echo "📊 VDP 품질:"
    echo "   🎯 신뢰도: $CONFIDENCE"
    echo "   🎬 씬 수: $SCENE_COUNT"
    
    # Check if output was uploaded to GCS
    echo ""
    echo "🔍 GCS 출력 확인 중..."
    if gsutil ls "$GCS_OUTPUT_URI" >/dev/null 2>&1; then
        echo "✅ GCS 출력 확인됨: $GCS_OUTPUT_URI"
    else
        echo "⚠️ GCS 출력 미확인 (처리 중일 수 있음)"
    fi
else
    echo "⏳ 비동기 처리 진행 중"
    
    # Provide polling instructions
    echo ""
    echo "📋 상태 확인 방법:"
    if [[ "$TASK_ID" != "unknown" ]]; then
        echo "   curl '$US_T2/api/jobs/$TASK_ID/status'"
    fi
    echo "   gsutil ls '$GCS_OUTPUT_URI'"
    echo ""
    
    # Optional: Simple polling implementation
    read -p "⏰ 결과를 기다리시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "⏳ 결과 대기 중 (최대 5분)..."
        
        for i in {1..30}; do
            echo "🔍 확인 중... ($i/30)"
            
            if gsutil ls "$GCS_OUTPUT_URI" >/dev/null 2>&1; then
                echo "✅ VDP 생성 완료!"
                
                # Download and show result
                FINAL_VDP="out/vdp-trigger/final-vdp-${TIMESTAMP}.json"
                if gsutil cp "$GCS_OUTPUT_URI" "$FINAL_VDP" 2>/dev/null; then
                    echo "📄 VDP 다운로드: $FINAL_VDP"
                    
                    # Show quality metrics
                    CONFIDENCE=$(jq -r '.overall_analysis.confidence.overall // 0' "$FINAL_VDP")
                    SCENE_COUNT=$(jq '.scenes | length // 0' "$FINAL_VDP")
                    
                    echo "📊 최종 VDP 품질:"
                    echo "   🎯 신뢰도: $CONFIDENCE"
                    echo "   🎬 씬 수: $SCENE_COUNT"
                fi
                break
            fi
            
            sleep 10
        done
        
        if ! gsutil ls "$GCS_OUTPUT_URI" >/dev/null 2>&1; then
            echo "⏰ 시간 초과 - 수동 확인 필요"
        fi
    fi
fi

echo ""
echo "📁 생성된 파일:"
echo "   📋 메타데이터: $META_FILE"
echo "   📤 요청: $REQUEST_FILE"
echo "   📥 응답: $RESPONSE_FILE"
echo "   ☁️ GCS 입력: $GCS_VIDEO_URI"
echo "   ☁️ GCS 출력: $GCS_OUTPUT_URI"

echo ""
echo "🎉 VDP 추출 트리거 워크플로우 완료!"

# Cleanup temp metadata if auto-generated
if [[ -z "${2:-}" ]] && [[ -f "$META_FILE" ]]; then
    echo "🧹 임시 메타데이터 정리"
    rm -f "$META_FILE"
fi

echo ""
echo "🔧 수동 정리 (필요시):"
echo "   gsutil rm '$GCS_VIDEO_URI'  # 입력 파일 삭제"
echo "   gsutil rm '$GCS_OUTPUT_URI'  # 출력 파일 삭제"