# Platform Segmentation Architecture v2.0

## 개요

플랫폼별 분기·충돌 방지·content_id 보정을 통한 안정적인 멀티플랫폼 처리 시스템

## 아키텍처 설계

### 1. 경로 분리 시스템

#### 기존 구조 (v1)
```
gs://bucket/ingest/requests/
├── request1.json (플랫폼 혼재)
├── request2.json
└── ...
```

**문제점**:
- 플랫폼 간 ID 충돌 (youtube:123 vs tiktok:123)
- 교차 오염 (Instagram 요청이 YouTube 로직에서 처리)
- 중복 처리 어려움

#### 개선된 구조 (v2)
```
gs://bucket/ingest/requests/
├── youtube/
│   ├── dQw4w9WgXcQ.json
│   ├── abc123xyz.json
│   └── .gitkeep
├── instagram/
│   ├── CX1234567.json
│   └── .gitkeep
└── tiktok/
    ├── 1234567890.json
    └── .gitkeep
```

**장점**:
- 플랫폼별 완전 분리
- 동일 ID 충돌 방지
- 플랫폼별 처리 로직 분기 가능

### 2. Content Key 시스템

#### 전역 유니크 키 생성
```bash
# 형식: platform:content_id
youtube:dQw4w9WgXcQ
instagram:CX1234567
tiktok:1234567890
```

#### Content ID 보정 프로세스
```yaml
소스_우선순위:
  1. JSON.content_id 필드 직접 읽기
  2. JSON.url에서 자동 추출
     - YouTube: /watch?v=([^&]+), /shorts/([^/?]+)
     - Instagram: /p/([^/?]+), /reel/([^/?]+)  
     - TikTok: /@[^/]+/video/(\d+)
  3. 파일명에서 패턴 매칭
     - 확장자 제거 후 ID 형식 검증
  4. 실패 시 CONTENT_KEY_MISSING 에러

중복_방지:
  done_marker: ".{content_key}.done"
  체크_로직: "같은 content_key로 이미 처리된 경우 스킵"
  정리_전략: "성공 후 .done 마커 생성"
```

### 3. 플랫폼별 처리 분기

#### YouTube 파이프라인 (자동 처리)
```yaml
단계:
  1. yt-dlp 비디오 다운로드 (720p 제한)
  2. Evidence Pack 생성 (오디오 지문 + 제품 감지)
  3. GCS 업로드 (플랫폼별 경로)
  4. T2 VDP 서비스 비동기 트리거
  5. .done 마커 생성

경로_구조:
  input: "gs://bucket/raw/input/youtube/{content_id}.mp4"
  evidence: "gs://bucket/raw/vdp/evidence/youtube/"
  output: "gs://bucket/raw/vdp/youtube/{content_id}.NEW.universal.json"
```

#### Instagram/TikTok 파이프라인 (메타데이터 전용)
```yaml
단계:
  1. 메타데이터 JSON 파싱
  2. BigQuery 스테이징 테이블 삽입
  3. .done 마커 생성 (비디오 다운로드 스킵)

경로_구조:
  staging: "gs://bucket/staging/social_metadata/{platform}/"
  bigquery: "social_ingest.link_requests"
```

### 4. Regional Alignment Policy v1.3.1

#### 리전 통일 요구사항
```yaml
필수_리전: "us-central1"
구성요소:
  - GCS_버킷: "tough-variety-raw-central1"
  - VDP_서비스: "t2-vdp-355516763169.us-central1.run.app"
  - Vertex_AI: "us-central1 (gemini-2.5-pro 지원 확인)"
  
검증_시점:
  - 워커_시작시: validate_regional_alignment()
  - 각_반복마다: monitor_cross_region_access()
  
교차리전_처리:
  경고_로그: "VDP service not in optimal region"
  성능_추적: "estimated_latency 측정"
  자동_복구: "없음 (수동 설정 변경 필요)"
```

#### Platform Segmentation 검증
```yaml
경로_구조_검증:
  요구사항: "REQ_PREFIX must end with /requests"
  활성화: "PLATFORM_SEGMENTED_PATH=true"
  검증_함수: validate_platform_segmentation()
  
지원_플랫폼:
  - youtube: 비디오 다운로드 + 전체 파이프라인
  - instagram: 메타데이터만 수집
  - tiktok: 메타데이터만 수집

에러_코드:
  - PLATFORM_SEGMENTATION_MISSING: "/requests suffix 누락"
  - INVALID_GCS_PATH_STRUCTURE: "플랫폼 세그먼트 없음"
  - CROSS_REGION_ACCESS_DETECTED: "리전 정책 위반"
```

## 구현 세부사항

### 환경 변수 설정
```bash
# Regional Alignment
export REQUIRED_REGION="us-central1"
export PLATFORM_SEGMENTED_PATH="true"

# GCS 경로 (플랫폼별 자동 확장)
export REQ_PREFIX="gs://tough-variety-raw-central1/ingest/requests"
export EVID_PREFIX="gs://tough-variety-raw-central1/raw/vdp/evidence"
export INPUT_PREFIX="gs://tough-variety-raw-central1/raw/input"
export OUT_VDP_PREFIX="gs://tough-variety-raw-central1/raw/vdp"

# VDP 서비스
export US_T2="https://t2-vdp-355516763169.us-central1.run.app"
```

### 핵심 함수들

#### 플랫폼 요청 폴링
```bash
get_platform_requests() {
    # 각 플랫폼 디렉토리에서 JSON 파일 검색
    gsutil ls "${REQ_PREFIX}/youtube/*.json" 2>/dev/null || true
    gsutil ls "${REQ_PREFIX}/instagram/*.json" 2>/dev/null || true  
    gsutil ls "${REQ_PREFIX}/tiktok/*.json" 2>/dev/null || true
}
```

#### Content ID 보정
```bash
correct_content_id() {
    local content_key="$1"
    local platform="$2"
    local content_id="$3"
    local correlation_id="$4"
    
    # 1. JSON에서 직접 읽기
    if [[ -n "$content_id" && "$content_id" != "null" ]]; then
        echo "$content_id"
        return 0
    fi
    
    # 2. URL에서 추출
    local url="$(jq -r '.url // empty' "$local_json")"
    if [[ -n "$url" ]]; then
        extract_content_id_from_url "$url" "$platform"
        return 0
    fi
    
    # 3. 파일명에서 추출
    local filename="$(basename "$gcs_path" .json)"
    if validate_content_id_format "$filename" "$platform"; then
        echo "$filename"
        return 0
    fi
    
    return 1
}
```

#### Content Key 검증
```bash
validate_content_key_format() {
    local content_key="$1"
    local platform="$2"
    local correlation_id="$3"
    
    # 형식 검증: platform:content_id
    if [[ "$content_key" != *":"* ]]; then
        log_problem_details "INVALID_CONTENT_KEY_FORMAT" \
            "Invalid content key format" \
            "Expected format: platform:content_id, got: $content_key" \
            "$correlation_id"
        return 1
    fi
    
    # 플랫폼 검증 (소문자 변환으로 macOS 호환)
    platform_lower="$(echo "$platform" | tr '[:upper:]' '[:lower:]')"
    case "$platform_lower" in
        "youtube"|"instagram"|"tiktok")
            log_with_correlation "DEBUG" "Platform validation passed: $platform" "$correlation_id"
            ;;
        *)
            log_problem_details "UNSUPPORTED_PLATFORM" \
                "Unsupported platform" \
                "Platform $platform not in supported list" \
                "$correlation_id"
            return 1
            ;;
    esac
    
    return 0
}
```

## 모니터링 및 로깅

### Correlation ID 시스템
```bash
# 형식: worker-v2-timestamp-pid-hash
# 예: worker-v2-1755433158-50259-274cb46a

generate_correlation_id() {
    local timestamp="$(date +%s)"
    local pid="$$"
    local random="$(openssl rand -hex 4 2>/dev/null || xxd -l 4 -p /dev/urandom)"
    echo "worker-v2-${timestamp}-${pid}-${random}"
}
```

### 구조화된 로깅
```bash
log_with_correlation() {
    local level="$1"
    local message="$2"
    local correlation_id="${3:-${CORRELATION_ID:-unknown}}"
    local timestamp="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
    
    echo "[$timestamp] [$level] [correlation_id=$correlation_id] $message"
}
```

### 성능 메트릭
```bash
# 타이머 시작
start_timer() {
    date +%s.%N
}

# 수행 시간 계산
calculate_duration() {
    local start_time="$1"
    local end_time="$(date +%s.%N)"
    echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0.000000000"
}
```

## 에러 처리 (RFC 9457)

### 주요 에러 코드
```yaml
CONTENT_KEY_MISSING:
  상황: "content_id 추출 실패"
  해결: "URL 확인, 파일명 검증, JSON 구조 확인"

PLATFORM_SEGMENTATION_MISSING:
  상황: "/requests suffix 누락"
  해결: "REQ_PREFIX 설정 변경"

INVALID_GCS_PATH_STRUCTURE:
  상황: "플랫폼 세그먼트 경로 오류"
  해결: "GCS 경로에 platform 디렉토리 포함"

CROSS_REGION_ACCESS_DETECTED:
  상황: "리전 정책 위반"
  해결: "모든 서비스를 us-central1로 통일"
```

### Problem Details 형식
```json
{
  "type": "https://github.com/snap3-jobs/problems/content-key-missing",
  "title": "Content key missing after correction attempts",
  "status": 400,
  "detail": "Unable to extract content_id from JSON, URL, or filename",
  "instance": "/worker/ingest/v2/worker-v2-1755433158-50259-274cb46a",
  "correlation_id": "worker-v2-1755433158-50259-274cb46a",
  "context": {
    "platform": "youtube",
    "attempted_sources": ["json.content_id", "url_extraction", "filename_pattern"],
    "file_path": "gs://bucket/ingest/requests/youtube/test.json"
  }
}
```

## 배포 및 운영

### 배포 체크리스트
- [ ] 환경 변수 설정 확인 (.env 파일)
- [ ] GCS 버킷 리전 검증 (us-central1)
- [ ] 플랫폼별 디렉토리 생성 
- [ ] 워커 시작 및 상태 확인
- [ ] 로그 모니터링 설정

### 운영 명령어
```bash
# 워커 관리
npm run worker:start     # 데몬 시작
npm run worker:status    # 상태 확인  
npm run worker:once      # 단일 실행 (테스트)

# 로그 모니터링
tail -f logs/worker.log
grep "ERROR\|WARN" logs/worker.log | tail -20

# 환경 검증
source .env && echo "Regional Policy: $REQUIRED_REGION"
gsutil ls gs://tough-variety-raw-central1/ingest/requests/
```

### 성능 지표
- **폴링 주기**: 10초
- **처리 성공률**: >99%
- **평균 처리 시간**: YouTube 5-10초, Instagram/TikTok 1-3초
- **중복 방지율**: 100% (content_key 기반)

---
*Architecture Version: 2.0*
*Last Updated: 2025-08-17T21:24:00Z*
*Regional Alignment Policy: v1.3.1*