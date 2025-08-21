# 🚀 24시간 VDP Raw 구현 런북 (GPT-5 Pro CTO 컨설팅)

## 📊 **현재 상태 재확인**

### **MVP 완성 현황**
- **커밋**: `2862fba` - 메타 스키마 19필드 일관, VDP-Lite 폴백, 5분 캐시
- **T1 재시작**: `df23fb8` - T3 상태 갱신 (헬스/라우팅 이슈)
- **T1 서버**: `simple-web-server.js` 현행 운영 중

### **핵심 문제 진단**
- **T3 400/422 에러**: 요청 계약 불일치 (스키마 변환 필요)
- **메타데이터 유실**: VDP Post-Merge(Deep Merge) 필요
- **Evidence 비표준화**: fpcalc 15초로 표준화 필요

---

## 🎯 **목표: IG/TikTok YouTube와 동일한 30-60초 / 90%+ 자동화**

---

## 1️⃣ **즉시 "출혈 멈추기" (Stop-the-bleeding)**

### **A) T3 공용 헬스엔드포인트 고정**

#### **구현 대상**
- `GET /healthz` (liveness)
- `GET /readyz` (readiness) 
- `GET /version` (Git SHA, 모델명)

#### **적용 서버**
- T3 메인 추출기 (포트 3001)
- T3 서브 추출기 (포트 8082)

#### **Cloud Run 설정**
```yaml
min_instances: 1
timeout: 120s
concurrency: 3
```

### **B) T1→T3 어댑터 계층 추가**

#### **새 엔드포인트**
```
POST /api/vdp/generate
```

#### **요청 스키마 변환**
```typescript
// Gemini (포트 3001)
POST /api/v1/extract

// Vertex (포트 8082)  
POST /api/vdp/extract-vertex
```

#### **라우팅 로직**
- 헬스 체크 결과 기반 우선 라우팅
- 메인 우선, 실패 시 서브 폴백
- 422: 필드 누락/형 불일치
- 400: 경로/헤더/Content-Type 문제

### **C) JSON-only 강제 & Zod 서버측 검증**

#### **검증 규칙**
- `Content-Type: application/json` 외 거부
- RFC-9457 Problem Details 유지
- Zod로 플랫폼·필수필드·URI 검증

### **D) VDP Post-Merge(Deep Merge)로 메타데이터 보존**

#### **병합 로직**
```typescript
deepMerge(vdp, { 
  metadata: { 
    platform_raw: input.meta, 
    ...input.metaPicked 
  }
}, preferExisting=true)
```

#### **보존 원칙**
- T3가 메타를 무시해도 최종 VDP에 19필드 항상 포함
- Null/미존재만 덮어쓰기

### **E) Evidence OFF일 때도 "빈 구조만" 기록**

#### **폴백 원칙**
- "폴백 0%" 원칙 유지 (가짜/유사 증거 금지)
- 실패 시: `{audio_fingerprint:null, brand_evidence:[]}`

---

## 2️⃣ **IG/TikTok "다운로드 & 동기화" 완전자동화**

### **A) yt-dlp 단일화**

#### **Instagram**
```bash
yt-dlp -S "proto,ext:mp4:m4a,res,br" -o "/tmp/%(id)s.%(ext)s" \
  --extractor-args "instagram:app_id=936619743392459" "$URL"
```

#### **TikTok**
```bash
yt-dlp --extractor-args "tiktok:device_id=1234567890123456789" "$URL"
```

#### **장점**
- 수천 사이트 지원으로 성숙도·커버리지 우수
- 공식 문서화된 추출기 인자
- 유지보수·호환성 우수

### **B) 메타-영상 동기화**

#### **업로드 단위**
- `upload_id` 메타헤더 (platform/content_id/upload_id)
- JSON과 MP4 동시 업로드 후 `/api/vdp/generate` 호출

#### **GCS 경로**
```
gs://tough-variety-raw-central1/raw/vdp/{platform}/{content_id}.universal.json
```

---

## 3️⃣ **Evidence Pack: 15초 부분지문 표준화**

### **fpcalc 파라미터**
```bash
fpcalc -length 15 "$AUDIO_PATH" -json > "$OUT/audio.fp.json" || echo '{"fingerprint":null}' > "$OUT/audio.fp.json"
```

### **장점**
- 처리시간 3-4배 단축 (60초 → 15초)
- 동일 콘텐츠 판별에 충분
- 서버 매칭 허용오차 ±7초

---

## 4️⃣ **Cloud Run(=T3) 안정화 파라미터**

### **권장 설정**
```yaml
concurrency: 3          # 낮게 시작 후 부하테스트로 상향 조정
timeout: 120s           # p95≈32s면 120s 적정
min_instances: 1        # 콜드스타트 회피
cpu: 2 vCPU
memory: 2-4GiB          # ASR/비디오 파싱 여유
```

---

## 5️⃣ **T1-T4 & Cursor: 역할별 실행 지시**

### **T1 (Main UI/API)**
1. `/api/vdp/generate` 어댑터 구현
2. Deep-Merge 저장 (VDP-Lite → VDP-Full 전환 시에도 메타 유지)
3. 5분 인메모리 캐시 유지 (키: `platform:content_id`)
4. `/healthz` 추가 (프로세스·큐길이·버전)

### **T2 (Jobs Worker)**
1. **yt-dlp** 단일화 (IG/TikTok 다운로드)
2. Evidence 15초 지문 생성 + 브랜드 매칭
3. `.done` 마커 유지 (중복 방지), 재시도 3회 (지수백오프)

### **T3 (VDP Extractor; 3001/Gemini & 8082/Vertex)**
1. `GET /healthz|/readyz|/version` 구현
2. Zod/DTO로 **요청 바디 422 원인**를 응답 메시지에 명시
3. Concurrency=3, Timeout=120s, MinInstances=1 배포

### **T4 (Storage Loader)**
1. `.universal.json`(풀)과 `.lite.json`(폴백) **둘 다 적재**
2. `source_type` 파티션 (Full/Lite)
3. vdp_gold_v2(STRING) 유지하되, **v3(JSON)** 파일럿 테이블 병행 생성

### **Cursor**
1. IG/TikTok 메타 추출 API는 **T1로 이식**
2. 차단/429 시 **캐시 히트 + 재시도 지수백오프**

---

## 6️⃣ **품질 게이트 & 모니터링**

### **Hook Gate**
```typescript
start_sec ≤ 3.0 && strength_score ≥ 0.70
```
- 불통과 시 `status=REVIEW_REQUIRED`로 저장

### **핵심 지표**
- `success_rate`
- `p95_latency` 
- `t3_422_rate`
- `t3_5xx_rate`
- `download_success_rate`

---

## 7️⃣ **리스크 & 컴플라이언스**

### **ToS/저작권**
- 다운로더 사용은 **권리 확인**·서비스 약관 준수 전제
- 자동 다운로드/워터마크 제거는 용도·권리조건을 사내 가이드에 명문화

### **운영 리스크**
- Cloud Run 과부하 시 p95 급상승 → 동시성/인스턴스 상향 또는 **Jobs/Batch 분리** 고려

---

## 8️⃣ **수용 테스트 (승인 기준)**

### **성능 기준**
1. **3플랫폼 샘플** 각 5건 → **30-60초 내 VDP-Full** 생성 (p95 < 30s)
2. 최종 VDP에 **IG/TikTok 19필드 모두 존재** (Deep Merge 확인)
3. 연속 100건 처리에서 **T3 4xx<2% / 5xx<1%** 유지
4. 콜드스타트 0건 (관측 기간 동안) — min-instances=1 확인

---

## 📋 **실행 체크리스트**

- [ ] `/api/vdp/generate` 어댑터 구현 및 배포 (T1)
- [ ] `/healthz|/readyz|/version` 구현 (T3 양 엔진)
- [ ] Deep-Merge 저장 파이프라인 (T1)
- [ ] yt-dlp 표준화 + Evidence 15초 (T2)
- [ ] Cloud Run: **Concurrency=3 / Timeout=120s / MinInstances=1** (T3)
- [ ] T4 v2(STRING) 유지 + v3(JSON) 파일럿 병행

---

## 🎯 **예상 결과**

### **기술적 효과**
- T3 400/422 에러: **어댑터+검증**으로 종결
- 메타데이터 유실: **Post-Merge**로 해소
- IG/TikTok: **yt-dlp 단일화**로 다운로드·동기화 안정화
- Evidence 15초: **총 처리시간 단축**과 **품질 일관성** 동시 달성

### **성과 목표**
- **30-60초 / 90%+ 자동화** 달성
- **YouTube와 동일한 품질**의 VDP Raw 생성
- **완전한 메타데이터 보존** (19필드)
- **안정적인 T3 서버 연동**

---

**생성일**: 2025-08-21  
**컨설팅 제공**: GPT-5 Pro CTO  
**실행 담당**: Cursor + ClaudeCode  
**목표 완료**: 24시간 내 VDP Raw 시스템 완성
