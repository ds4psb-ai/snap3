# CLAUDE.md — VDP RAW Generation Pipeline Control Tower

## 🏠 프로젝트 기본 설정
- **Working Directory**: `/Users/ted/snap3`
- **Project Type**: VDP RAW Generation Pipeline
- **Role**: Plan → Apply → Test → Review (기본 Plan Mode)

---

## 🚨 CRITICAL: Regional Alignment Policy

### 필수 환경변수
```bash
export PROJECT_ID="tough-variety-466003-c5"
export REGION="us-central1"
export RAW_BUCKET="tough-variety-raw-central1"
export PLATFORM_SEGMENTED_PATH=true
```

### 버킷 정책 (절대 변경 금지)
- **표준 버킷**: `tough-variety-raw-central1` (단일 버킷)
- **금지 버킷**: `tough-variety-raw`, `tough-variety-raw-west1` 등
- **검증**: 모든 GCS 작업 전 버킷명 확인 필수
- **실패 시**: 서버 즉시 종료 (`process.exit(1)`)

---

## 📋 핵심 아키텍처 규칙

### MUST (필수 사항)
- **VDP_FULL**: 내부 전용, 외부 노출 절대 금지
- **Content_ID**: 모든 인제스트 요청에 필수, URL 정규화 선행
- **Content_Key**: `platform:content_id` 형식으로 글로벌 유니크
- **Platform-Segmented GCS**: `gs://bucket/ingest/requests/{platform}/`
- **JSON-Only**: FormData/multipart 금지
- **Correlation ID**: 모든 요청에 추적 ID (`req_timestamp_random`)
- **VDP 필수 필드**: content_key, content_id, metadata, load_timestamp, load_date

### NEVER (절대 금지)
- **환경변수 검증 우회**: 필수 환경변수 없이 서버 시작
- **Content_ID 누락**: content_id 없이 인제스트 처리
- **FormData 허용**: JSON-only 정책 위반
- **Platform 세그먼트 누락**: GCS 경로에서 플랫폼 생략
- **잘못된 버킷**: `tough-variety-raw-central1` 이외 사용
- **문서 불일치**: 잘못된 버킷 참조 허용
- **API 엔드포인트 오류**: `/api/ingest` 대신 `/api/vdp/extract-vertex` 사용

---

## 🚨 CRITICAL: 인제스트 UI 정의

### 인제스트 UI 절대 규칙
- **인제스트 UI**: `http://localhost:8080` (simple-web-server.js)
- **실행 명령어**: `node simple-web-server.js`
- **용도**: YouTube/Instagram/TikTok 링크 입력 및 처리
- **절대 금지**: snap3 메인 UI (http://localhost:3000)를 인제스트 UI라고 부르는 것

### 명령어 매핑
```bash
# 인제스트 UI 실행 (포트 8080)
node simple-web-server.js

# 인제스트 UI 브라우저 열기
open http://localhost:8080

# snap3 메인 UI (포트 3000) - 비디오 생성 파이프라인
npm run dev
open http://localhost:3000
```

---

## 🔗 API 엔드포인트

### 핵심 엔드포인트
- `POST /api/normalize-url` — URL 정규화 → content_id 추출
- `POST /api/vdp/extract-vertex` — 실제 인제스트 처리 (JSON-only)
- `GET /healthz` — Dependencies 상태 확인
- `GET /version` — 환경변수/설정 확인

### 비디오 생성 파이프라인
- `POST /snap3/turbo` — Textboard 생성 (2-4씬, 8s)
- `POST /compile/veo3` — Veo3 Prompt JSON (8s/16:9/720p|1080p)
- `POST /preview/veo` — 비동기 미리보기 (202 + Location)
- `GET /jobs/{id}` — 잡 상태 폴링

### QA & Export
- `POST /qa/validate` — Hook≤3s, safezones, 가독성
- `GET /export/brief/{id}` — Brief PDF + Evidence
- `GET /export/json/{id}` — VideoGen IR + Veo3 Prompt

---

## 🔧 운영 점검 시스템

### 필수 운영 검증 명령어
```bash
# t2-extract 서비스 전체 검증 (대량 처리 전 필수)
cd ~/snap3/services/t2-extract
./run-all-checks.sh
```

### 환경변수 표준 업데이트
```bash
# Cloud Run 환경변수 일괄 업데이트
gcloud run services update t2-vdp \
  --region=us-central1 \
  --set-env-vars=PLATFORM_SEGMENTED_PATH=true \
  --set-env-vars=RAW_BUCKET=tough-variety-raw-central1 \
  --set-env-vars=EVIDENCE_MODE=true \
  --set-env-vars=HOOK_MIN_STRENGTH=0.70
```

### 점검 일정
- **대량 처리 전**: `./run-all-checks.sh` 필수 실행 (8/10 이상 통과)
- **주간**: 전체 검증 (2분 소요)
- **일일**: Health check (`curl /healthz`)

---

## 📊 VDP (Video Data Package) 구조

### 메타데이터 계층
- **플랫폼**: YouTube, Instagram, TikTok
- **인게이지먼트**: view, like, comment, share counts
- **오리진**: Real-Footage | AI-Generated

### 분석 계층 (overall_analysis)
- **감정 아크**: 시작→절정→결말 흐름
- **ASR/OCR**: 음성/텍스트 추출
- **Hook Genome**: 패턴 분석 (≤3s)

### 씬 분해 (scenes[])
- **내러티브**: Hook | Demonstration | Problem_Solution
- **샷 디테일**: camera, keyframes, composition
- **스타일**: lighting, mood_palette, edit_grammar

---

## ⚠️ 에러 처리 (RFC 9457)

### 주요 에러 코드
- `CONTENT_ID_MISSING` → URL 정규화 API 먼저 호출
- `PLATFORM_MISSING` → 플랫폼 필드 추가
- `FORMDATA_MULTIPART_DETECTED` → JSON-only 재전송
- `PLATFORM_SEGMENTATION_MISSING` → GCS 경로에 {platform} 추가
- `BUCKET_VALIDATION_FAILED` → 올바른 버킷으로 수정

---

## 🎯 QA Gate 규칙

### 필수 검증 항목
- **Hook**: ≤3초 (MAJOR)
- **Duration**: 정확히 8.0초
- **Aspect**: 16:9 (세로 요청 시 crop-proxy)
- **Resolution**: 720p/1080p

### 플랫폼별 힌트
- **Reels**: ≥720p, ≥30fps
- **TikTok**: bitrate ≥516kbps
- **Shorts**: 16:9 소스 허용

---

## 🔒 보안 & 테스트

### 보안 원칙
- **Supabase RLS**: 모든 테넌트 테이블
- **서명 URL**: 업로드/공유 전용
- **서비스 키**: 서버 전용 (클라이언트 노출 금지)

### 테스트 요구사항
- **OpenAPI 3.1** + **JSON Schema 2020-12**
- **단위 테스트** + **스키마 검증** + **계약 테스트**
- **QA 린트**: 모든 품질 게이트 통과 필수

---

## 📝 지역별 공개 규정
- **KR**: `#광고 #유료광고포함 — 본 영상은 경제적 대가를 포함합니다.`
- **US**: `Sponsored — I received compensation for this content.`
- **EU**: `Includes AI-generated content.`

---

## 🚀 최근 구현 완료 (2025-08-19)

### ✅ 핵심 기능
1. **Content_ID 필수 정책** - URL 정규화 선행
2. **멀티플랫폼 통합** - YouTube/TikTok/Instagram 
3. **Platform-Segmented GCS** - 플랫폼별 경로 분리
4. **JSON-Only 처리** - FormData 완전 금지
5. **Correlation ID 추적** - 엔드투엔드 추적
6. **버킷 정책 강화** - 검증 시스템 구축
7. **운영 점검 자동화** - 전체 시스템 검증 원클릭 완료

### 📈 성능 지표
- **인제스트 처리**: 750-805ms/request
- **API 성공률**: 100%
- **플랫폼 간 충돌**: 0건
- **Content_Key 누락률**: 0%
- **운영 검증 시간**: 수동 15분 → 자동 2분

---

## 📚 편집 가드레일
- **허용**: `src/**`, `apps/**`, `packages/**`
- **금지**: `/internal/vdp_full/**`, 비인가 네트워크 호출
- **PR 조건**: 모든 테스트 그린 + Evidence 첨부 + VDP_FULL 비노출

