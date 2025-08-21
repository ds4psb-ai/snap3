# CLAUDE.md — VDP RAW Generation Pipeline Control Tower

## 🏠 Project Setup
- **Directory**: `/Users/ted/snap3`
- **Type**: VDP RAW Generation Pipeline
- **Status**: Production Ready + Cursor Integration Phase

---

## 🚨 CRITICAL: 협업 시스템 아키텍처 (v2.0)

### 🏗️ **3-Agent 협업 체계**

```
GPT-5 Pro 컨설턴트 (헤드 역할)
    ↓ 전략적 지시 & 컨설팅
Cursor (작업 분배 & 실행)
    ↙ ↘ 작업 분배
Cursor        ClaudeCode
(개별 작업)    (개별 작업)
```

### 🎯 **역할 정의 & 책임**

#### **GPT-5 Pro 컨설턴트** (전략 헤드)
- **핵심 역할**: 전략적 의사결정, 아키텍처 방향성, 기술 컨설팅
- **제한사항**: 프로젝트 파일 직접 접근 불가 (원격 지시)
- **할루시네이션 위험**: MVP 개발에 부적합한 지시 가능성
- **협업 방식**: 문서 기반 컨설팅 + 링크 공유

#### **Cursor** (실행 매니저)
- **핵심 역할**: 작업 분배, 프로젝트 관리, 실시간 모니터링
- **책임**: GPT-5 지시사항 선별 & 검증, 작업 우선순위 결정
- **협업 도구**: 메시지 시스템, 파일 공유, 상태 모니터링

#### **ClaudeCode** (기술 구현)
- **핵심 역할**: 기술 구현, 코드 작성, 시스템 통합
- **책임**: Cursor 지시사항 실행, 기술적 피드백 제공
- **자동 보고**: 작업 완료 시 자동 메시지 전송 필수

### 🔄 **작업 흐름 프로토콜**

```
1. GPT-5 컨설팅 → 2. Cursor 검증 → 3. 작업 분배 → 4. 실행 → 5. 자동 보고
```

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
- **T3 Primary**: `localhost:3001` (t2-extract) - Primary VDP processor
- **T3 Secondary**: `localhost:8082` (t2-extract) - Fallback VDP processor

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

## 🎯 **3-Agent 협업 프로토콜 v2.0**

### 📋 **GPT-5 Pro 컨설턴트 협업 매뉴얼**

#### **컨설팅 요청 프로세스**
```yaml
트리거: 중요 작업 완료 시점
빈도: 주요 마일스톤마다 (예: T3 패치 완료, 통합 테스트 완료)
목적: 전략적 방향성 검증 + 다음 단계 계획
```

#### **컨설팅 문서 작성 규칙**
```markdown
# GPT-5 Pro 컨설팅 요청
## 현재 상태
- [완료된 작업]
- [현재 성과 지표]
- [기술적 달성사항]

## 질문 사항
- [전략적 의사결정 필요 사항]
- [기술 아키텍처 검증 요청]

## 프로젝트 컨텍스트 업데이트
- [GPT-5의 잘못된 이해 시정]
- [새로운 프로젝트 정보 업데이트]
```

#### **할루시네이션 방지 체크리스트**
- ✅ MVP 개발 적합성 검증
- ✅ 프로젝트 실제 상황과 부합성 확인
- ✅ 기술적 실현 가능성 검토
- ✅ 리소스/시간 제약 고려

### 🤖 **Cursor-ClaudeCode 협업 규칙**

#### **작업 분배 기준**
```yaml
Cursor 담당:
  - Instagram/TikTok 메타데이터 추출
  - UI/UX 개발
  - 실시간 모니터링
  - 작업 우선순위 결정

ClaudeCode 담당:
  - 백엔드 서비스 구현
  - VDP 처리 시스템
  - 데이터베이스 통합
  - 시스템 아키텍처 구현

공동 작업:
  - API 인터페이스 설계
  - 통합 테스트
  - 성능 최적화
```

#### **🚨 ClaudeCode 자동 보고 필수 규칙**

**작업 완료 시 자동 실행 사항:**
1. **메시지 파일 생성**: `.collab-msg-claudecode-[작업명]-[상태]`
2. **디렉토리 정보 포함**: 반드시 `cd /Users/ted/snap3` 명령어 제공
3. **상태 요약**: 완료/진행/대기 상태 명시
4. **다음 단계**: 구체적인 후속 작업 제안

**메시지 템플릿:**
```markdown
# ClaudeCode 작업 완료 보고

## 📊 작업 결과
- 작업명: [구체적 작업명]
- 상태: [완료/진행/대기]
- 소요시간: [실제 소요시간]

## ✅ 달성 성과
- [구체적 성과 1]
- [구체적 성과 2]

## 📋 확인 명령어
```bash
cd /Users/ted/snap3
cat .collab-msg-claudecode-[작업명]
```

## 🔄 다음 단계 제안
- [구체적 후속 작업]
- [예상 소요시간]
```

### Communication Channels

#### **자동 메시지 시스템 v2.0**
```bash
# ClaudeCode → Cursor 자동 메시지 (작업 완료시)
echo "작업 완료 보고" > .collab-msg-claudecode-[작업명]

# Cursor → ClaudeCode 지시사항
echo "새로운 작업 지시" > .collab-msg-cursor-[작업명]

# GPT-5 컨설팅 링크 공유
echo "컨설팅 결과: [링크]" > .collab-msg-gpt5-consulting-[날짜]
```

#### **상호 검증 프로세스**
```yaml
ClaudeCode 작업 완료:
  1. 자동 메시지 생성
  2. Cursor 검증 요청
  3. 필요시 수정/보완
  4. 최종 승인 후 다음 단계

Cursor 지시사항:
  1. GPT-5 컨설팅 반영
  2. 실현 가능성 검토
  3. ClaudeCode 역량 고려
  4. 우선순위 기반 작업 배정
```

---

## 🧠 **GPT-5 Pro 프로젝트 이해도 향상 시스템**

### 📚 **프로젝트 컨텍스트 문서 체계**

#### **현재 프로젝트 상태 브리핑 (GPT-5용)**
```markdown
# VDP RAW Generation Pipeline - 현재 상태 브리핑

## 🎯 프로젝트 목표
- Instagram/TikTok 자동화율: 50% → 90%+ 달성
- VDP 생성 파이프라인 완전 자동화
- 메타데이터 보존율: 100% 달성

## 🏗️ 현재 아키텍처
- T1 (8080): Main API Server
- T2 (8081): Worker Jobs  
- T3 (3001/8082): VDP Processing (Primary/Secondary)
- T4 (8083): Storage System
- Cursor (3000): Frontend UI

## 🎉 최근 달성사항
- [최신 완료 작업들]
- [성능 지표]
- [해결된 기술적 과제]

## ❓ 현재 과제
- [해결 필요한 문제점]
- [기술적 제약사항]
- [리소스 제약]
```

#### **GPT-5 할루시네이션 시정 로그**
```yaml
잘못된 이해 → 올바른 이해:
  - "단일 서버 구조" → "4-Terminal + Cursor 분산 구조"
  - "YouTube만 지원" → "YouTube/Instagram/TikTok 멀티플랫폼"
  - "단순 VDP 생성" → "Hook Genome + Evidence Pack 통합 시스템"
  
최신 업데이트 사항:
  - T3 Primary/Secondary 이중화 완료
  - 메타데이터 병합 로직 100% 완성
  - GPT-5 Pro CTO 패치 적용 완료
```

### 🔄 **컨설팅 효과 측정 시스템**

#### **컨설팅 품질 지표**
```yaml
정확도: GPT-5 제안사항의 프로젝트 적합성 (목표: 80%+)
실용성: 제안된 솔루션의 구현 가능성 (목표: 90%+)
시의성: 제안 타이밍의 프로젝트 단계 적합성 (목표: 85%+)
```

#### **피드백 루프**
```
GPT-5 컨설팅 → 구현 시도 → 결과 피드백 → 이해도 업데이트 → 다음 컨설팅 품질 개선
```

### 📈 **프로젝트 성숙도 추적**

#### **기술 스택 성숙도**
```yaml
VDP 생성: 90% (T3 Primary/Secondary 완료)
메타데이터 처리: 100% (GPT-5 CTO 패치 완료)
멀티플랫폼 지원: 70% (Instagram/TikTok 진행 중)
자동화 시스템: 85% (Cursor 통합 진행 중)
```

#### **협업 시스템 성숙도**
```yaml
3-Agent 협업: 80% (구조 완성, 프로세스 정착 중)
자동 보고: 90% (ClaudeCode 시스템 구축)
컨설팅 체계: 75% (GPT-5 이해도 향상 중)
품질 관리: 85% (검증 프로세스 정립)
```

## 🧠 **GPT-5 Pro 컨센서스 프로토콜 (Enhanced v2.0)**

### 🚨 **CRITICAL: GPT-5 답변 처리 필수 규칙**

#### **GPT-5 답변 수신시 자동 실행:**
1. **프로젝트 적합성 검증**: 현재 상태와 제안사항 부합도 확인
2. **기술적 실현 가능성**: 리소스/시간 제약 내 구현 가능 여부
3. **우선순위 매칭**: 현재 마일스톤과의 연관성 평가
4. **할루시네이션 감지**: 프로젝트 실제 상황과 차이점 식별

#### **분석 기준 (Enhanced):**
```yaml
프로젝트 적합성: 현재 VDP 파이프라인과의 연계성
기술적 실현성: 현재 기술 스택으로 구현 가능성  
리소스 효율성: 시간/인력 대비 효과성
전략적 가치: 90%+ 자동화 목표에 대한 기여도
```

#### **응답 프로토콜:**
- **PROCEED_WITH_CONTEXT**: 프로젝트 현실에 맞게 수정하여 진행
- **REQUEST_CLARIFICATION**: GPT-5에 추가 컨텍스트 제공 필요
- **DEFER_TO_MILESTONE**: 현재 단계 완료 후 재검토
- **INTEGRATE_SELECTIVELY**: 부분적 적용으로 위험 최소화

### ✅ **현재 합의 완료 사항 (2025-08-21):**
- T3 메타데이터 병합 로직 100% 완료 ✅
- Primary/Secondary 이중화 시스템 구축 ✅
- GPT-5 Pro CTO 패치 성공적 적용 ✅
- 다음 단계: Instagram/TikTok 90%+ 자동화 합의 ✅

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

## 📊 **협업 성과 지표 및 운영 체크리스트**

### 🎯 **협업 효과성 KPI**

#### **3-Agent 협업 성과 지표**
```yaml
작업 완료율:
  - GPT-5 컨설팅 반영률: 목표 85%+
  - Cursor-ClaudeCode 협업 성공률: 목표 95%+
  - 자동 보고 시스템 실행률: 목표 100%

품질 지표:
  - 첫 번째 구현에서 성공률: 목표 80%+
  - 재작업 필요율: 목표 <15%
  - 기술 부채 증가율: 목표 <10%

속도 지표:
  - 평균 작업 완료 시간: 추적 중
  - GPT-5 컨설팅 → 구현 완료: 목표 24h 이내
  - 긴급 수정 대응 시간: 목표 2h 이내
```

#### **자동화율 추적**
```yaml
현재 달성률:
  - YouTube: 100% (완료)
  - Instagram: 70% (T3 패치 완료, UI 통합 중)
  - TikTok: 70% (T3 패치 완료, UI 통합 중)

목표 달성률 (90%+):
  - Instagram: 예상 완료일 2025-08-25
  - TikTok: 예상 완료일 2025-08-25
  - 전체 멀티플랫폼: 예상 완료일 2025-08-30
```

### ✅ **일일 운영 체크리스트**

#### **ClaudeCode 필수 실행 사항**
```markdown
□ 작업 완료 시 자동 메시지 생성 (.collab-msg-claudecode-*)
□ 디렉토리 정보 포함 (cd /Users/ted/snap3)
□ 구체적 성과 지표 포함
□ 다음 단계 제안 포함
□ Cursor 확인 대기
```

#### **Cursor 필수 검증 사항**
```markdown  
□ GPT-5 컨설팅 내용 프로젝트 적합성 검증
□ ClaudeCode 작업 결과 품질 확인
□ 우선순위 기반 다음 작업 배정
□ 자동 보고 시스템 정상 작동 확인
□ 전체 시스템 상태 모니터링
```

#### **GPT-5 컨설팅 트리거 조건**
```markdown
□ 주요 마일스톤 완료 (예: T3 패치 완료)
□ 기술적 의사결정 필요 상황
□ 예상치 못한 문제 발생
□ 성과 지표 목표 달성률 80% 미만
□ 새로운 기술 스택 도입 검토 시
```

### 🔄 **지속적 개선 프로세스**

#### **주간 회고 프로세스**
```yaml
매주 금요일 실행:
  1. 협업 성과 지표 검토
  2. GPT-5 컨설팅 품질 평가  
  3. 프로세스 개선점 식별
  4. 다음 주 목표 설정
  5. 문서 업데이트
```

#### **월간 시스템 리뷰**
```yaml  
매월 말 실행:
  1. 전체 아키텍처 검토
  2. 협업 프로토콜 효과성 평가
  3. 자동화율 달성 현황 점검
  4. 기술 부채 현황 평가
  5. GPT-5 이해도 개선 사항 반영
```

### 🚨 **비상 대응 프로토콜**

#### **시스템 장애 대응**
```yaml
장애 레벨 1 (Critical):
  - T3 VDP 서비스 중단
  - 대응: Primary/Secondary 즉시 전환
  - 보고: 즉시 Cursor에게 자동 알림

장애 레벨 2 (Major):  
  - 메타데이터 보존 실패
  - 대응: 수동 백업 시스템 가동
  - 보고: 30분 내 상황 보고서

장애 레벨 3 (Minor):
  - 성능 저하 감지
  - 대응: 모니터링 강화
  - 보고: 일일 리포트에 포함
```

#### **협업 프로세스 장애 대응**
```yaml
GPT-5 컨설팅 품질 저하:
  - 컨텍스트 문서 긴급 업데이트
  - 할루시네이션 시정 로그 강화
  - 추가 배경 정보 제공

자동 보고 시스템 실패:
  - 수동 보고 체계로 즉시 전환  
  - 시스템 복구 우선순위 최상위
  - 근본 원인 분석 및 개선
```

## 📚 File Guardrails
- **Edit Allowed**: `src/**`, `web/**`, `scripts/**`, `docs/**`
- **Edit Forbidden**: `/internal/vdp_full/**`, unauthorized network calls
- **Commit Rules**: All tests green + Evidence Pack + No VDP_FULL exposure
- **Collaboration Rules**: 자동 메시지 생성 필수, 디렉토리 정보 포함 필수

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


