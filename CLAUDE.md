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

### Core APIs
```typescript
POST /api/normalize-url          // URL → content_id extraction
POST /api/vdp/extract-vertex     // Actual VDP processing (JSON-only)
POST /api/extract-social-metadata // Cursor extractor integration (NEW)
GET  /api/health                 // System status
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

---

## 📚 File Guardrails
- **Edit Allowed**: `src/**`, `web/**`, `scripts/**`, `docs/**`
- **Edit Forbidden**: `/internal/vdp_full/**`, unauthorized network calls
- **Commit Rules**: All tests green + Evidence Pack + No VDP_FULL exposure

