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


