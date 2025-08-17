#!/bin/bash

# VDP 병렬 생성 스크립트
# Vertex AI 서비스 에이전트 준비 완료 후 실행

T2_URL="https://t2-extract-355516763169.us-west1.run.app"
export PAR=6

echo "🚀 VDP 병렬 생성 시작"
echo "📡 T2_URL: $T2_URL"
echo "⚡ 병렬도: $PAR"
echo ""

# GNU parallel 설치 확인
if ! command -v parallel &> /dev/null; then
    echo "⚠️  GNU parallel이 설치되지 않음. homebrew로 설치 중..."
    brew install parallel
fi

# 출력 디렉터리 생성
mkdir -p out/vdp

# CSV에서 SHA 추출 및 병렬 처리
echo "📄 CSV 파일에서 SHA 추출 중..."
awk -F',' 'NR>1 && $1!="" {print $1}' shorts.sha.csv \
| parallel -j $PAR '
  SHA="{}"; 
  echo "🎬 처리 중: ${SHA}";
  
  curl -sS -X POST "'"$T2_URL"'/api/vdp/extract-vertex" \
    -H "Content-Type: application/json" \
    -d "{\"gcsUri\":\"gs://tough-variety-raw/raw/ingest/${SHA}.mp4\",\"meta\":{\"platform\":\"YouTube\",\"language\":\"ko\"}}" \
    > "out/vdp/${SHA}.vdp.json" 2>/dev/null;
    
  if [ $? -eq 0 ] && [ -s "out/vdp/${SHA}.vdp.json" ]; then
    # Hook 게이트 검증
    HOOK_RESULT=$(jq -r ".vdp.overall_analysis.hookGenome // .hookGenome // \"missing\"" "out/vdp/${SHA}.vdp.json" 2>/dev/null);
    if [[ "$HOOK_RESULT" != "missing" && "$HOOK_RESULT" != "null" ]]; then
      echo "✅ [VDP OK] ${SHA} - Hook Genome 생성됨";
    else
      echo "⚠️  [VDP WARN] ${SHA} - Hook Genome 누락";
    fi
  else
    echo "❌ [VDP FAIL] ${SHA} - 생성 실패";
  fi
'

echo ""
echo "📊 VDP 생성 완료 - 결과 확인:"
ls -la out/vdp/*.vdp.json 2>/dev/null | wc -l | xargs echo "생성된 VDP 파일 수:"
echo ""
echo "🔍 Hook 게이트 검증 요약:"
for file in out/vdp/*.vdp.json; do
  if [ -f "$file" ]; then
    SHA=$(basename "$file" .vdp.json)
    HOOK_CHECK=$(jq -r 'if .vdp.overall_analysis.hookGenome.start_sec <= 3 and .vdp.overall_analysis.hookGenome.strength_score >= 0.70 then "PASS" else "FAIL" end' "$file" 2>/dev/null)
    echo "  $SHA: $HOOK_CHECK"
  fi
done

echo "✨ 병렬 VDP 생성 작업 완료!"