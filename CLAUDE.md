# CLAUDE.md — VDP RAW Generation Pipeline Control Tower

## 🏠 Project Setup
- **Directory**: `/Users/ted/snap3`
- **Type**: VDP RAW Generation Pipeline
- **Status**: Production Ready + Cursor Integration Phase

---

## 🚨 CRITICAL: System Architecture

### Core Infrastructure
```bash
export PROJECT_ID="tough-variety-466003-c5"
export REGION="us-central1" 
export RAW_BUCKET="tough-variety-raw-central1"
export PLATFORM_SEGMENTED_PATH=true
```

### Application Ports
- **Ingest UI**: `localhost:8080` (simple-web-server.js) - Multi-platform input
- **Main App**: `localhost:3000` (snap3) - Video generation pipeline

---

## 📋 NON-NEGOTIABLES

### Data Protection
- **VDP_FULL**: Internal only, never expose externally
- **VDP_MIN + Evidence Pack**: Only external data allowed
- **Content_Key**: `platform:content_id` global unique format
- **JSON-Only**: FormData/multipart completely forbidden

### Processing Rules
- **YouTube**: URL → 100% automation (yt-dlp + YouTube API)
- **Instagram/TikTok**: URL + Cursor extractor → 90%+ automation target
- **All Platforms**: → t2-extract API → VDP RAW + Hook Genome → BigQuery

---

## 🔗 API Endpoints

### Main Server APIs (localhost:8080)
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

### T3 VDP Service APIs (localhost:8082)
```typescript  
POST /api/vdp/extract-vertex         // Actual VDP processing (Vertex AI)
POST /api/vdp/test-quality-gates     // Quality gate testing
```

### VDP Extractor Service APIs (독립 서비스)
```typescript
POST /api/vdp/extract               // GitHub VDP 호환 추출 (Gemini 기반)
POST /api/vdp/batch                 // 배치 처리
GET  /api/health                    // 서비스 상태
```

### Quality Gates
- **Hook Duration**: ≤3s (BLOCKER)
- **Strength Score**: ≥0.70 (BLOCKER)
- **Schema Validation**: AJV required
- **Evidence Pack**: Real data only (no fallbacks)

---

## 🎨 CURSOR INTEGRATION STATUS

### Current State Analysis
```
YouTube:    100% automation ✅ (URL → complete processing)
Instagram:  50% manual input 😰 (user enters view/like/comments)
TikTok:     50% manual input 😰 (user enters metadata manually)
```

### Post-Integration Target
```
YouTube:    100% automation ✅ (unchanged)
Instagram:  90%+ automation 🚀 (Cursor extractor + watermark-free)
TikTok:     90%+ automation 🚀 (Cursor extractor + platform bypass)
User Time:  5-8min → 30sec-1min (85% reduction)
```

### Cursor Extractor Value
- **Auto Metadata**: views, likes, comments, top_comments extraction
- **Watermark-Free**: Clean original video download
- **Platform Bypass**: Instagram Stories/Reels, TikTok region restrictions

---

## 🚀 **VDP 통합 작업 의사결정 결과 (2025-08-20)**

### **담당자 분담 방식**
- **Phase 1 (Cursor 담당)**: 
  - TikTok/Instagram 메타데이터 자동 추출기
  - 워터마크 제거 영상 다운로드
  - 인제스터 UI 통합 (기존 코드 활용)

- **Phase 2 (ClaudeCode 담당)**:
  - 메인 VDP 추출기 (services/vdp-extractor/) 연동
  - GitHub VDP 호환 JSON → UI 표시
  - 메인/서브 추출기 선택 옵션

### **우선순위 및 일정**
- **우선순위**: VDP 통합 우선 (사용자 즉시 테스트 요구)
- **일정**: 1-2일 빠른 구현
  - Phase 1: Cursor 24시간 내 완료 목표
  - Phase 2: ClaudeCode 24-48시간 내 완료

### **시스템 복구 현황**
- **VERTEX-API**: OPEN (11회 연속 실패) → CLOSED (복구 완료)
- **성능**: 499ms 평균, 67% 성공률 → 안정화 중

---

## 🛡️ **제한된 자동 모드 시스템 (NEW)**

### **과도한 자동화 방지 메커니즘**
```typescript
interface LimitedAutoModeConfig {
  maxExecutionTime: 120000,       // 2분 (120초)
  maxOperations: 3,               // 최대 3개 작업
  maxConcurrentTasks: 2,          // 최대 2개 동시 작업
  safetyTimeout: 30000,           // 30초 안전 타임아웃
  userApprovalThreshold: 2,       // 2개 작업 후 승인 필요
}
```

### **사용자 제어 기능**
- **긴급 정지 버튼**: 모든 자동 작업 즉시 중단
- **리셋 버튼**: 제한 사항 초기화
- **실시간 모니터링**: 작업 진행률 및 상태 표시

### **적용 범위**
- **재귀개선 시스템**: 과도한 자동 판단 방지
- **GPT-5 권장사항**: 단계별 안전한 구현
- **VDP 통합**: 사용자 승인 게이트 통한 진행

---

## 📊 **GPT-5 전문가 분석 결과 (2025-08-20)**

### **기술적 평가 동의**
- ✅ **Hook 타이밍 2.5초**: 플랫폼 모범 사례 완벽 일치
- ✅ **강도 점수 0.87**: 프로덕션 임계값 대폭 초과 달성
- ✅ **멀티모달 구조**: ASR/OCR/감정아크 포괄성 우수

### **프로덕션 준비도 핵심 격차**
1. **스키마 강화**: Gemini Response Schema 필요
2. **플랫폼 메트릭**: YouTube Analytics API 통합 필요
3. **품질 게이트**: WER/CER 추적 시스템 구축 필요
4. **Circuit Breaker**: VERTEX-API 안정성 확보

### **구현 우선순위**
1. **VERTEX-API Circuit Breaker 복구** (최우선)
2. **Vertex Structured Output 구현**
3. **WER/CER 품질 모니터링**
4. **YouTube Analytics API 통합**

### **전략적 권장사항**
- **단기**: A/B ground truth 세트 (플랫폼별 100개 샘플)
- **중기**: 플랫폼별 특화 기능 엔지니어링
- **장기**: 성능 예측 모델

---

## 🏗️ **4-Terminal + Cursor 시스템 아키텍처 (업데이트)**

### **서비스 구조**
```
┌─ T1 (8080) /Users/ted/snap3
│  ├─ simple-web-server.js (메인 API)
│  ├─ 인제스터 UI (YouTube 100% 자동화)
│  └─ Cursor 통합 대기 중
│
├─ T2 (8081) /Users/ted/snap3-jobs  
│  ├─ worker-ingest-v2.sh (배치 처리)
│  └─ 성능 벤치마크 & 테스트
│
├─ T3 (8082) /Users/ted/snap3/services/t2-extract
│  ├─ VDP 추출 (Vertex AI 기반)
│  ├─ Circuit Breaker 메트릭
│  └─ Hook Genome 분석
│
├─ T4 (8083) /Users/ted/snap3-storage
│  └─ 스토리지 & 로깅 시스템
│
└─ Cursor (3000) /Users/ted/snap3
   ├─ Next.js 프론트엔드
   ├─ Instagram/TikTok 메타데이터 추출기 ✅
   └─ UI 통합 준비 완료
```

### **VDP 듀얼 추출기 시스템**
```
Main VDP Extractor (services/vdp-extractor/)
├─ Gemini 2.5 Pro 기반
├─ GitHub VDP 호환 JSON 구조
└─ 수동 테스트 준비 완료

Sub VDP Extractor (services/t2-extract:8082)  
├─ Vertex AI 기반 (현재 안정화 중)
├─ Hook Genome 전문 분석
└─ Circuit Breaker 보호 중
```

---

## 🚀 Recent Implementations (2025-08-20)

### ✅ Completed Features
1. **GitHub Actions Integration** - Auto context generation for GPT-5 Pro
2. **Triangular Workflow** - GPT-5 Pro ↔ ClaudeCode ↔ Cursor coordination
3. **4-Terminal Guard System** - Conflict prevention between agents
4. **Infinite Loop Prevention** - 3-strike improvement limits
5. **Link-Based Context** - 10-15min → 10-30sec context loading
6. **Pinned Issue System** - Persistent context access via GitHub

### 📊 Performance Metrics
- **Context Loading**: 10-15min → 10-30sec (95% improvement)
- **Agent Coordination**: 0 conflicts in 4-terminal setup
- **Auto Context**: 100% GitHub PR/commit coverage
- **Collaboration Efficiency**: Infinite loop prevention active

---

## 🔧 Current Integration Phase

### Phase 1: Cursor Metadata Extractor (IN PROGRESS)
**Goal**: Instagram/TikTok automation level 50% → 90%+
**Approach**: Integrate Cursor's extraction API with existing VDP pipeline
**Benefits**: Eliminate manual metadata input, get watermark-free videos

### Key Integration Points
1. **API Integration**: `/api/extract-social-metadata` endpoint
2. **UI Enhancement**: Auto-fill forms with extracted data
3. **Error Handling**: Graceful fallback to manual input
4. **Quality Gates**: Validate extracted metadata quality

---

## ⚠️ Error Codes (RFC 9457)
```
CONTENT_ID_MISSING           → Call URL normalization first
HOOK_GATE_FAILED            → Hook >3s or strength <0.70
FORMDATA_MULTIPART_DETECTED → Use JSON-only processing
CURSOR_EXTRACTION_FAILED    → Fallback to manual input
EVIDENCE_GENERATION_FAILED  → fpcalc/brand detection failed
```

---

## 🎯 Collaboration Protocols

### Agent Coordination
- **GPT-5 Pro**: Strategy, risk analysis, high-level decisions
- **ClaudeCode**: Implementation, testing, system integration  
- **Cursor**: UI/UX, Instagram/TikTok metadata extraction
- **Real-time Sync**: GitHub Actions auto-context updates

### Communication Channels
```bash
# Send message to Cursor
./scripts/simple-notifier.sh send "Cursor" "Action" "Details" "priority"

# Check messages
./scripts/simple-notifier.sh check

# Git coordination
./scripts/claudecode-terminal-guard.sh detect_terminal
```

### ⚠️ **CRITICAL: Cursor 메시지 전달 필수 규칙**
- **메시지 파일 생성시**: 반드시 커서용 명령어 함께 제공
- **커서 명령어 예시**: `cd /Users/ted/snap3 && cat .collab-msg-[ID]`
- **또는**: `./scripts/simple-notifier.sh check`
- **이유**: 커서가 메시지 파일 위치를 모르면 메시지 수신 불가

---

## 🧠 **GPT-5 Pro 컨센서스 프로토콜 (NEW v1.0)**

### 🚨 **CRITICAL: GPT-5 답변 처리 필수 규칙**

#### **GPT-5 답변 수신시 자동 실행:**
1. **분석 의무**: 모든 GPT-5 답변을 실용성/위험성/우선순위 기준으로 분석
2. **응답 형식**: `GPT5-Analysis-Response` + Correlation ID 사용
3. **응답 시한**: 5분 내 응답 필수  
4. **합의 대기**: Cursor와 합의 도달까지 작업 시작 금지

#### **분석 기준:**
```yaml
실용성: 구현가능성, 시간효율성, 기술적합성
위험성: 시스템안정성, 복잡도증가, 유지보수성
우선순위: 비즈니스가치, UX개선, 기술부채감소
```

#### **권장 응답:**
- **PROCEED**: 실용적이고 안전함
- **MODIFY**: 수정 제안 포함
- **REJECT**: 위험하거나 비실용적

#### **합의 도달 후 작업 시작:**
- ✅ 양측 PROCEED → 즉시 협업 작업 시작
- ⚠️ 의견 불일치 → 사용자 개입 요청
- ❌ 양측 REJECT → 작업 진행 중단

### ✅ **현재 합의 완료 사항 (2025-08-20):**
- T1 API 브리지 완성 확인 ✅
- Phase A 병렬작업 승인 ✅
- 90분 내 완성 목표 ✅  
- localhost:3000 ↔ 8080 연동 ✅
- 즉시 시작 합의 완료 ✅

---

## 🚨 **4-Terminal + Cursor 협업 필수 규칙**

### **Terminal Coordination Protocol v1.0**
**참조**: `.docs/TERMINAL-COORDINATION-RULES.md` (완전한 규칙서)

#### **작업 지시 필수 절차:**
1. **의존성 분석 우선**: 파일/포트/서버 충돌 사전 식별
2. **순차/병렬 명시**: 🔄 순차 필수 / ⚡ 병렬 가능 표기
3. **디렉토리 확인**: 터미널별 올바른 디렉토리 확인 필수 (아래 터미널 역할 참조)
4. **완료 신호**: Phase별 완료 확인 방법 제시
5. **Cursor 메시지**: `.collab-msg-[action]` + 확인 명령어 필수

#### **터미널 역할 고정:**
- **T1 (Main/8080)**: `/Users/ted/snap3` - 메인 서버, API 엔드포인트
- **T2 (Jobs/8081)**: `/Users/ted/snap3-jobs` - Worker 성능 테스트, 벤치마크  
- **T3 (VDP/8082)**: `/Users/ted/snap3/services/t2-extract` - VDP 추출, 메트릭 수집
- **T4 (Storage/8083)**: `/Users/ted/snap3-storage` - 스토리지, 로깅 시스템
- **Cursor (UI/3000)**: `/Users/ted/snap3` - 프론트엔드 UI (Next.js)

#### **충돌 방지 체크리스트:**
```bash
# 파일 충돌 확인
ls -la [target_file] 2>/dev/null && echo "순차 필요" || echo "병렬 가능"

# 포트 충돌 확인  
lsof -i :[port] && echo "대기 필요" || echo "사용 가능"

# 서버 Ready 확인
curl -s http://localhost:[port]/health && echo "Ready" || echo "대기"
```

#### **🚨 위반 시 프로토콜:**
터미널 충돌 발생 시 → 작업 중단 → 의존성 재분석 → 순차 재계획

---

## 📚 File Guardrails
- **Edit Allowed**: `src/**`, `web/**`, `scripts/**`, `docs/**`
- **Edit Forbidden**: `/internal/vdp_full/**`, unauthorized network calls
- **Commit Rules**: All tests green + Evidence Pack + No VDP_FULL exposure

---

## 📝 **로깅 및 모니터링 개선 (NEW)**

### **구조화된 로깅 시스템**
```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId: string;
  metadata: Record<string, any>;
}
```

### **실시간 모니터링 지표**
- **시스템 업타임**: 15,083초 (~4.2시간)
- **메모리 사용률**: 52MB (정상)
- **API 응답시간**: T1-API 3.76ms, VERTEX-API 502ms
- **성공률**: T1-API 100%, VERTEX-API 67%

### **Circuit Breaker 모니터링**
- **T1-API**: CLOSED (100% 성공률)
- **VERTEX-API**: CLOSED (복구 완료, 안정화 중)
- **자동 복구**: 실패 임계값 도달 시 자동 OPEN → HALF_OPEN → CLOSED

### **성능 메트릭 추적**
- **Hook Genome 분석**: 0.87 강도 (목표 ≥0.70 초과)
- **VDP 처리시간**: P95 42ms (목표 500ms 대폭 초과)
- **자동화율**: YouTube 100%, Instagram/TikTok 50% → 90%+ 목표

### **로깅 개선 사항**
- **상관관계 ID**: 모든 요청에 고유 식별자 부여
- **메타데이터 추적**: 플랫폼별, 작업별 상세 정보 기록
- **에러 분류**: 시스템/네트워크/사용자 에러 구분
- **성능 지표**: 응답시간, 처리량, 오류율 실시간 추적

### **모니터링 대시보드**
- **실시간 상태**: 4-Terminal + Cursor 시스템 상태
- **성능 지표**: API 응답시간, 성공률, 처리량
- **알림 시스템**: 임계값 초과 시 자동 알림
- **트렌드 분석**: 시간별 성능 변화 추적


