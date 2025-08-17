#!/bin/bash
# Vertex AI Hook Genome Test Script
# 새 hookGenome 스키마와 프롬프트를 사용한 VDP 분석

set -e

# 환경값
export PROJECT_ID="tough-variety-466003-c5"
export LOCATION="us-central1"
export MODEL_ID="gemini-2.5-pro"
export ACCESS_TOKEN="$(gcloud auth print-access-token)"
export ENDPOINT="https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models/$MODEL_ID:generateContent"

# 입력 비디오(GCS URI) - 실제 비디오로 변경 필요
export GCS_URI="gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4"

echo "🔧 Vertex AI Hook Genome Test 시작..."
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
}' > scripts/tmp/vertex_req.json

echo "✅ 요청 JSON 생성 완료: $(wc -c < scripts/tmp/vertex_req.json) bytes"

# 호출
echo "🚀 Vertex AI 호출 시작..."
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @scripts/tmp/vertex_req.json \
  | tee scripts/tmp/vertex_res.json

echo ""
echo "📤 응답 수신 완료"

# 본문(JSON)만 추출 → 산출물 저장
echo "📝 VDP JSON 추출 중..."
jq -r '.candidates[0].content.parts[0].text' scripts/tmp/vertex_res.json \
  > "out/hook-test.vdp.json"

# 결과 검증
if [ -f "out/hook-test.vdp.json" ] && [ -s "out/hook-test.vdp.json" ]; then
  echo "✅ VDP JSON 생성 완료: out/hook-test.vdp.json"
  echo "📊 파일 크기: $(wc -c < out/hook-test.vdp.json) bytes"
  
  # hookGenome 필드 확인
  if jq -e '.overall_analysis.hookGenome' out/hook-test.vdp.json > /dev/null 2>&1; then
    echo "🎯 hookGenome 필드 확인됨"
    echo "📋 Hook 정보:"
    jq '.overall_analysis.hookGenome' out/hook-test.vdp.json
  else
    echo "⚠️ hookGenome 필드 누락"
  fi
else
  echo "❌ VDP JSON 생성 실패"
  exit 1
fi

echo "🎉 Hook Genome 테스트 완료!"