#!/usr/bin/env bash
set -euo pipefail

# Pinned Context 수동 생성 스크립트
# 사용법: ./scripts/create_pinned_context_manual.sh [--github-issue]

cd "$(git rev-parse --show-toplevel)"

CREATE_ISSUE=false
OUTPUT_FILE="PINNED_CONTEXT.md"

while [[ $# -gt 0 ]]; do
  case $1 in
    --github-issue)
      CREATE_ISSUE=true
      shift
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --github-issue     Also create/update GitHub issue"
      echo "  --output FILE      Save to specific file (default: PINNED_CONTEXT.md)"
      echo "  -h, --help         Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🔄 Generating Pinned Context..."

# 핀드 컨텍스트 생성  
CURRENT_DATE=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
cat > "$OUTPUT_FILE" << 'EOF'
# 🎯 VDP Pipeline - 삼각편대 영구 컨텍스트

**📅 Last Updated**: TIMESTAMP_PLACEHOLDER
**🔄 Manual Generation**: Created by scripts/create_pinned_context_manual.sh  
**📌 Purpose**: 영구적인 프로젝트 컨텍스트 - GPT-5 Pro ↔ ClaudeCode ↔ Cursor 삼각편대

## 🏠 프로젝트 개요

### 📋 기본 정보
- **프로젝트**: VDP RAW Generation Pipeline
- **목적**: YouTube, Instagram, TikTok 콘텐츠 → VDP(Video Data Package) 생성
- **아키텍처**: 4터미널 + 2UI + Platform-segmented GCS
- **핵심 버킷**: `tough-variety-raw-central1` (us-central1)
- **Working Directory**: `~/snap3`

### 📋 최근 변경사항
```
EOF

# 최근 5커밋 요약 추가
bash scripts/generate_summary.sh >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
```

## 🎯 삼각편대 역할 분담

### 🧠 GPT-5 Pro (HEAD 코치)
- **역할**: 전략 수립, 의사결정, 작업 조율
- **방법**: 이 컨텍스트 전체를 새 채팅에 복사 → `Use this for triangular collaboration`
- **워크플로우**: [삼각편대 가이드](docs/GPT5_CLAUDECODE_CURSOR_TRIANGULAR_WORKFLOW.md)

### ⚙️ ClaudeCode (MAIN 구현)
- **역할**: 백엔드 서비스, API, 데이터 처리, 4터미널 운영
- **특화**: VDP 추출, GCS 처리, BigQuery 적재, 워커 시스템
- **터미널**: Main T1(~/snap3), Jobs T2(~/snap3-jobs), T2VDP T3(~/snap3/services/t2-extract), Storage T4(~/snap3-storage)

### 🎨 Cursor (SUB 구현)
- **역할**: 프론트엔드, UI/UX, 컴포넌트, 클라이언트 로직
- **특화**: Next.js 개발, shadcn-ui, Instagram/TikTok 메타데이터 추출기
- **서버**: npm run dev (3000), node simple-web-server.js (8080)

## 🖥️ 시스템 구조 & 상태

### 🌐 UI 서버 (2개)
- **인제스트 UI**: http://localhost:8080 (`node simple-web-server.js`)
  - 용도: YouTube/Instagram/TikTok URL 입력 및 처리
  - API: POST /api/vdp/extract-vertex, POST /api/normalize-url
- **메인 UI**: http://localhost:3000 (`npm run dev`)
  - 용도: 비디오 생성 파이프라인, Instagram 추출기
  - 특별 기능: /instagram-extractor (Production Ready)

### ⚙️ 핵심 환경변수
```bash
PROJECT_ID="tough-variety-466003-c5"
REGION="us-central1"
RAW_BUCKET="tough-variety-raw-central1"
PLATFORM_SEGMENTED_PATH=true
```

## ✅ 최근 완성 기능 (Production Ready)

### 1. Instagram & TikTok 메타데이터 추출기
- **위치**: http://localhost:3000/instagram-extractor
- **기능**: 7단계 추출 전략, 실제 데이터 100%, 워터마크 없는 다운로드
- **API**: /api/instagram/metadata, /api/tiktok/metadata
- **문서**: [완전한 기술 문서](INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md)

### 2. GPT-5↔ClaudeCode↔Cursor 삼각편대 워크플로우
- **GitHub Actions**: 자동 컨텍스트 생성 (PR/커밋마다)
- **로컬 스크립트**: generate_summary.sh, generate_cursor_context.sh
- **문서**: [워크플로우 가이드](docs/GPT5_CLAUDECODE_CURSOR_TRIANGULAR_WORKFLOW.md)

### 3. VDP RAW Generation Pipeline
- **플랫폼**: YouTube(자동), Instagram(조건부), TikTok(조건부)
- **처리**: URL → content_id → VDP RAW + Hook Genome → BigQuery 적재
- **검증**: AJV 스키마, Hook gates (≤3s, ≥0.70), Evidence Pack v2.0

## 🚀 즉시 시작 가능한 작업들

### 🎯 우선순위 1: Instagram/TikTok 추출기 VDP 통합
- **목표**: 인제스트 UI에서 URL 입력 시 자동으로 메타데이터 추출해서 폼 채우기
- **대상 파일**: web/scripts/url-auto-fill.js + 새로운 통합 로직
- **예상 효과**: 사용자 입력 시간 80% 단축

### 🎯 우선순위 2: UI/UX 통합 개선
- **목표**: 2개 UI(3000/8080) 간 일관성 있는 디자인
- **대상**: shadcn-ui 컴포넌트 표준화, 반응형 디자인

### 🎯 우선순위 3: 성능 최적화
- **목표**: 메타데이터 추출 속도 개선, 캐싱 시스템
- **대상**: API 응답 시간, 클라이언트 사이드 최적화

## 🖥️ 핵심 명령어 참고

### ClaudeCode 터미널 명령어
```bash
# Main T1 (~/snap3)
cd ~/snap3 && scripts/generate_summary.sh

# Jobs T2 (~/snap3-jobs)
cd ~/snap3-jobs && ./worker-ingest-v2.sh --health

# T2VDP T3 (~/snap3/services/t2-extract)
cd ~/snap3/services/t2-extract && ./run-all-checks.sh

# Storage T4 (~/snap3-storage)
cd ~/snap3-storage && ./scripts/quick-validation.sh
```

### Cursor 명령어
```bash
# 메인 UI 개발 서버
npm run dev  # http://localhost:3000

# 인제스트 UI 서버
node simple-web-server.js  # http://localhost:8080

# 테스트 및 검증
npm test
curl http://localhost:8080/api/health
curl http://localhost:3000/api/instagram/metadata
```

## 🔄 컨텍스트 업데이트 가이드

### 자동 업데이트
- **트리거**: main 브랜치 push, PR 생성
- **결과**: GitHub issue가 자동으로 업데이트됨
- **확인**: Actions 탭에서 워크플로우 상태 확인

### 수동 업데이트
```bash
# ClaudeCode 컨텍스트
./scripts/generate_summary.sh

# Cursor 컨텍스트
./scripts/generate_cursor_context.sh --include-files

# GPT-5 Pro 컨텍스트
./scripts/generate_context_for_gpt5.sh --include-files --include-diff

# 이 영구 컨텍스트 재생성
./scripts/create_pinned_context_manual.sh
```

## 🚨 중요 제약사항 (절대 준수)

### 인프라 정책
- **버킷**: tough-variety-raw-central1 ONLY (다른 버킷 사용 금지)
- **리전**: us-central1 통일 (cross-region 금지)
- **플랫폼 세그먼트**: gs://bucket/raw/vdp/{platform}/ 구조 필수

### API 정책
- **JSON-only**: FormData/multipart 완전 금지
- **Content_ID**: 모든 인제스트 요청에 필수
- **Content_Key**: platform:content_id 형식으로 글로벌 유니크

### UI 구분
- **8080 = 인제스트 UI**: YouTube/Instagram/TikTok 입력 처리
- **3000 = 메인 UI**: 비디오 생성 파이프라인 + 메타데이터 추출기

## 🔗 핵심 링크 모음

### 📚 문서
- [삼각편대 워크플로우](docs/GPT5_CLAUDECODE_CURSOR_TRIANGULAR_WORKFLOW.md)
- [Cursor 통합 가이드](docs/CURSOR_TRIANGULAR_INTEGRATION.md)
- [컨텍스트 시스템 가이드](docs/CONTEXT_SYSTEM_GUIDE.md)
- [Instagram/TikTok 추출기](INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md)

### 🔧 개발
- [Repository](https://github.com/your-repo/snap3)
- [Actions](https://github.com/your-repo/snap3/actions)
- [Issues](https://github.com/your-repo/snap3/issues)

---

**🎯 사용법**: 이 컨텍스트 전체를 새로운 GPT-5 Pro 채팅에 복사 → `Use this context for ClaudeCode ↔ Cursor triangular collaboration` 추가 → 즉시 삼각편대 협업 시작!

**🔄 업데이트**: `./scripts/create_pinned_context_manual.sh` 명령어로 언제든지 최신 상태로 갱신 가능

*🤖 Generated by create_pinned_context_manual.sh*
EOF

# 날짜 치환
sed -i '' "s/TIMESTAMP_PLACEHOLDER/$CURRENT_DATE/g" "$OUTPUT_FILE"

echo "✅ Pinned context created: $OUTPUT_FILE"

# GitHub Issue 생성 (옵션)
if [[ "$CREATE_ISSUE" == true ]]; then
  echo "🔄 Creating GitHub issue..."
  
  # gh CLI 사용 (설치되어 있다면)
  if command -v gh &> /dev/null; then
    gh issue create \
      --title "🎯 VDP Pipeline - 삼각편대 영구 컨텍스트" \
      --body-file "$OUTPUT_FILE" \
      --label "📌 PINNED,triangular-workflow,context,GPT-5,ClaudeCode,Cursor" \
      || echo "⚠️ GitHub issue creation failed. Please create manually."
  else
    echo "⚠️ gh CLI not found. Please install or create issue manually:"
    echo "   Title: 🎯 VDP Pipeline - 삼각편대 영구 컨텍스트"
    echo "   Body: Copy from $OUTPUT_FILE"
    echo "   Labels: 📌 PINNED, triangular-workflow, context, GPT-5, ClaudeCode, Cursor"
  fi
fi

echo ""
echo "📋 Usage:"
echo "1. Copy content from $OUTPUT_FILE to new GPT-5 Pro chat"
echo "2. Add: 'Use this context for ClaudeCode ↔ Cursor triangular collaboration'"
echo "3. Start collaborating immediately!"
echo ""
echo "🔄 Update anytime with: ./scripts/create_pinned_context_manual.sh"