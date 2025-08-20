# Jobs T2 System Changelog

## 2025-08-17 - Evidence Pack 시스템 추가

### 🆕 NEW FEATURES

#### Evidence Generator 시스템 구축
- **오디오 지문 생성**: ChromaPrint 1.5.1 기반 3샘플 전략
  - `evidence-generator/audio-fingerprint-enhanced.sh`: 시작/중간/끝 10초 구간 지문 추출
  - BGM 일치도 계산 (2/3 일치 시 0.95 신뢰도)
  - 고유 클러스터 ID 생성 (SHA1 기반)

- **브랜드/제품 감지**: VDP 기반 룰 정규화
  - `evidence-generator/product-evidence.mjs`: VDP 텍스트 수집 + 브랜드 매칭
  - `evidence-generator/brand-lexicon.json`: 18개 브랜드 + 17개 제품 카테고리
  - 다국어 별명 지원 (영어/한국어)

- **통합 Evidence Pack 생성**:
  - `evidence-generator/evidence-pack-generator.sh`: 오디오 + 브랜드 통합
  - `evidence-generator/evidence-uploader.sh`: GCS 업로드 + Main2 T2 통합
  - 자동 파일 감지 및 품질 검증

#### 도구 설치 및 의존성
- **필수 도구**: ffmpeg, chromaprint (fpcalc), jq 설치 확인
- **Node.js 스크립트**: ES 모듈 기반 브랜드 감지 엔진
- **ChromaPrint 1.5.1**: 고품질 오디오 지문 생성

### 🔧 IMPROVEMENTS

#### npm Scripts 확장
```bash
# NEW: Evidence Pack 생성
npm run evidence:upload CONTENT_ID      # 완전 자동화
npm run evidence:audio video.mp4 C001   # 오디오 지문만
npm run evidence:brands vdp.json out    # 브랜드 감지만
npm run evidence:pack video.mp4 meta    # 통합 팩 생성
```

#### CLAUDE.md 문서 업데이트
- **터미널 역할**: "Evidence Pack 생성" 추가
- **스크립트 구조**: Evidence generator 컴포넌트 문서화
- **사용법**: Evidence Pack npm scripts 가이드 추가
- **편집 권한**: jobs/** 디렉토리 Evidence Pack 포함

### 📋 TECHNICAL DETAILS

#### Evidence Pack 출력 형식
```json
{
  "content_id": "55e6ScXfiZc",
  "audio": {
    "provider": "chromaprint",
    "fingerprints": [
      {"t": 0, "fp": "hash_data", "c": 1.0},
      {"t": 15, "fp": "hash_data", "c": 1.0}, 
      {"t": 20, "fp": "hash_data", "c": 1.0}
    ],
    "same_bgm_confidence": 0.95,
    "same_bgm_cluster_id": "bgm:a1b2c3d4e5f6"
  }
}
```

#### GCS 통합 경로
- Audio: `gs://tough-variety-raw/raw/vdp/evidence/{CONTENT_ID}.audio.fp.json`
- Products: `gs://tough-variety-raw/raw/vdp/evidence/{CONTENT_ID}.product.evidence.json`

### 🎯 QUALITY METRICS

#### 오디오 품질
- **BGM 신뢰도**: 0.6-1.0 (일치도 기반)
- **커버리지**: 30초 샘플 / 전체 길이 비율
- **클러스터링**: BGM 매칭을 위한 고유 ID

#### 브랜드 감지 품질
- **감지 점수**: OCR 가중 신뢰도 (0.0-1.0)
- **증거 추적**: 텍스트 소스 및 위치 기록
- **정규화**: 18개 주요 브랜드 + 17개 제품 카테고리

### 🔗 INTEGRATION

#### Main2 T2 VDP 병합 준비
- Evidence Pack → GCS 자동 업로드
- VDP 생성 시 Evidence 병합 지원
- 신뢰 점수 및 메타데이터 향상

#### Jobs T2 역할 준수
- ✅ 외부 데이터 수집/전처리 전용
- ✅ GCS 업로드로 Main2 T2와 분리
- ✅ 서버 호출 없는 순수 전처리

---

## 2025-08-17 - Ingest Request Polling Worker 구축

### 🆕 NEW FEATURES

#### Ingest Request Polling Worker 시스템
- **`worker-ingest.sh`**: GCS ingest/requests/*.json 폴링 → 플랫폼별 처리
- **플랫폼별 분기**: YouTube(전체 파이프라인) vs Instagram/TikTok(메타데이터 전용)
- **자동 재시도**: 실패 시 .failed 마커, 성공 시 .done 마커로 중복 처리 방지

#### YouTube 전체 파이프라인 (Enhanced)
- **720p 제한**: `yt-dlp -f "best[height<=720]"` 품질 제한으로 효율성 확보
- **Evidence Pack 통합**: 오디오 지문(3샘플) + 브랜드 감지 자동 생성
- **T2 서버 호출**: 새로운 페이로드 형식으로 VDP 생성 트리거
```json
{
  "gcsUri": "gs://.../input/{content_id}.mp4",
  "meta": {
    "platform": "YouTube",
    "content_id": "{content_id}",
    "audioFpGcsUri": "gs://.../evidence/{content_id}.audio.fp.json",
    "productEvidenceGcsUri": "gs://.../evidence/{content_id}.product.evidence.json",
    "video_origin": "real_footage",
    "language": "ko"
  },
  "outGcsUri": "gs://.../raw/vdp/{content_id}.NEW.universal.json",
  "async": true
}
```

#### Instagram/TikTok 메타데이터 전용 처리 (MVP)
- **비디오 다운로드 스킵**: 인증/법무 제약으로 메타데이터만 수집
- **BigQuery 스테이징**: `gs://tough-variety-raw/staging/social_metadata/` 업로드
- **직접 BigQuery 삽입**: `social_ingest.link_requests` 테이블 (가능 시)
- **향후 확장 준비**: 영상 파일 확보 시 동일 BGM 클러스터링 가능

### 🔧 IMPROVEMENTS

#### npm Scripts 확장 (Worker 관리)
```bash
# NEW: Worker 관리
npm run worker:start      # 연속 폴링 워커 실행
npm run worker:once       # 단일 실행 (테스트용)
npm run worker:status     # 워커 실행 상태 확인
```

#### 플랫폼별 처리 로직 분리
- **YouTube**: `process_youtube_request()` - 전체 파이프라인
- **Instagram/TikTok**: `process_social_metadata_only()` - 메타데이터만
- **미지 플랫폼**: YouTube 처리로 fallback

#### 오류 처리 강화
- **bash 호환성**: `mapfile` → 호환 가능한 while 루프로 변경
- **jq 구문 수정**: `then` → `if-then-else` 정확한 구문 사용
- **GCS 업로드 검증**: 각 단계별 실패 시 .failed 마커 생성

### 📋 TECHNICAL DETAILS

#### Worker 동작 흐름
1. **폴링**: `gs://tough-variety-raw/ingest/requests/*.json` 10초 간격
2. **플랫폼 감지**: `platform` 필드 기반 분기 처리
3. **YouTube 파이프라인**:
   - yt-dlp 다운로드 (≤720p)
   - Evidence Pack 생성 (오디오 + 브랜드)
   - GCS 업로드 (input/ + evidence/)
   - T2 VDP 생성 트리거
4. **Instagram/TikTok 파이프라인**:
   - 메타데이터 파싱
   - BigQuery 스테이징 업로드
   - 직접 BigQuery 삽입 (옵션)

#### Evidence Pack 통합
- **Chromaprint 3샘플**: 시작/중간/끝 10초 구간 지문 추출
- **BGM 신뢰도**: 2/3 일치 시 0.95, 불일치 시 0.60
- **브랜드 감지**: VDP seed 기반 룰 정규화 (18개 브랜드)

#### BigQuery 스키마 (social_ingest.link_requests)
```json
{
  "content_id": "string",
  "platform": "string", 
  "source_url": "string",
  "request_time": "timestamp",
  "processing_status": "metadata_only",
  "video_available": false,
  "audio_fingerprint_available": false,
  "evidence_pack_available": false,
  "metadata": "json",
  "notes": "string"
}
```

### 🎯 QUALITY METRICS

#### 처리 성능
- **YouTube 처리 시간**: ~2분 (11MB 영상 기준, 다운로드+증거팩+업로드)
- **Instagram/TikTok 처리**: <10초 (메타데이터만)
- **폴링 간격**: 10초 (조정 가능)

#### 오류 복구
- **중복 처리 방지**: .done/.failed 마커 시스템
- **임시 파일 정리**: 처리 완료 후 자동 삭제
- **GCS 업로드 검증**: 각 단계별 성공/실패 확인

#### T2 서버 통합
- **비동기 처리**: `async: true` 플래그
- **응답 형식**: `taskId` + `polling_url` + `estimated_completion`
- **Evidence Pack 참조**: GCS URI를 meta에 포함하여 VDP 생성 시 활용

### 🔗 INTEGRATION

#### Jobs T2 역할 준수
- ✅ **외부 데이터 수집**: URL → 비디오 다운로드
- ✅ **전처리 전용**: Evidence Pack 생성까지만
- ✅ **GCS 기반 분리**: Main2 T2와 완전 분리된 아키텍처
- ✅ **플랫폼 제약 대응**: Instagram/TikTok 메타데이터 전용 처리

#### 확장성 설계
- **동일 BGM 클러스터링**: 영상 파일 확보 시 Chromaprint 기반 매칭
- **다중 워커**: 여러 워커 인스턴스 동시 실행 가능
- **플랫폼 추가**: 새 플랫폼 처리 로직 쉽게 추가 가능

---

## 2025-08-17 - URL 정규화 시스템 구축

### 🆕 NEW FEATURES

#### URL Normalizer 시스템
- **강화된 URL 정규화**: 리다이렉트 내구성 + 엄격한 검증
- **플랫폼 오인 방지**: 도메인 기반 명확한 플랫폼 식별
- **4가지 URL 추적**: originalUrl, expandedUrl, canonicalUrl, content_id

#### Universal Collector 시스템
- **플랫폼 자동감지**: YouTube, Instagram, TikTok 통합 수집
- **YouTube API 통합**: 자동 메타데이터 수집 (통계 + 댓글)
- **수동 템플릿**: Instagram/TikTok API 제한 대응

### 📁 파일 구조
```
jobs/
├── url-normalizer.js           # 정규화 엔진
├── normalize-cli.mjs           # CLI 래퍼
├── universal-collector.sh      # 통합 수집기
├── enhanced-youtube-collector.sh   # YouTube API 통합
├── platform-collectors/
│   ├── instagram-collector.sh  # Instagram 템플릿
│   └── tiktok-collector.sh     # TikTok 템플릿
└── evidence-generator/         # Evidence Pack 시스템 (NEW)
```

### 🎯 주요 개선
- **리다이렉트 처리**: TikTok vm/vt 단축링크 자동 확장
- **메타데이터 보존**: 링크 포맷 변경 대응 방안
- **npm Scripts**: 통합된 수집 명령어 시스템