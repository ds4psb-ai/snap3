#!/usr/bin/env bash
set -euo pipefail

# Cursor 전용 컨텍스트 생성 스크립트
# GPT-5 Pro ↔ ClaudeCode ↔ Cursor 삼각편대 시스템
# 사용법: ./scripts/generate_cursor_context.sh [--include-files] [--include-diff]

cd "$(git rev-parse --show-toplevel)"

# 옵션 파싱
INCLUDE_FILES=false
INCLUDE_DIFF=false
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --include-files)
      INCLUDE_FILES=true
      shift
      ;;
    --include-diff)
      INCLUDE_DIFF=true
      shift
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--include-files] [--include-diff] [--output FILE]"
      exit 1
      ;;
  esac
done

# 출력 대상 설정
if [[ -n "$OUTPUT_FILE" ]]; then
  exec > "$OUTPUT_FILE"
fi

echo "# 🎯 Cursor Context for GPT-5 Triangular Workflow"
echo ""
echo "**Generated**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "**Branch**: $(git branch --show-current)"
echo "**SHA**: $(git rev-parse HEAD)"
echo "**Workspace**: $(pwd)"
echo ""

# 최근 5커밋 요약
echo "## 📋 Recent 5 Commits"
echo '```'
for c in $(git log -n 5 --pretty=format:"%h"); do
  msg=$(git log -1 --pretty=format:"%s" "$c")
  # 변경 통계 (파일수/증감 라인) 추출
  stat=$(git diff --shortstat "${c}^" "$c" 2>/dev/null | sed 's/^ //;s/,//g' || echo "")
  files=$(echo "$stat" | awk '{print $1}' || echo "0")
  adds=$(echo "$stat" | grep -o '[0-9]\+ insertions*(\+)*' | awk '{print $1}' | tr -d '\n' || echo "0")
  dels=$(echo "$stat" | grep -o '[0-9]\+ deletions*(\-)*' | awk '{print $1}' | tr -d '\n' || echo "0")
  adds=${adds:-0}; dels=${dels:-0}; files=${files:-0}
  echo "$c: $msg (${files} files, +${adds}/-${dels})"
done
echo '```'
echo ""

# Cursor 개발 환경 상태
echo "## 🖥️ Cursor Development Environment"
echo ""
echo "### Current Status:"
if command -v npm >/dev/null 2>&1; then
  echo "- **Node.js**: $(node --version 2>/dev/null || echo 'Not available')"
  echo "- **npm**: $(npm --version 2>/dev/null || echo 'Not available')"
else
  echo "- **Node.js/npm**: Not available"
fi

# 포트 상태 체크
echo ""
echo "### Port Status:"
if command -v lsof >/dev/null 2>&1; then
  if lsof -ti:3000 >/dev/null 2>&1; then
    echo "- **Port 3000** (Next.js): 🟢 Active"
  else
    echo "- **Port 3000** (Next.js): 🔴 Inactive"
  fi
  if lsof -ti:8080 >/dev/null 2>&1; then
    echo "- **Port 8080** (Simple Server): 🟢 Active"
  else
    echo "- **Port 8080** (Simple Server): 🔴 Inactive"
  fi
else
  echo "- Port status check not available (lsof not found)"
fi

echo ""
echo "### Quick Commands:"
echo '```bash'
echo "# Start Next.js development server"
echo "npm run dev"
echo ""
echo "# Start simple web server (ingester UI)"
echo "node simple-web-server.js"
echo ""
echo "# Health check"
echo "curl http://localhost:8080/api/health"
echo ""
echo "# Test Instagram/TikTok extractor"
echo "open http://localhost:3000/instagram-extractor"
echo '```'
echo ""

# 주요 기능 상태
echo "## 🚀 Key Features Status"
echo ""
echo "### Instagram & TikTok Metadata Extractor:"
echo "- **Location**: \`src/app/instagram-extractor/page.tsx\`"
echo "- **API Endpoints**:"
echo "  - \`/api/instagram/metadata\` - Instagram 메타데이터 추출"
echo "  - \`/api/tiktok/metadata\` - TikTok 메타데이터 추출"
echo "  - \`/api/instagram/download\` - Instagram 비디오 다운로드"
echo "  - \`/api/tiktok/download\` - TikTok 비디오 다운로드"
echo ""
echo "### VDP Platform Integration:"
echo "- **Ingester UI**: http://localhost:8080 (simple-web-server.js)"
echo "- **Main UI**: http://localhost:3000 (Next.js app)"
echo "- **API Normalization**: \`/api/normalize-url\`"
echo "- **VDP Extract**: \`/api/vdp/extract-vertex\`"
echo ""

if [[ "$INCLUDE_FILES" == "true" ]]; then
  echo "## 📁 Project Structure"
  echo '```'
  # 주요 디렉토리와 파일만 표시
  echo "src/"
  echo "├── app/"
  echo "│   ├── api/                    # API 엔드포인트"
  echo "│   │   ├── instagram/"
  echo "│   │   ├── tiktok/"
  echo "│   │   └── normalize-url/"
  echo "│   ├── instagram-extractor/    # 메타데이터 추출기 UI"
  echo "│   └── globals.css"
  echo "├── components/"
  echo "│   ├── ui/                     # shadcn-ui 컴포넌트"
  echo "│   └── curator/"
  echo "├── lib/"
  echo "│   ├── schemas/                # Zod 스키마"
  echo "│   └── instagram-comment-extractor.js"
  echo "└── hooks/"
  echo ""
  echo "scripts/"
  echo "├── generate_summary.sh         # ClaudeCode용 컨텍스트"
  echo "└── generate_cursor_context.sh  # Cursor용 컨텍스트"
  echo ""
  echo "Key Files:"
  echo "├── simple-web-server.js        # 인제스터 UI 서버 (포트 8080)"
  echo "├── package.json                # Node.js 의존성"
  echo "└── INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md"
  echo '```'
  echo ""
fi

if [[ "$INCLUDE_DIFF" == "true" ]]; then
  echo "## 🔍 Recent Changes"
  echo '```diff'
  git diff HEAD~1 HEAD --stat | head -20
  echo '```'
  echo ""
  echo "### Detailed Diff (Last Commit):"
  echo '```diff'
  git diff HEAD~1 HEAD | head -50
  echo '```'
  echo ""
fi

# 삼각편대 워크플로우 가이드
echo "## 🔄 Triangular Workflow Integration"
echo ""
echo "### Role Distribution:"
echo "- **GPT-5 Pro (HEAD)**: 전략적 의사결정, 아키텍처 설계, 코드 리뷰"
echo "- **ClaudeCode (main)**: 백엔드 서비스, 데이터 처리, 인프라 관리"
echo "- **Cursor (sub)**: 프론트엔드 개발, UI 컴포넌트, 사용자 경험"
echo ""
echo "### Communication Pattern:"
echo "1. **Context Sharing**: 이 문서를 GPT-5에 복사하여 현재 상태 공유"
echo "2. **Task Assignment**: GPT-5가 ClaudeCode와 Cursor에 역할별 작업 분배"
echo "3. **Progress Updates**: 각 에이전트가 작업 완료 후 컨텍스트 업데이트"
echo "4. **Integration**: GPT-5가 전체 작업을 조율하고 통합"
echo ""

echo "### Quick Start for GPT-5:"
echo '```'
echo "1. Copy this entire document to new GPT-5 chat"
echo "2. Add: 'Use this context for ClaudeCode ↔ Cursor triangular collaboration'"
echo "3. Assign tasks based on current status and requirements"
echo "4. Monitor progress through GitHub Actions auto-comments"
echo '```'
echo ""

# 문제 해결 가이드
echo "## 🛠️ Troubleshooting Guide"
echo ""
echo "### Common Issues:"
echo "- **Port 3000 in use**: \`lsof -ti:3000 | xargs kill -9\`"
echo "- **Port 8080 in use**: \`lsof -ti:8080 | xargs kill -9\`"
echo "- **npm dependencies**: \`npm install\`"
echo "- **Instagram extractor not working**: Check \`src/app/instagram-extractor/page.tsx\`"
echo "- **API endpoints failing**: Restart development server"
echo ""
echo "### Health Checks:"
echo '```bash'
echo "# Check if servers are running"
echo "curl http://localhost:3000/api/health || echo 'Next.js server down'"
echo "curl http://localhost:8080/api/health || echo 'Simple server down'"
echo ""
echo "# Test Instagram extractor"
echo "curl -X POST http://localhost:3000/api/instagram/metadata \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"url\": \"https://www.instagram.com/reel/example\"}'"
echo '```'
echo ""

# 링크 모음
echo "## 🔗 Quick Links"
echo "- **Repository**: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]//;s/.git$//')"
echo "- **Current Commit**: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]//;s/.git$//')/commit/$(git rev-parse HEAD)"
echo "- **Instagram Extractor**: http://localhost:3000/instagram-extractor"
echo "- **Ingester UI**: http://localhost:8080"
echo "- **Documentation**: \`INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md\`"
echo ""

echo "---"
echo "*🤖 Generated by Cursor Context Script • $(date -u '+%Y-%m-%d %H:%M:%S UTC')*"
