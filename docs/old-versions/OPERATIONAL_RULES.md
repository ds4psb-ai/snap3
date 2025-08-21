# VDP 운영 규칙 v2.1 - 리전 정렬 정책

## 개요
VDP (Video Detail Processing) 시스템의 리전 정렬 및 환경변수 관리 정책

## 핵심 변경사항 (2025-08-17)

### 1. Regional Alignment Policy v1.3.1
**정책**: Event 기반 파이프라인의 지연 최소화를 위한 리전 통합

#### 필수 환경변수
```bash
export PROJECT_ID="tough-variety-466003-c5"
export REGION="us-central1"
export RAW_BUCKET="tough-variety-raw-central1"
```

#### 검증 규칙
- ✅ **RAW_BUCKET 동적 설정**: `process.env.RAW_BUCKET || 'tough-variety-raw-central1'`
- ✅ **리전 정렬 검증**: startup 시 environment validation 수행
- ✅ **플랫폼 경로 분리**: `gs://{bucket}/ingest/requests/{platform}/`

#### 위반 시 조치
- 🟡 기본 버킷 사용 시 **warning 로그** 생성
- 🟢 커스텀 버킷 설정 시 **success 로그** + 최적화 활성화

### 2. JSON-Only Processing Policy v2.0
**정책**: FormData/multipart 차단으로 보안 및 성능 향상

#### 검증 로직
```javascript
if (req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({
        error: 'FORMDATA_MULTIPART_DETECTED',
        message: 'Only JSON submissions are supported'
    });
}
```

#### Content Key 강제 생성
- **형식**: `platform:content_id` (예: `youtube:cFyBJaoNyGY`)
- **목적**: 글로벌 고유성 보장 및 content_id 누락 방지
- **검증**: platform, content_id 필드 필수 입력

### 3. Platform Segmentation Policy v1.2
**정책**: 플랫폼별 저장 경로 분리로 관리 효율성 향상

#### 경로 구조
```
gs://{RAW_BUCKET}/ingest/requests/
├── youtube/
├── instagram/
└── tiktok/
```

#### 메타데이터 헤더
- `vdp-platform`: 플랫폼 식별
- `vdp-content-id`: 콘텐츠 고유 ID
- `vdp-content-key`: 글로벌 키 (`platform:content_id`)
- `vdp-correlation-id`: 요청 추적 ID

## 로깅 및 모니터링

### Enhanced Startup Logging
```javascript
structuredLog('info', 'Server startup initiated', {
    port: PORT,
    rawBucket: RAW_BUCKET,
    region: process.env.REGION,
    features: {
        jsonOnlyProcessing: true,
        platformSegmentation: true,
        contentKeyEnforcement: true,
        regionalAlignment: RAW_BUCKET === 'tough-variety-raw-central1'
    }
});
```

### 경고 및 권장사항
- **기본 버킷 사용 시**: 환경변수 설정 권장 메시지
- **리전 불일치 시**: us-central1 정렬 권장
- **FormData 요청 시**: JSON 전용 처리 안내

## 규정 준수 체크리스트

### 서버 시작 시
- [ ] 환경변수 검증 (RAW_BUCKET, PROJECT_ID, REGION)
- [ ] 리전 정렬 상태 확인
- [ ] 플랫폼 분리 경로 검증
- [ ] JSON 전용 처리 활성화 확인

### 요청 처리 시
- [ ] Content-Type 검증 (JSON only)
- [ ] content_id 및 platform 필수 입력 확인
- [ ] content_key 자동 생성
- [ ] 플랫폼별 경로 적용
- [ ] correlation ID 추적

### 저장 시
- [ ] GCS 메타데이터 헤더 설정
- [ ] 플랫폼 분리 경로 준수
- [ ] 타임스탬프 및 추적 정보 포함

## 에러 코드 정의

### 환경 설정 관련
- `ENV_VAR_MISSING`: 필수 환경변수 누락
- `REGION_MISALIGNMENT`: 리전 정렬 불일치
- `BUCKET_ACCESS_DENIED`: 버킷 접근 권한 오류

### 요청 처리 관련
- `FORMDATA_MULTIPART_DETECTED`: FormData 요청 차단
- `CONTENT_ID_MISSING`: content_id 필수 입력 누락
- `PLATFORM_MISSING`: platform 필수 입력 누락
- `CONTENT_KEY_GENERATION_FAILED`: content_key 생성 실패

### 저장 관련
- `GCS_STORAGE_ERROR`: GCS 저장 실패
- `PLATFORM_PATH_ERROR`: 플랫폼 경로 생성 실패
- `METADATA_HEADER_ERROR`: 메타데이터 헤더 설정 실패

## 성능 벤치마크

### 목표 지표
- **요청 처리 시간**: <500ms (JSON 검증 포함)
- **GCS 저장 시간**: <2s (리전 정렬 시)
- **환경변수 검증**: <10ms (서버 시작 시)

### 모니터링 포인트
- correlation ID 기반 요청 추적
- 플랫폼별 처리량 통계
- 리전 정렬 효과 측정
- 에러율 및 복구 시간 추적

## 버전 히스토리

### v2.1 (2025-08-17)
- Regional Alignment Policy v1.3.1 추가
- Enhanced startup logging 구현
- Environment variable validation 강화

### v2.0 (2025-08-17)
- JSON-Only Processing Policy 도입
- Content Key enforcement 구현
- Platform Segmentation Policy 적용

### v1.0 (기준선)
- 기본 VDP 처리 파이프라인
- 기본 GCS 저장 기능