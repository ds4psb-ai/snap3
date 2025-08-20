# 운영 점검 루틴 - t2-extract 서비스 (v1.4.0)

**목적**: 플랫폼 3종 (YouTube/Instagram/TikTok) 대량 적재 전 "한 번에" 전체 시스템 검증

## 🔧 환경 설정 검증

### 1. Cloud Run 서비스 상태 확인
```bash
# 현재 서비스 상태 및 리비전 정보
gcloud run services describe t2-vdp --region=us-central1 --format="yaml"

# 활성 리비전 확인
gcloud run revisions list --service=t2-vdp --region=us-central1 --format="table(metadata.name,status.conditions[0].status,spec.template.spec.containers[0].env[*].name)"
```

### 2. 필수 환경변수 설정/업데이트
```bash
# 환경변수 업데이트 (새 리비전 생성)
gcloud run services update t2-vdp \
  --region=us-central1 \
  --set-env-vars=PLATFORM_SEGMENTED_PATH=true \
  --set-env-vars=RAW_BUCKET=tough-variety-raw-central1 \
  --set-env-vars=GOLD_BUCKET=tough-variety-gold-central1 \
  --set-env-vars=DATASET=vdp_dataset \
  --set-env-vars=GOLD_TABLE=vdp_gold \
  --set-env-vars=EVIDENCE_MODE=true \
  --set-env-vars=HOOK_MIN_STRENGTH=0.70 \
  --set-env-vars=HOOK_MAX_START_SEC=3.0

# 환경변수 검증
gcloud run services describe t2-vdp --region=us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[*].name,spec.template.spec.template.spec.containers[0].env[*].value)"
```

### 3. 권한 및 인증 검증
```bash
# ID 토큰 발급 테스트
echo "🔑 ID Token Generation Test:"
TOKEN=$(gcloud auth print-identity-token)
echo "Token Length: ${#TOKEN}"
echo "Token Preview: ${TOKEN:0:50}..."

# 서비스 계정 확인
echo "📋 Service Account Info:"
gcloud iam service-accounts list --filter="email:*t2-vdp*" --format="table(email,displayName,disabled)"

# 버킷 접근 권한 확인
echo "🗄️ Bucket Access Verification:"
gsutil ls gs://tough-variety-raw-central1/raw/vdp/ 2>/dev/null && echo "✅ RAW bucket accessible" || echo "❌ RAW bucket access failed"
gsutil ls gs://tough-variety-gold-central1/dt=* 2>/dev/null && echo "✅ GOLD bucket accessible" || echo "❌ GOLD bucket access failed"
```

## 🧪 서비스 기능 검증

### 4. t2-extract API 엔드포인트 테스트
```bash
# 서비스 URL 확인
SERVICE_URL=$(gcloud run services describe t2-vdp --region=us-central1 --format="value(status.url)")
echo "Service URL: $SERVICE_URL"

# Health Check
echo "🏥 Health Check:"
curl -H "Authorization: Bearer $TOKEN" \
  "$SERVICE_URL/health" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

# 메타데이터 엔드포인트 테스트
echo "📊 Metadata Endpoint Test:"
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVICE_URL/api/metadata" \
  -d '{"platform":"youtube","content_id":"test"}' \
  -w "\nStatus: %{http_code}\n"
```

### 5. 플랫폼별 VDP 생성 테스트

#### YouTube 테스트
```bash
echo "🎥 YouTube VDP Generation Test:"
cat > test_youtube_request.json << EOF
{
  "gcsUri": "gs://tough-variety-raw-central1/test/sample-youtube.mp4",
  "meta": {
    "platform": "YouTube",
    "language": "ko",
    "content_id": "TEST_YT_$(date +%s)",
    "source_url": "https://youtube.com/shorts/test"
  }
}
EOF

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVICE_URL/api/vdp/generate" \
  -d @test_youtube_request.json \
  -w "\nYouTube Test - Status: %{http_code}, Time: %{time_total}s\n"
```

#### Instagram 테스트
```bash
echo "📷 Instagram VDP Generation Test:"
cat > test_instagram_request.json << EOF
{
  "gcsUri": "gs://tough-variety-raw-central1/test/sample-instagram.mp4",
  "meta": {
    "platform": "Instagram",
    "language": "ko",
    "content_id": "TEST_IG_$(date +%s)",
    "source_url": "https://instagram.com/reel/test"
  }
}
EOF

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVICE_URL/api/vdp/generate" \
  -d @test_instagram_request.json \
  -w "\nInstagram Test - Status: %{http_code}, Time: %{time_total}s\n"
```

#### TikTok 테스트
```bash
echo "🎵 TikTok VDP Generation Test:"
cat > test_tiktok_request.json << EOF
{
  "gcsUri": "gs://tough-variety-raw-central1/test/sample-tiktok.mp4",
  "meta": {
    "platform": "TikTok",
    "language": "ko",
    "content_id": "TEST_TT_$(date +%s)",
    "source_url": "https://tiktok.com/video/test"
  }
}
EOF

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$SERVICE_URL/api/vdp/generate" \
  -d @test_tiktok_request.json \
  -w "\nTikTok Test - Status: %{http_code}, Time: %{time_total}s\n"
```

## 📋 데이터 검증

### 6. BigQuery 연결 및 스키마 검증
```bash
echo "🗃️ BigQuery Integration Test:"

# 테이블 존재 확인
bq show tough-variety-466003-c5:vdp_dataset.vdp_gold && echo "✅ vdp_gold table exists" || echo "❌ vdp_gold table missing"

# 최근 데이터 확인
bq query --use_legacy_sql=false "
SELECT 
  load_date,
  COUNT(*) as record_count,
  COUNT(DISTINCT JSON_VALUE(metadata, '$.platform')) as platform_count,
  MIN(load_timestamp) as earliest_load,
  MAX(load_timestamp) as latest_load
FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\`
WHERE load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY load_date
ORDER BY load_date DESC
LIMIT 5"
```

### 7. Hook Genome 검증
```bash
echo "🧬 Hook Genome Validation:"

# Hook Genome 필드 존재 확인
bq query --use_legacy_sql=false "
SELECT 
  COUNT(*) as total_records,
  COUNT(JSON_VALUE(overall_analysis, '$.hookGenome.pattern_code')) as hook_pattern_count,
  COUNT(JSON_VALUE(overall_analysis, '$.hookGenome.strength_score')) as strength_score_count,
  AVG(CAST(JSON_VALUE(overall_analysis, '$.hookGenome.strength_score') AS FLOAT64)) as avg_strength,
  COUNT(CASE WHEN CAST(JSON_VALUE(overall_analysis, '$.hookGenome.start_sec') AS FLOAT64) <= 3.0 THEN 1 END) as valid_hook_timing
FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\`
WHERE load_date = CURRENT_DATE()
AND JSON_VALUE(overall_analysis, '$.hookGenome') IS NOT NULL"
```

### 8. Evidence Pack 검증
```bash
echo "🔍 Evidence Pack Validation:"

# Evidence Pack 필드 존재 확인
bq query --use_legacy_sql=false "
SELECT 
  COUNT(*) as total_records,
  COUNT(JSON_VALUE(evidence_pack, '$.audio_fingerprint.provider')) as audio_fingerprint_count,
  COUNT(JSON_VALUE(evidence_pack, '$.product_evidence.product_mentions')) as product_evidence_count,
  COUNT(CASE WHEN JSON_VALUE(evidence_pack, '$.audio_fingerprint.provider') = 'chromaprint' THEN 1 END) as chromaprint_count
FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\`
WHERE load_date = CURRENT_DATE()
AND evidence_pack IS NOT NULL"
```

## 🚦 품질 게이트 검증

### 9. VDP 품질 확인
```bash
echo "⚡ VDP Quality Gates:"

# 필수 필드 완성도 확인
bq query --use_legacy_sql=false "
SELECT 
  'Field Completeness Check' as check_type,
  COUNT(*) as total_records,
  COUNT(content_key) as content_key_count,
  COUNT(content_id) as content_id_count,
  COUNT(JSON_VALUE(metadata, '$.platform')) as platform_count,
  COUNT(JSON_VALUE(metadata, '$.language')) as language_count,
  COUNT(load_timestamp) as load_timestamp_count,
  COUNT(load_date) as load_date_count,
  ROUND(COUNT(content_key) * 100.0 / COUNT(*), 2) as completeness_percentage
FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\`
WHERE load_date = CURRENT_DATE()"

# Hook Gate 통과율 확인
bq query --use_legacy_sql=false "
SELECT 
  'Hook Gate Validation' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN CAST(JSON_VALUE(overall_analysis, '$.hookGenome.start_sec') AS FLOAT64) <= 3.0 
             AND CAST(JSON_VALUE(overall_analysis, '$.hookGenome.strength_score') AS FLOAT64) >= 0.70 
        THEN 1 END) as hook_gate_passed,
  ROUND(COUNT(CASE WHEN CAST(JSON_VALUE(overall_analysis, '$.hookGenome.start_sec') AS FLOAT64) <= 3.0 
                    AND CAST(JSON_VALUE(overall_analysis, '$.hookGenome.strength_score') AS FLOAT64) >= 0.70 
               THEN 1 END) * 100.0 / COUNT(*), 2) as hook_gate_pass_rate
FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\`
WHERE load_date = CURRENT_DATE()
AND JSON_VALUE(overall_analysis, '$.hookGenome') IS NOT NULL"
```

### 10. 플랫폼별 처리 현황 확인
```bash
echo "📊 Platform Processing Status:"

bq query --use_legacy_sql=false "
SELECT 
  JSON_VALUE(metadata, '$.platform') as platform,
  COUNT(*) as record_count,
  COUNT(DISTINCT content_key) as unique_content,
  MIN(load_timestamp) as first_processed,
  MAX(load_timestamp) as last_processed,
  COUNT(CASE WHEN JSON_VALUE(overall_analysis, '$.hookGenome') IS NOT NULL THEN 1 END) as hook_genome_count,
  COUNT(CASE WHEN evidence_pack IS NOT NULL THEN 1 END) as evidence_pack_count
FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\`
WHERE load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
GROUP BY platform
ORDER BY platform"
```

## ✅ 체크리스트 완료 확인

### 최종 검증 스크립트
```bash
#!/bin/bash
echo "🎯 Final Operational Readiness Check:"

# 각 체크항목별 점수 계산
SCORE=0
TOTAL_CHECKS=10

echo "1. Cloud Run Service Status..." 
gcloud run services describe t2-vdp --region=us-central1 > /dev/null 2>&1 && { echo "  ✅ Pass"; ((SCORE++)); } || echo "  ❌ Fail"

echo "2. Environment Variables..."
ENV_COUNT=$(gcloud run services describe t2-vdp --region=us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[*].name)" | wc -w)
[[ $ENV_COUNT -ge 6 ]] && { echo "  ✅ Pass ($ENV_COUNT vars)"; ((SCORE++)); } || echo "  ❌ Fail ($ENV_COUNT vars)"

echo "3. ID Token Generation..."
TOKEN=$(gcloud auth print-identity-token 2>/dev/null)
[[ -n "$TOKEN" ]] && { echo "  ✅ Pass"; ((SCORE++)); } || echo "  ❌ Fail"

echo "4. Service Health Check..."
SERVICE_URL=$(gcloud run services describe t2-vdp --region=us-central1 --format="value(status.url)")
curl -s -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health" > /dev/null && { echo "  ✅ Pass"; ((SCORE++)); } || echo "  ❌ Fail"

echo "5. RAW Bucket Access..."
gsutil ls gs://tough-variety-raw-central1/raw/vdp/ > /dev/null 2>&1 && { echo "  ✅ Pass"; ((SCORE++)); } || echo "  ❌ Fail"

echo "6. GOLD Bucket Access..."
gsutil ls gs://tough-variety-gold-central1/ > /dev/null 2>&1 && { echo "  ✅ Pass"; ((SCORE++)); } || echo "  ❌ Fail"

echo "7. BigQuery Table Access..."
bq show tough-variety-466003-c5:vdp_dataset.vdp_gold > /dev/null 2>&1 && { echo "  ✅ Pass"; ((SCORE++)); } || echo "  ❌ Fail"

echo "8. Recent VDP Data..."
RECENT_COUNT=$(bq query --use_legacy_sql=false --format=csv "SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE load_date = CURRENT_DATE()" 2>/dev/null | tail -n1)
[[ $RECENT_COUNT -gt 0 ]] && { echo "  ✅ Pass ($RECENT_COUNT records)"; ((SCORE++)); } || echo "  ❌ Fail ($RECENT_COUNT records)"

echo "9. Hook Genome Integration..."
HOOK_COUNT=$(bq query --use_legacy_sql=false --format=csv "SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE JSON_VALUE(overall_analysis, '$.hookGenome.pattern_code') IS NOT NULL AND load_date = CURRENT_DATE()" 2>/dev/null | tail -n1)
[[ $HOOK_COUNT -gt 0 ]] && { echo "  ✅ Pass ($HOOK_COUNT records)"; ((SCORE++)); } || echo "  ❌ Fail ($HOOK_COUNT records)"

echo "10. Evidence Pack Integration..."
EVIDENCE_COUNT=$(bq query --use_legacy_sql=false --format=csv "SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE evidence_pack IS NOT NULL AND load_date = CURRENT_DATE()" 2>/dev/null | tail -n1)
[[ $EVIDENCE_COUNT -gt 0 ]] && { echo "  ✅ Pass ($EVIDENCE_COUNT records)"; ((SCORE++)); } || echo "  ❌ Fail ($EVIDENCE_COUNT records)"

echo ""
echo "🎯 Overall Score: $SCORE/$TOTAL_CHECKS ($(echo "scale=1; $SCORE*100/$TOTAL_CHECKS" | bc)%)"

if [[ $SCORE -ge 8 ]]; then
    echo "✅ SYSTEM READY FOR PRODUCTION LOAD"
    echo "   Ready for multi-platform batch processing"
    exit 0
elif [[ $SCORE -ge 6 ]]; then
    echo "⚠️  SYSTEM PARTIALLY READY"
    echo "   Review failing checks before production load"
    exit 1
else
    echo "❌ SYSTEM NOT READY"
    echo "   Critical issues must be resolved"
    exit 2
fi
```

## 📝 실행 가이드

1. **스크립트 저장**: 위 내용을 `operational-check.sh`로 저장
2. **권한 설정**: `chmod +x operational-check.sh`
3. **실행**: `./operational-check.sh`
4. **결과 확인**: 8/10 이상 통과 시 운영 준비 완료

## 🔄 정기 점검 주기

- **일일**: Health Check, 최근 데이터 확인
- **주간**: 전체 체크리스트 실행
- **대량 처리 전**: 반드시 전체 체크리스트 실행
- **배포 후**: 즉시 전체 체크리스트 실행

## 📞 문제 발생 시 대응

1. **점수 6-7**: 경고 수준, 비핵심 기능 문제 가능성
2. **점수 5 이하**: 운영 중단, 즉시 조치 필요
3. **긴급 연락**: 인프라팀 또는 DevOps 팀 호출

---
**Last Updated**: 2025-08-19  
**Version**: 1.4.0  
**Compatible with**: t2-extract v1.4.0, VDP Pipeline v1.4.0