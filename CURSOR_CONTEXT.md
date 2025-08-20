# 🎯 Cursor Context for GPT-5 Triangular Workflow

**Generated**: 2025-08-20 17:06:21 UTC
**Branch**: main
**SHA**: 84e6e0da37974c48d43bc57470eb700393ffd455
**Workspace**: /Users/ted/snap3

## 📋 Recent 5 Commits
```
84e6e0d: Auto-processed ClaudeCode message: .collab-msg-test-1755709417.processed.processed.processed.processed.processed.processed.processed.processed (3 files, +7/-6)
b8f2ea9: Auto-processed ClaudeCode message: .collab-msg-claudecode-automation-system-ready.processed.processed.processed.processed.processed.processed (3 files, +107/-6)
f39750d: Auto-processed ClaudeCode message: .collab-msg-auto-quality-improvement.processed.processed.processed.processed.processed.processed.processed.processed (3 files, +18/-6)
1feeaad: Auto-processed ClaudeCode message: .collab-msg-test-auto-detection.processed.processed.processed.processed.processed.processed (3 files, +15/-6)
f522cbe: Auto-processed ClaudeCode message: .collab-msg-test-1755709417.processed.processed.processed.processed.processed.processed.processed (3 files, +7/-6)
```

## 🖥️ Cursor Development Environment

### Current Status:
- **Node.js**: v22.18.0
- **npm**: 10.9.3

### Port Status:
- **Port 3000** (Next.js): 🟢 Active
- **Port 8080** (Simple Server): 🟢 Active

### Quick Commands:
```bash
# Start Next.js development server
npm run dev

# Start simple web server (ingester UI)
node simple-web-server.js

# Health check
curl http://localhost:8080/api/health

# Test Instagram/TikTok extractor
open http://localhost:3000/instagram-extractor
```

## 🚀 Key Features Status

### Instagram & TikTok Metadata Extractor:
- **Location**: `src/app/instagram-extractor/page.tsx`
- **API Endpoints**:
  - `/api/instagram/metadata` - Instagram 메타데이터 추출
  - `/api/tiktok/metadata` - TikTok 메타데이터 추출
  - `/api/instagram/download` - Instagram 비디오 다운로드
  - `/api/tiktok/download` - TikTok 비디오 다운로드

### VDP Platform Integration:
- **Ingester UI**: http://localhost:8080 (simple-web-server.js)
- **Main UI**: http://localhost:3000 (Next.js app)
- **API Normalization**: `/api/normalize-url`
- **VDP Extract**: `/api/vdp/extract-vertex`

## 📁 Project Structure
```
src/
├── app/
│   ├── api/                    # API 엔드포인트
│   │   ├── instagram/
│   │   ├── tiktok/
│   │   └── normalize-url/
│   ├── instagram-extractor/    # 메타데이터 추출기 UI
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn-ui 컴포넌트
│   └── curator/
├── lib/
│   ├── schemas/                # Zod 스키마
│   └── instagram-comment-extractor.js
└── hooks/

scripts/
├── generate_summary.sh         # ClaudeCode용 컨텍스트
└── generate_cursor_context.sh  # Cursor용 컨텍스트

Key Files:
├── simple-web-server.js        # 인제스터 UI 서버 (포트 8080)
├── package.json                # Node.js 의존성
└── INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md
```

## 🔄 Triangular Workflow Integration

### Role Distribution:
- **GPT-5 Pro (HEAD)**: 전략적 의사결정, 아키텍처 설계, 코드 리뷰
- **ClaudeCode (main)**: 백엔드 서비스, 데이터 처리, 인프라 관리
- **Cursor (sub)**: 프론트엔드 개발, UI 컴포넌트, 사용자 경험

### Communication Pattern:
1. **Context Sharing**: 이 문서를 GPT-5에 복사하여 현재 상태 공유
2. **Task Assignment**: GPT-5가 ClaudeCode와 Cursor에 역할별 작업 분배
3. **Progress Updates**: 각 에이전트가 작업 완료 후 컨텍스트 업데이트
4. **Integration**: GPT-5가 전체 작업을 조율하고 통합

### Quick Start for GPT-5:
```
1. Copy this entire document to new GPT-5 chat
2. Add: 'Use this context for ClaudeCode ↔ Cursor triangular collaboration'
3. Assign tasks based on current status and requirements
4. Monitor progress through GitHub Actions auto-comments
```

## 🛠️ Troubleshooting Guide

### Common Issues:
- **Port 3000 in use**: `lsof -ti:3000 | xargs kill -9`
- **Port 8080 in use**: `lsof -ti:8080 | xargs kill -9`
- **npm dependencies**: `npm install`
- **Instagram extractor not working**: Check `src/app/instagram-extractor/page.tsx`
- **API endpoints failing**: Restart development server

### Health Checks:
```bash
# Check if servers are running
curl http://localhost:3000/api/health || echo 'Next.js server down'
curl http://localhost:8080/api/health || echo 'Simple server down'

# Test Instagram extractor
curl -X POST http://localhost:3000/api/instagram/metadata \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://www.instagram.com/reel/example"}'
```

## 🔗 Quick Links
- **Repository**: https://github.com/ds4psb-ai/snap3
- **Current Commit**: https://github.com/ds4psb-ai/snap3/commit/84e6e0da37974c48d43bc57470eb700393ffd455
- **Instagram Extractor**: http://localhost:3000/instagram-extractor
- **Ingester UI**: http://localhost:8080
- **Documentation**: `INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md`

---
*🤖 Generated by Cursor Context Script • 2025-08-20 17:06:21 UTC*
