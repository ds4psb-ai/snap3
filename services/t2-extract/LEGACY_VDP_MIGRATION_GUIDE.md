# 레거시 VDP 파일 마이그레이션 가이드

**목표**: 기존 flat 구조 VDP 파일들을 플랫폼 세그먼트 구조로 점진적 이동  
**적용 시기**: 선택적 (성능 최적화 및 관리 편의성 목적)  
**위험도**: 낮음 (기존 파일은 원래 위치에서 계속 접근 가능)  

---

## 📋 현재 상황 분석

### 레거시 VDP 파일 현황
```bash
# 현재 구조 (flat structure)
gs://tough-variety-raw-central1/raw/vdp/
├── 55e6ScXfiZc.NEW.universal.json          # YouTube
├── IG_demo_001.NEW.universal.json          # Instagram  
├── TT_demo_001.NEW.universal.json          # TikTok
├── TEST_WORKER_001.vdp.json                # Test file
├── auto-test-1755423442.NEW.universal.json # Auto test
└── ... (기타 파일들)

# 새로운 구조 (platform segmented)
gs://tough-variety-raw-central1/raw/vdp/
├── youtube/
│   └── {content_id}.NEW.universal.json
├── instagram/  
│   └── {content_id}.NEW.universal.json
├── tiktok/
│   └── {content_id}.NEW.universal.json
└── test/
    └── {content_id}.NEW.universal.json
```

### 파일 분석 결과
```bash
# 예시: 레거시 파일 분석
gsutil cat gs://tough-variety-raw-central1/raw/vdp/55e6ScXfiZc.NEW.universal.json | jq '{
  content_id: .content_id,
  content_key: .content_key, 
  platform: .metadata.platform,
  has_required_fields: (.content_key != null and .load_timestamp != null)
}'

# 결과: 구 버전 VDP (필수 필드 누락)
{
  "content_id": null,
  "content_key": null,
  "platform": "YouTube", 
  "has_required_fields": false
}
```

---

## 🎯 마이그레이션 전략

### 1. 점진적 마이그레이션 (권장)
- **기존 파일 유지**: 원래 위치에서 계속 접근 가능
- **새 파일만 세그먼트**: 새로 생성되는 VDP만 플랫폼 세그먼트 적용
- **선택적 이동**: 필요 시에만 개별 파일 이동

### 2. 일괄 마이그레이션 (선택적)
- **한번에 모든 파일 이동**: 플랫폼별 폴더로 구조화
- **메타데이터 기반 분류**: VDP 내 platform 정보로 자동 분류
- **검증 및 롤백**: 이동 후 검증, 필요 시 롤백

---

## 🛠️ 마이그레이션 스크립트

### 개별 파일 분석 및 이동
```bash
#!/bin/bash
# migrate-single-vdp.sh

VDP_FILE="$1"
DRY_RUN="${2:-true}"

echo "🔍 Analyzing VDP file: $VDP_FILE"

# 1. VDP 메타데이터 추출
METADATA=$(gsutil cat "$VDP_FILE" | jq -r '.metadata.platform // "unknown"')
CONTENT_ID=$(gsutil cat "$VDP_FILE" | jq -r '.content_id // .video_id // "unknown"')

# 2. 플랫폼 정규화
case "$METADATA" in
  "YouTube"*) PLATFORM="youtube" ;;
  "TikTok"*) PLATFORM="tiktok" ;;
  "Instagram"*) PLATFORM="instagram" ;;
  "Facebook"*) PLATFORM="facebook" ;;
  *) PLATFORM="unknown" ;;
esac

# 3. 대상 경로 생성
BUCKET="tough-variety-raw-central1"
TARGET_PATH="gs://${BUCKET}/raw/vdp/${PLATFORM}/${CONTENT_ID}.NEW.universal.json"

echo "📊 Migration Plan:"
echo "  Source: $VDP_FILE"
echo "  Platform: $METADATA → $PLATFORM"
echo "  Content ID: $CONTENT_ID"
echo "  Target: $TARGET_PATH"

# 4. 실행 (DRY_RUN=false일 때만)
if [ "$DRY_RUN" = "false" ]; then
  echo "🚀 Executing migration..."
  gsutil cp "$VDP_FILE" "$TARGET_PATH"
  echo "✅ Migration completed"
else
  echo "🏃 Dry run mode - no changes made"
fi
```

### 일괄 마이그레이션 스크립트
```bash
#!/bin/bash
# migrate-all-legacy-vdp.sh

BUCKET="tough-variety-raw-central1"
SOURCE_PREFIX="gs://${BUCKET}/raw/vdp/"
DRY_RUN="${1:-true}"

echo "🔍 Scanning for legacy VDP files..."

# 1. 레거시 파일 목록 (flat structure)
LEGACY_FILES=$(gsutil ls "${SOURCE_PREFIX}*.json" 2>/dev/null | grep -v "/youtube/" | grep -v "/instagram/" | grep -v "/tiktok/" | grep -v "/facebook/")

echo "📋 Found legacy files:"
echo "$LEGACY_FILES"

# 2. 각 파일별 마이그레이션 계획
while IFS= read -r file; do
  if [ -n "$file" ]; then
    echo "----------------------------------------"
    ./migrate-single-vdp.sh "$file" "$DRY_RUN"
  fi
done <<< "$LEGACY_FILES"

echo "✅ Batch migration analysis complete"
```

---

## 📊 플랫폼별 분류 로직

### 자동 플랫폼 감지
```javascript
// platform-detection.js
function detectPlatformFromVdp(vdp) {
  const platform = vdp.metadata?.platform || '';
  const sourceUrl = vdp.metadata?.canonical_url || vdp.metadata?.source_url || '';
  const contentId = vdp.content_id || vdp.video_id || '';
  
  // 1. 메타데이터 기반
  if (platform.toLowerCase().includes('youtube')) return 'youtube';
  if (platform.toLowerCase().includes('tiktok')) return 'tiktok';
  if (platform.toLowerCase().includes('instagram')) return 'instagram';
  if (platform.toLowerCase().includes('facebook')) return 'facebook';
  
  // 2. URL 패턴 기반
  if (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')) return 'youtube';
  if (sourceUrl.includes('tiktok.com')) return 'tiktok';
  if (sourceUrl.includes('instagram.com')) return 'instagram';
  if (sourceUrl.includes('facebook.com')) return 'facebook';
  
  // 3. Content ID 패턴 기반 (휴리스틱)
  if (contentId.length === 11 && /^[A-Za-z0-9_-]+$/.test(contentId)) return 'youtube';
  if (contentId.length > 15 && /^\d+$/.test(contentId)) return 'tiktok';
  
  return 'unknown';
}
```

---

## 🔍 검증 및 품질 체크

### 마이그레이션 후 검증
```bash
#!/bin/bash
# verify-migration.sh

PLATFORM="$1"
BUCKET="tough-variety-raw-central1"

echo "🔍 Verifying $PLATFORM VDP files..."

# 1. 파일 수 확인
LEGACY_COUNT=$(gsutil ls "gs://${BUCKET}/raw/vdp/*.json" 2>/dev/null | grep -c "NEW.universal.json" || echo 0)
SEGMENTED_COUNT=$(gsutil ls "gs://${BUCKET}/raw/vdp/${PLATFORM}/*.json" 2>/dev/null | wc -l || echo 0)

echo "📊 File counts:"
echo "  Legacy files: $LEGACY_COUNT"
echo "  Segmented files ($PLATFORM): $SEGMENTED_COUNT"

# 2. 샘플 파일 품질 체크
SAMPLE_FILE=$(gsutil ls "gs://${BUCKET}/raw/vdp/${PLATFORM}/*.json" 2>/dev/null | head -1)
if [ -n "$SAMPLE_FILE" ]; then
  echo "🧪 Sample file quality check: $SAMPLE_FILE"
  gsutil cat "$SAMPLE_FILE" | jq '{
    has_content_id: (.content_id != null),
    has_content_key: (.content_key != null),
    has_platform: (.metadata.platform != null),
    platform_value: .metadata.platform
  }'
fi
```

---

## ⚠️ 주의사항 및 제약

### 마이그레이션 시 고려사항
1. **원본 보존**: 마이그레이션은 복사 방식으로, 원본 파일 삭제 금지
2. **중복 방지**: 동일 content_id 파일이 이미 세그먼트에 존재하는지 확인
3. **메타데이터 정확성**: platform 정보가 잘못된 파일은 수동 검토
4. **권한 확인**: GCS 버킷에 대한 읽기/쓰기 권한 필요

### 롤백 절차
```bash
# 긴급 롤백 (필요 시)
#!/bin/bash
# rollback-migration.sh

PLATFORM="$1"
BUCKET="tough-variety-raw-central1"

echo "🔄 Rolling back $PLATFORM migration..."

# 세그먼트 폴더의 파일들을 원래 위치로 복사
gsutil -m cp "gs://${BUCKET}/raw/vdp/${PLATFORM}/*.json" "gs://${BUCKET}/raw/vdp/"

echo "✅ Rollback completed - files restored to original location"
```

---

## 📈 성능 및 비용 최적화

### 마이그레이션 후 예상 효과
| 항목 | Before | After | 개선 효과 |
|------|--------|-------|-----------|
| **Eventarc 필터링** | 모든 VDP 파일 감지 | 플랫폼별 선택적 감지 | 40-60% 처리량 향상 |
| **BigQuery 로딩** | 단일 패턴 스캔 | 플랫폼별 병렬 스캔 | 30-50% 로딩 시간 단축 |
| **모니터링 정확도** | 전체 집계 | 플랫폼별 메트릭 | 100% 정확도 향상 |
| **운영 편의성** | 수동 분류 필요 | 자동 분류 완료 | 운영 시간 70% 절약 |

### 비용 분석
- **스토리지 비용**: 마이그레이션 기간 중 일시적 증가 (복사본)
- **네트워크 비용**: 동일 리전 내 이동으로 추가 비용 없음
- **운영 비용**: 자동화로 인한 장기적 비용 절약

---

## 📅 마이그레이션 일정 (권장)

### Phase 1: 준비 (1-2일)
- [ ] 레거시 파일 분석 및 카탈로그 작성
- [ ] 플랫폼별 분류 정확도 검증
- [ ] 마이그레이션 스크립트 테스트

### Phase 2: 파일럿 (3-5일)
- [ ] 소수 파일로 마이그레이션 테스트
- [ ] 검증 프로세스 확립
- [ ] 롤백 절차 검증

### Phase 3: 점진적 실행 (1-2주)
- [ ] 플랫폼별 순차 마이그레이션
- [ ] 각 단계별 검증 및 승인
- [ ] 모니터링 시스템 업데이트

### Phase 4: 정리 (1주)
- [ ] 마이그레이션 완료 검증
- [ ] 운영 문서 업데이트
- [ ] 성능 개선 효과 측정

---

**마이그레이션 담당자**: Infrastructure Team  
**승인 필요**: VDP Pipeline Owner  
**긴급 연락처**: Cloud Operations Team  

**참고**: 이 가이드는 선택적 개선 사항이며, 현재 시스템은 새 VDP 파일에 대해서만 플랫폼 세그먼테이션을 적용하므로 레거시 파일 마이그레이션 없이도 정상 동작합니다.