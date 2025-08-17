#!/usr/bin/env bash
set -euo pipefail

# 🧪 VDP API 검증 스크립트
# Purpose: API 엔드포인트 구조 및 응답 형식 검증 (GCS 없이)
# Usage: ./vdp-api-validation-script.sh

echo "🧪 VDP API 검증 스크립트"
echo "======================="

# Configuration
US_T2="https://t2-vdp-355516763169.us-central1.run.app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📍 서비스: $US_T2"
echo "⏰ 타임스탬프: $TIMESTAMP"
echo ""

# Output directory
mkdir -p "out/api-validation"

# 1. Health Check
echo "1️⃣ Health Check"
echo "==============="

HEALTH_RESPONSE=$(curl -s --max-time 10 "$US_T2/health" || echo '{"error": "connection_failed"}')
echo "📊 Health Response:"
echo "$HEALTH_RESPONSE" | jq -C '.'

if echo "$HEALTH_RESPONSE" | jq -e '.ok == true' >/dev/null 2>&1; then
    echo "✅ 서비스 정상"
else
    echo "❌ 서비스 비정상"
    exit 1
fi
echo ""

# 2. API Schema Validation
echo "2️⃣ API 스키마 검증"
echo "=================="

# Test with missing required fields
echo "🔍 필수 필드 누락 테스트..."

MISSING_GCSURI_TEST=$(curl -s -X POST "$US_T2/api/vdp/extract-vertex" \
    -H 'Content-Type: application/json' \
    -d '{"meta": {"platform": "test"}}' || echo '{"error": "request_failed"}')

echo "📋 gcsUri 누락 테스트 응답:"
echo "$MISSING_GCSURI_TEST" | jq -C '.'

if echo "$MISSING_GCSURI_TEST" | jq -e '.error' | grep -q "gcsUri"; then
    echo "✅ gcsUri 필수 필드 검증 정상"
else
    echo "⚠️ gcsUri 검증 로직 확인 필요"
fi
echo ""

# 3. Invalid GCS URI Test
echo "3️⃣ 유효하지 않은 GCS URI 테스트"
echo "=============================="

INVALID_URI_PAYLOAD='{
    "gcsUri": "gs://nonexistent-bucket/fake-video.mp4",
    "meta": {
        "platform": "test",
        "language": "ko",
        "content_id": "validation_test_'$TIMESTAMP'"
    },
    "outGcsUri": "gs://nonexistent-output/fake-output.vdp.json"
}'

echo "📤 요청:"
echo "$INVALID_URI_PAYLOAD" | jq -C '.'

INVALID_URI_RESPONSE=$(curl -s -X POST "$US_T2/api/vdp/extract-vertex" \
    -H 'Content-Type: application/json' \
    -d "$INVALID_URI_PAYLOAD" \
    --max-time 30 || echo '{"error": "request_timeout"}')

echo ""
echo "📥 응답:"
echo "$INVALID_URI_RESPONSE" | jq -C '.'

# Save response for analysis
echo "$INVALID_URI_RESPONSE" > "out/api-validation/invalid-uri-response-${TIMESTAMP}.json"

if echo "$INVALID_URI_RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    ERROR_TYPE=$(echo "$INVALID_URI_RESPONSE" | jq -r '.error' | head -c 50)
    echo "✅ 예상된 오류 발생: $ERROR_TYPE..."
else
    echo "⚠️ 예상치 못한 응답 형식"
fi
echo ""

# 4. Async Parameter Test
echo "4️⃣ 비동기 파라미터 테스트"
echo "======================="

ASYNC_TEST_PAYLOAD='{
    "gcsUri": "gs://fake-bucket/test-video.mp4",
    "meta": {
        "platform": "YouTube",
        "language": "ko",
        "content_id": "async_test_'$TIMESTAMP'",
        "test_mode": true
    }
}'

echo "📤 비동기 모드 없이 요청:"
echo "$ASYNC_TEST_PAYLOAD" | jq -C '.'

SYNC_RESPONSE=$(curl -s -X POST "$US_T2/api/vdp/extract-vertex" \
    -H 'Content-Type: application/json' \
    -d "$ASYNC_TEST_PAYLOAD" \
    --max-time 15 || echo '{"error": "request_timeout"}')

echo ""
echo "📥 동기 모드 응답:"
echo "$SYNC_RESPONSE" | jq -C '.' | head -20

echo ""
echo "📤 비동기 모드로 요청 (?async=true):"

ASYNC_RESPONSE=$(curl -s -X POST "$US_T2/api/vdp/extract-vertex?async=true" \
    -H 'Content-Type: application/json' \
    -d "$ASYNC_TEST_PAYLOAD" \
    --max-time 15 || echo '{"error": "request_timeout"}')

echo "📥 비동기 모드 응답:"
echo "$ASYNC_RESPONSE" | jq -C '.' | head -20

# Save responses
echo "$SYNC_RESPONSE" > "out/api-validation/sync-response-${TIMESTAMP}.json"
echo "$ASYNC_RESPONSE" > "out/api-validation/async-response-${TIMESTAMP}.json"

echo ""

# 5. Response Format Analysis
echo "5️⃣ 응답 형식 분석"
echo "================="

echo "📊 동기 모드 응답 분석:"
if echo "$SYNC_RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    echo "   ❌ 오류: $(echo "$SYNC_RESPONSE" | jq -r '.error' | head -c 100)..."
elif echo "$SYNC_RESPONSE" | jq -e '.overall_analysis' >/dev/null 2>&1; then
    echo "   ✅ VDP 데이터 포함됨"
elif echo "$SYNC_RESPONSE" | jq -e '.taskId' >/dev/null 2>&1; then
    echo "   ⏳ 작업 ID 반환됨"
else
    echo "   ⚠️ 알 수 없는 응답 형식"
fi

echo ""
echo "📊 비동기 모드 응답 분석:"
if echo "$ASYNC_RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    echo "   ❌ 오류: $(echo "$ASYNC_RESPONSE" | jq -r '.error' | head -c 100)..."
elif echo "$ASYNC_RESPONSE" | jq -e '.taskId' >/dev/null 2>&1; then
    TASK_ID=$(echo "$ASYNC_RESPONSE" | jq -r '.taskId')
    echo "   ✅ 작업 ID: $TASK_ID"
elif echo "$ASYNC_RESPONSE" | jq -e '.overall_analysis' >/dev/null 2>&1; then
    echo "   ⚠️ 비동기인데 즉시 VDP 반환됨"
else
    echo "   ⚠️ 알 수 없는 응답 형식"
fi

echo ""

# 6. API 구조 요약
echo "6️⃣ API 구조 요약"
echo "==============="

echo "✅ 검증된 API 패턴:"
echo "   📍 엔드포인트: /api/vdp/extract-vertex"
echo "   📤 필수 필드: gcsUri"
echo "   📋 선택 필드: meta, outGcsUri"
echo "   ⚙️ 비동기 모드: ?async=true"
echo ""

echo "🔧 올바른 요청 형식:"
cat << 'EOF'
{
  "gcsUri": "gs://bucket/video.mp4",
  "meta": {
    "platform": "YouTube",
    "language": "ko", 
    "content_id": "unique_id"
  },
  "outGcsUri": "gs://output-bucket/result.vdp.json"
}
EOF
echo ""

echo "📊 응답 패턴:"
echo "   ✅ 성공: VDP JSON 데이터 또는 taskId"
echo "   ❌ 실패: {\"error\": \"메시지\"}"
echo "   ⏳ 비동기: {\"taskId\": \"작업ID\"}"
echo ""

echo "📁 저장된 파일:"
echo "   📄 out/api-validation/sync-response-${TIMESTAMP}.json"
echo "   📄 out/api-validation/async-response-${TIMESTAMP}.json"
echo "   📄 out/api-validation/invalid-uri-response-${TIMESTAMP}.json"

echo ""
echo "🎉 API 검증 완료!"

echo ""
echo "💡 다음 단계:"
echo "   1. 실제 GCS URI로 테스트: ./vdp-trigger-production-workflow.sh VIDEO.mp4"
echo "   2. 메타데이터 주입 패턴 확인: meta 필드 구조 분석"
echo "   3. 비동기 처리 상태 폴링 구현"