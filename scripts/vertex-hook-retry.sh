#!/bin/bash
# Vertex AI Hook Genome Test Script with Retry Logic
# Service agents provisioning 이슈 대응

set -e

# 환경값
export PROJECT_ID="tough-variety-466003-c5"
export LOCATION="us-central1"  
export MODEL_ID="gemini-2.5-pro"
export ACCESS_TOKEN="$(gcloud auth print-access-token)"
export ENDPOINT="https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models/$MODEL_ID:generateContent"

# 입력 비디오(GCS URI)
export GCS_URI="${GCS_URI:-gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4}"

echo "🔧 Vertex AI Hook Genome Test (Retry) 시작..."
echo "📹 Video: $GCS_URI"
echo "🧠 Model: $MODEL_ID @ $LOCATION"

# 스키마/프롬프트 로드
echo "📋 스키마 및 프롬프트 로드..."
SCHEMA_JSON="$(cat schemas/vdp-vertex-hook.schema.json)"
PROMPT_TEXT="$(cat prompts/hook_genome.ko.txt)"

# 출력 디렉토리 확인
mkdir -p scripts/tmp
mkdir -p out

# 요청 JSON 생성
echo "🛠️ 요청 JSON 생성..."
jq -n --arg uri "$GCS_URI" --argjson schema "$SCHEMA_JSON" --arg p "$PROMPT_TEXT" '{
  contents: [{
    role: "user",
    parts: [
      { file_data: { file_uri: $uri, mime_type: "video/mp4" } },
      { text: $p }
    ]
  }],
  generationConfig: {
    response_mime_type: "application/json",
    response_schema: $schema,
    temperature: 0.2
  }
}' > scripts/tmp/vertex_req_retry.json

echo "✅ 요청 JSON 생성 완료: $(wc -c < scripts/tmp/vertex_req_retry.json) bytes"

# Service agents provisioning 대기
echo "⏳ Service agents provisioning 대기 (30초)..."
sleep 30

# 호출 (최대 3번 재시도)
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "🚀 Vertex AI 호출 시도 $((RETRY_COUNT + 1))/$MAX_RETRIES..."
  
  curl -sS -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d @scripts/tmp/vertex_req_retry.json \
    > scripts/tmp/vertex_res_retry.json
  
  # 에러 체크
  if jq -e '.error' scripts/tmp/vertex_res_retry.json > /dev/null 2>&1; then
    ERROR_CODE=$(jq -r '.error.code' scripts/tmp/vertex_res_retry.json)
    ERROR_MSG=$(jq -r '.error.message' scripts/tmp/vertex_res_retry.json)
    echo "❌ 에러 발생 (Code: $ERROR_CODE): $ERROR_MSG"
    
    if [ "$ERROR_CODE" = "400" ] && [[ "$ERROR_MSG" == *"Service agents are being provisioned"* ]]; then
      echo "⏳ Service agents provisioning 중... 60초 대기 후 재시도"
      sleep 60
      RETRY_COUNT=$((RETRY_COUNT + 1))
      continue
    else
      echo "💥 복구 불가능한 에러, 중단"
      exit 1
    fi
  else
    echo "✅ 요청 성공!"
    break
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "💥 최대 재시도 횟수 초과, 실패"
  exit 1
fi

echo "📤 응답 수신 완료"
cat scripts/tmp/vertex_res_retry.json

# 본문(JSON)만 추출 → 산출물 저장
echo ""
echo "📝 VDP JSON 추출 중..."
jq -r '.candidates[0].content.parts[0].text' scripts/tmp/vertex_res_retry.json \
  > "out/hook-test-retry.vdp.json"

# 결과 검증
if [ -f "out/hook-test-retry.vdp.json" ] && [ -s "out/hook-test-retry.vdp.json" ]; then
  echo "✅ VDP JSON 생성 완료: out/hook-test-retry.vdp.json"
  echo "📊 파일 크기: $(wc -c < out/hook-test-retry.vdp.json) bytes"
  
  # JSON 유효성 검사
  if jq empty out/hook-test-retry.vdp.json 2>/dev/null; then
    echo "✅ JSON 형식 유효"
    
    # hookGenome 필드 확인
    if jq -e '.overall_analysis.hookGenome' out/hook-test-retry.vdp.json > /dev/null 2>&1; then
      echo "🎯 hookGenome 필드 확인됨"
      echo "📋 Hook 정보:"
      jq '.overall_analysis.hookGenome' out/hook-test-retry.vdp.json
    else
      echo "⚠️ hookGenome 필드 누락"
    fi
  else
    echo "❌ JSON 형식 오류"
    echo "📄 원시 내용:"
    head -5 out/hook-test-retry.vdp.json
  fi
else
  echo "❌ VDP JSON 생성 실패"
  exit 1
fi

echo "🎉 Hook Genome 재시도 테스트 완료!"