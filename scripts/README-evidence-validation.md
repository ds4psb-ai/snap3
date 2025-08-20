# VDP Evidence Pack 검증 시스템

Storage T4 폴링·검증 스크립트 확장 작업 완료

## 개요

최종 VDP가 GCS에 내려오면 동일 BGM 배지/제품 Evidence를 확인하는 검증 시스템을 구현했습니다.

## 구현된 파일들

### 1. `validate-vdp-evidence.sh` - 메인 검증 스크립트
```bash
./scripts/validate-vdp-evidence.sh <VDP_FILE> [CONTENT_ID]
```

**검증 항목:**
- ✅ 메타 필수 필드 (content_id, platform, scenes 수)
- ✅ BGM 클러스터링 (cluster_id, confidence)
- ✅ 오디오 지문 (ChromaPrint hash)
- ✅ 브랜드/제품 감지 (product_mentions, brand_detection_metrics)
- ✅ Hook Genome (strength ≥0.70, start ≤3s)

**출력 형식:**
- 구조화된 JSON 로그 (stderr)
- 사람이 읽기 쉬운 진행상황 (stdout)
- Evidence Pack 요약 리포트

### 2. `run-evidence-validation.sh` - 독립 실행 래퍼
```bash
./scripts/run-evidence-validation.sh [CONTENT_ID] [GCS_URI]
```

**기능:**
- GCS에서 VDP 파일 자동 다운로드
- 기본값: CID="55e6ScXfiZc", GCS="gs://tough-variety-raw/raw/vdp/${CID}.NEW.universal.json"
- 검증 결과 요약 리포트 생성

### 3. `poll-vdp.sh` - 기존 폴링 스크립트 확장
기존 v2.1 폴링 시스템에 Evidence 검증 자동 실행 기능 추가:

```bash
# VDP 다운로드 완료 후 자동 검증 실행
# Evidence Pack 검증 실행
SCRIPT_DIR=$(dirname "$0")
if [[ -x "$SCRIPT_DIR/validate-vdp-evidence.sh" ]]; then
  log_event "INFO" "Running Evidence Pack validation" "$CONTENT_ID"
  echo ""
  echo "🔍 Starting Evidence Pack validation..."
  
  if "$SCRIPT_DIR/validate-vdp-evidence.sh" "$DEST" "$CONTENT_ID"; then
    log_event "SUCCESS" "Evidence Pack validation completed successfully" "$CONTENT_ID"
  else
    log_event "WARN" "Evidence Pack validation completed with warnings or errors" "$CONTENT_ID"
  fi
fi
```

## 사용 예시

### 1. 기본 검증 (55e6ScXfiZc)
```bash
cd /Users/ted/snap3
./scripts/run-evidence-validation.sh
```

### 2. 커스텀 Content ID와 GCS URI
```bash
./scripts/run-evidence-validation.sh ABC123 gs://my-bucket/vdp/ABC123.NEW.universal.json
```

### 3. 기존 로컬 파일 검증
```bash
./scripts/validate-vdp-evidence.sh ./out/vdp/55e6ScXfiZc.NEW.v5.json 55e6ScXfiZc
```

### 4. 폴링과 검증 통합 실행
```bash
./scripts/poll-vdp.sh "gs://tough-variety-raw/raw/vdp/55e6ScXfiZc.NEW.universal.json" "./out/vdp/55e6ScXfiZc.downloaded.json"
```

## 검증 결과 해석

### 검증 상태
- **PASSED**: 모든 검증 통과
- **PASSED_WITH_WARNINGS**: 일부 경고가 있지만 통과
- **FAILED**: 검증 실패

### Evidence Pack 필드

#### Meta Validation
```json
{
  "content_id": "rabbit_late_for_work_anticlimax",
  "platform": "YouTube", 
  "scenes_count": 4,
  "required_fields_present": true
}
```

#### BGM Validation
```json
{
  "cluster_id": "null",
  "confidence": null,
  "chromaprint_hash": "null",
  "bgm_analysis_present": false
}
```

#### Brand Validation
```json
{
  "product_mentions": [
    {
      "name": "KANGOL",
      "type": "brand",
      "promotion_status": "organic",
      "evidence": [...]
    }
  ],
  "brand_metrics": {...},
  "detected_brands_count": 1,
  "brand_detection_present": true
}
```

#### Hook Validation
```json
{
  "strength_score": 0.9,
  "start_sec": 0,
  "pattern_code": "[\"relatability\", \"pattern_break\"]",
  "hook_gate_pass": true
}
```

## 로깅 시스템

### 구조화된 JSON 로그 (stderr)
```json
{
  "timestamp": "2025-08-17T15:08:55+09:00",
  "level": "INFO",
  "content_id": "55e6ScXfiZc", 
  "message": "Hook Gate PASSED: strength=0.9, start=0",
  "script": "validate-vdp-evidence.sh"
}
```

### 사람이 읽기 쉬운 로그 (stdout)
```
[2025-08-17T15:08:55+09:00] INFO: Hook Gate PASSED: strength=0.9, start=0
```

## 오류 처리 및 복구

### 안전한 JSON 처리
- `safe_jq()` 함수로 제어 문자 및 파싱 오류 처리
- 필드가 없거나 손상된 경우 기본값 반환
- JSON 구조 검증 후 필드 추출

### 검증 실패 시 권장사항
스크립트가 자동으로 개선 권장사항을 제공:

```json
{
  "recommendations": [
    "Run BGM clustering analysis for content similarity",
    "Execute brand/product detection analysis", 
    "Complete Hook Genome analysis",
    "Hook does not meet quality gates (≥0.70 strength, ≤3s start)"
  ]
}
```

## Evidence Pack 시스템 연동

### 오디오 지문 검증
- ChromaPrint 기반 오디오 해시 확인
- BGM 클러스터 ID 및 신뢰도 점수 검증
- 동일 BGM 배지 시스템과 연동

### 브랜드/제품 감지
- 브랜드 멘션 목록 검증
- 브랜드 감지 메트릭 확인
- 오가닉 vs 스폰서 콘텐츠 분류

### Hook Genome 검증
- Hook 강도 점수 ≥0.70 확인
- Hook 시작 시간 ≤3초 확인
- Hook 패턴 코드 분석

## 성능 최적화

### 병렬 실행 지원
기존 `parallel-poll-manager.sh`와 완전 호환:

```bash
./scripts/parallel-poll-manager.sh \
  "gs://bucket/vdp/youtube_id.NEW.universal.json" \
  "gs://bucket/vdp/instagram_id.NEW.universal.json" \
  "gs://bucket/vdp/tiktok_id.NEW.universal.json"
```

### 캐싱 및 재사용
- 로컬 VDP 파일 재사용
- GCS 다운로드 상태 확인
- 검증 결과 캐싱

## 테스트 결과

### 실제 VDP 파일 테스트 성공
```bash
$ ./scripts/run-evidence-validation.sh 55e6ScXfiZc

✅ Content ID: rabbit_late_for_work_anticlimax
✅ Platform: YouTube  
✅ Scenes: 4 scenes
✅ Hook Gate PASSED: strength=0.9, start=0
⚠️  BGM clustering analysis missing
⚠️  Brand detection present (KANGOL detected)

Result: PASSED_WITH_WARNINGS
```

### 시스템 통합 검증
- 기존 폴링 스크립트 v2.1과 완전 호환
- Evidence 검증 자동 실행
- 구조화된 로깅 시스템 통합
- 오류 복구 및 권장사항 제공

## 다음 단계

1. **BGM 클러스터링 분석 추가**: ChromaPrint 기반 오디오 지문 생성
2. **브랜드 감지 강화**: 더 정확한 브랜드/제품 감지 알고리즘  
3. **Evidence Pack 확장**: 추가적인 메타데이터 및 분석 결과
4. **BigQuery 연동**: 검증 결과 자동 업로드
5. **실시간 모니터링**: 검증 결과 대시보드 및 알림