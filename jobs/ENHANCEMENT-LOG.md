# Worker Ingest v2 Enhancement Log

## 2025-08-17 Regional Alignment Policy v1.3.1 통합

### 🚀 핵심 개선사항

#### 1. Regional Alignment Policy v1.3.1 통합
- **목적**: us-central1 리전 강제 및 교차 리전 접근 모니터링
- **구현**: `validate_regional_alignment()` 함수로 시작 시 검증
- **기능**:
  - GCS 버킷 리전 검증 (tough-variety-raw-central1)
  - VDP 서비스 엔드포인트 리전 검증 (us-central1)
  - Platform segmentation 경로 검증 (`/requests` suffix 필수)
- **모니터링**: `monitor_cross_region_access()` 함수로 서비스 상태 추적

#### 2. 플랫폼별 분기 아키텍처 (Platform Segmentation)
- **이전**: 단일 경로 폴링 (`gs://bucket/ingest/requests/`)
- **개선**: 플랫폼별 경로 분리 (`/youtube/`, `/instagram/`, `/tiktok/`)
- **충돌 방지**: Content key 기반 중복 처리 방지 (`platform:content_id`)
- **검증**: 각 플랫폼별 GCS 경로 구조 강제 (`validate_platform_segmentation()`)

#### 3. Content ID 보정 시스템
- **문제**: null_* 파일 생성으로 인한 처리 실패
- **해결**: `correct_content_id()` 함수로 다중 소스에서 content_id 추출
  - JSON 파일 content_id 필드
  - URL에서 자동 추출 (YouTube ID, TikTok ID 등)
  - 파일명에서 패턴 매칭
- **전역 유니크**: `platform:content_id` 형식으로 content_key 생성

#### 4. 구조화된 로깅 시스템
- **Correlation ID**: 요청별 고유 추적 ID 생성
- **성능 메트릭**: 각 단계별 수행 시간 측정 (`start_timer()`, `calculate_duration()`)
- **RFC 9457 에러**: 표준화된 Problem Details 에러 응답
- **로그 레벨**: DEBUG, INFO, WARNING, ERROR 구분
- **형식**: `[timestamp] [level] [correlation_id=xxx] message`

#### 5. macOS 호환성 개선
- **문제**: `${var,,}` 소문자 변환 문법 미지원
- **해결**: `tr '[:upper:]' '[:lower:]'` 명령어로 대체
- **영향**: 모든 플랫폼 비교 로직에서 안정적 동작

#### 6. 환경 변수 표준화
- **추가**: `PLATFORM_SEGMENTED_PATH=true`, `REQUIRED_REGION=us-central1`
- **표준화**: 모든 GCS 경로를 PREFIX 형태로 관리
- **보안**: API 키 및 민감 정보 환경 변수 분리

### 🔧 기술적 세부사항

#### 새로운 함수들
1. `validate_regional_alignment()` - 리전 정책 검증
2. `monitor_cross_region_access()` - 교차 리전 접근 모니터링  
3. `validate_platform_segmentation()` - 플랫폼 경로 검증
4. `correct_content_id()` - Content ID 보정
5. `validate_content_key_format()` - Content key 형식 검증
6. `generate_correlation_id()` - 추적 ID 생성
7. `log_with_correlation()` - 구조화된 로깅
8. `log_problem_details()` - RFC 9457 에러 로깅
9. `start_timer()`, `calculate_duration()` - 성능 측정

#### 처리 플로우 개선
```
1. Regional Alignment 검증 (시작 시)
2. 플랫폼별 요청 폴링 (youtube/, instagram/, tiktok/)
3. Content ID 보정 및 Content Key 생성
4. 중복 처리 방지 (.done 마커 체크)
5. 플랫폼별 처리 분기
   - YouTube: yt-dlp → Evidence Pack → VDP 트리거
   - Instagram/TikTok: 메타데이터만 스테이징
6. 성공/실패 로깅 및 정리
```

### 📊 성능 개선
- **중복 방지**: Content key 기반으로 동일 요청 재처리 차단
- **병렬 안전**: 플랫폼별 분리로 교차 간섭 제거
- **모니터링**: 실시간 성능 메트릭 및 상태 추적
- **에러 복구**: RFC 9457 표준으로 명확한 에러 분류

### 🛡️ 보안 및 안정성
- **리전 고정**: us-central1 강제로 데이터 지역성 보장
- **경로 검증**: 모든 GCS 경로에 대한 플랫폼 세그먼트 검증
- **상태 추적**: Correlation ID로 end-to-end 요청 추적
- **Graceful 실패**: 개별 요청 실패가 전체 워커에 영향 없음

### 🔄 호환성
- **하위 호환**: 기존 요청 형식 지원
- **점진적 마이그레이션**: 플랫폼별 경로로 자동 라우팅
- **macOS/Linux**: 양쪽 환경에서 안정적 동작

### 📋 다음 단계
1. ✅ 프로덕션 배포 및 테스트 완료
2. ⏳ 실제 YouTube 요청으로 end-to-end 테스트 
3. ⏳ Instagram/TikTok 수동 처리 플로우 테스트
4. ⏳ 성능 메트릭 모니터링 및 최적화

---
*Enhancement completed: 2025-08-17T21:24:00Z*
*Regional Alignment Policy: v1.3.1*
*Worker Version: v2 (Platform-Segmented)*