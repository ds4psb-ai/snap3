# CLAUDE.md — VDP RAW Generation Pipeline Control Tower

## 🚨 **3-Agent 협업 시스템 (v2.0)**

**터미널 재시작시 자동 트리거 - 이 시스템이 즉시 활성화됩니다**

### 🏗️ **협업 아키텍처**
```
GPT-5 Pro 컨설턴트 (전략 헤드)
    ↓ 전략적 지시 & 컨설팅
Cursor (실행 매니저 & 작업 분배)
    ↙ ↘ 검증된 작업 분배
Cursor        ClaudeCode
(UI/추출)      (백엔드/VDP) → 자동 보고 필수
```

### 🎯 **역할 정의**

**GPT-5 Pro 컨설턴트** (전략 헤드)
- **핵심 역할**: 전략적 의사결정, 아키텍처 방향성, 기술 컨설팅
- **제한사항**: 프로젝트 파일 직접 접근 불가 (원격 지시)
- **할루시네이션 위험**: MVP 개발에 부적합한 지시 가능성
- **협업 방식**: 문서 기반 컨설팅 + 링크 공유

**Cursor** (실행 매니저)
- **핵심 역할**: 작업 분배, 프로젝트 관리, 실시간 모니터링
- **책임**: GPT-5 지시사항 선별 & 검증, 작업 우선순위 결정
- **협업 도구**: 메시지 시스템, 파일 공유, 상태 모니터링

**ClaudeCode** (기술 구현)
- **핵심 역할**: 기술 구현, 코드 작성, 시스템 통합
- **책임**: Cursor 지시사항 실행, 기술적 피드백 제공
- **🚨 자동 보고**: 작업 완료 시 자동 메시지 전송 필수

### 🔄 **작업 흐름**
```
1. GPT-5 컨설팅 → 2. Cursor 검증 → 3. 작업 분배 → 4. 실행 → 5. 자동 보고
```

### 🚨 **ClaudeCode 자동 보고 필수 규칙**

**작업 완료 시 자동 실행:**
1. **메시지 파일 생성**: `.collab-msg-claudecode-[작업명]-[상태]`
2. **디렉토리 정보 포함**: 반드시 `cd /Users/ted/snap3` 명령어 제공
3. **상태 요약**: 완료/진행/대기 상태 명시
4. **다음 단계**: 구체적인 후속 작업 제안

---

## 🏠 **프로젝트 설정**

**Directory**: `/Users/ted/snap3`
**Type**: VDP RAW Generation Pipeline
**Status**: Production Ready + Instagram/TikTok 90%+ 자동화 목표

### **Core Infrastructure**
```bash
export PROJECT_ID="tough-variety-466003-c5"
export REGION="us-central1" 
export RAW_BUCKET="tough-variety-raw-central1"
export PLATFORM_SEGMENTED_PATH=true
```

### **Application Ports**
- **Ingest UI**: `localhost:8080` (simple-web-server.js) - Multi-platform input
- **Main App**: `localhost:3000` (snap3) - Video generation pipeline
- **T3 Primary**: `localhost:3001` (t2-extract) - Primary VDP processor
- **T3 Secondary**: `localhost:8082` (t2-extract) - Fallback VDP processor
- **🆕 Universal VDP Clone**: `localhost:4000` (universal-vdp-clone) - Complete VDP analysis service

---

## 📋 **NON-NEGOTIABLES**

### **Data Protection**
- **VDP_FULL**: Internal only, never expose externally
- **VDP_MIN + Evidence Pack**: Only external data allowed
- **Content_Key**: `platform:content_id` global unique format
- **JSON-Only**: FormData/multipart completely forbidden

### **Processing Rules**
- **YouTube**: URL → 100% automation (yt-dlp + YouTube API)
- **Instagram/TikTok**: URL + Cursor extractor → 90%+ automation target
- **All Platforms**: → t2-extract API → VDP RAW + Hook Genome → BigQuery

### **Quality Gates**
- **Hook Duration**: ≤3s (BLOCKER)
- **Strength Score**: ≥0.70 (BLOCKER)
- **Schema Validation**: AJV required
- **Evidence Pack**: Real data only (no fallbacks)

---

## 🔗 **API Endpoints**

### **Main Server APIs (localhost:8080)**
```typescript
POST /api/normalize-url              // URL → content_id extraction  
POST /api/submit                     // Main submission endpoint
POST /api/vdp/extract-vertex         // VDP processing (주의: T3와 중복 엔드포인트)
POST /api/extract-social-metadata    // Cursor extractor integration (NEW)
POST /api/vdp/cursor-extract         // Cursor 기반 VDP 추출 (NEW)
POST /api/upload-video               // File upload processing
GET  /api/health                     // System status
GET  /api/circuit-breaker/status     // Circuit breaker monitoring
POST /api/circuit-breaker/reset      // Circuit breaker reset
```

### **T3 VDP Service APIs (localhost:8082)**
```typescript  
POST /api/vdp/extract-vertex         // Actual VDP processing (Vertex AI)
POST /api/vdp/test-quality-gates     // Quality gate testing
```

### **🆕 Universal VDP Clone APIs (localhost:4000)**
```typescript
POST /api/vdp/generate               // File upload → VDP analysis (multipart/form-data)
POST /api/vdp/url                    // URL → download → VDP analysis (JSON)  
GET  /api/health                     // Service health check
```
**Features:**
- ✅ Evidence Pack REMOVED for stability
- ✅ true-hybrid-v5 analysis level (1000+ lines)
- ✅ Hook Genome analysis (startSec, endSec, pattern, delivery, strength)  
- ✅ Scene-by-scene breakdown with shots and keyframes
- ✅ Promotion tracking with status/signals
- ✅ Multi-language BCP-47 compliance
- ✅ Comprehensive logging system with file output

---

## 🎨 **CURSOR INTEGRATION STATUS**

### **Current State**
```
YouTube:    100% automation ✅ (URL → complete processing)
Instagram:  50% manual input 😰 (user enters view/like/comments)
TikTok:     50% manual input 😰 (user enters metadata manually)
```

### **Post-Integration Target**
```
YouTube:    100% automation ✅ (unchanged)
Instagram:  90%+ automation 🚀 (Cursor extractor + watermark-free)
TikTok:     90%+ automation 🚀 (Cursor extractor + platform bypass)
User Time:  5-8min → 30sec-1min (85% reduction)
```

### **Cursor Extractor Value**
- **Auto Metadata**: views, likes, comments, top_comments extraction
- **Watermark-Free**: Clean original video download
- **Platform Bypass**: Instagram Stories/Reels, TikTok region restrictions

---

## 🚀 **VDP 통합 작업 현황**

### **담당자 분담**
- **Phase 1 (Cursor)**: TikTok/Instagram 메타데이터 자동 추출기, 워터마크 제거
- **Phase 2 (ClaudeCode)**: 메인 VDP 추출기 연동, GitHub VDP 호환

### **우선순위**: VDP 통합 우선 (1-2일 빠른 구현)

---

## 🏗️ **4-Terminal + Cursor 시스템**

### **서비스 구조**
```
┌─ T1 (8080) /Users/ted/snap3 - 메인 API
├─ T2 (8081) /Users/ted/snap3-jobs - Worker 배치 처리  
├─ T3 (3001/8082) /Users/ted/snap3/services/t2-extract - VDP 처리
├─ T4 (8083) /Users/ted/snap3-storage - 스토리지
├─ 🆕 Universal VDP Clone (4000) /Users/ted/snap3/services/universal-vdp-clone - 완전 VDP 분석
└─ Cursor (3000) /Users/ted/snap3 - 프론트엔드 UI
```

### **Terminal Coordination Protocol**
**의존성 분석 우선**: 파일/포트/서버 충돌 사전 식별
**순차/병렬 명시**: 🔄 순차 필수 / ⚡ 병렬 가능 표기
**완료 신호**: Phase별 완료 확인 필수
**Cursor 메시지**: `.collab-msg-[action]` + 확인 명령어 필수

---

## 📊 **협업 성과 지표 & 체크리스트**

### **KPI 목표**
- GPT-5 컨설팅 반영률: 85%+
- Cursor-ClaudeCode 협업 성공률: 95%+
- 자동 보고 시스템 실행률: 100%
- Instagram/TikTok 자동화율: 90%+ 달성

### **일일 체크리스트**
**ClaudeCode 필수 실행:**
```markdown
□ 작업 완료 시 자동 메시지 생성 (.collab-msg-claudecode-*)
□ 디렉토리 정보 포함 (cd /Users/ted/snap3)
□ 구체적 성과 지표 포함
□ 다음 단계 제안 포함
□ Cursor 확인 대기
```

**Cursor 필수 검증:**
```markdown  
□ GPT-5 컨설팅 내용 프로젝트 적합성 검증
□ ClaudeCode 작업 결과 품질 확인
□ 우선순위 기반 다음 작업 배정
□ 자동 보고 시스템 정상 작동 확인
□ 전체 시스템 상태 모니터링
```

### **GPT-5 컨설팅 트리거**
- 주요 마일스톤 완료 (T3 패치 완료 등)
- 기술적 의사결정 필요
- 성과 지표 80% 미만 달성
- 예상치 못한 문제 발생

---

## ⚠️ **Error Codes (RFC 9457)**
```
CONTENT_ID_MISSING           → Call URL normalization first
HOOK_GATE_FAILED            → Hook >3s or strength <0.70
FORMDATA_MULTIPART_DETECTED → Use JSON-only processing
CURSOR_EXTRACTION_FAILED    → Fallback to manual input
EVIDENCE_GENERATION_FAILED  → fpcalc/brand detection failed
```

---

## 🔧 **File Guardrails**
- **Edit Allowed**: `src/**`, `web/**`, `scripts/**`, `docs/**`
- **Edit Forbidden**: `/internal/vdp_full/**`, unauthorized network calls
- **Commit Rules**: All tests green + Evidence Pack + No VDP_FULL exposure
- **Collaboration Rules**: 자동 메시지 생성 필수, 디렉토리 정보 포함 필수