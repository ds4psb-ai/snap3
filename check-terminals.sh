#!/bin/bash

# 터미널 상태 점검 스크립트
echo "🔍 4개 터미널 점검 시작..."
echo "================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}📍 현재 브랜치:${NC} $CURRENT_BRANCH"

# 2. Git 상태 확인
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ Git 상태: 깨끗함${NC}"
else
    echo -e "${YELLOW}⚠️  Git 상태: 변경사항 있음${NC}"
    git status --short
fi

# 3. 브랜치 보호 확인
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo -e "${GREEN}🛡️  메인 브랜치 (보호됨)${NC}"
else
    echo -e "${YELLOW}🔧 작업 브랜치 (개발 가능)${NC}"
fi

# 4. Node.js 버전 확인
echo -e "${YELLOW}📦 Node.js:${NC} $(node -v)"

# 5. 포트 사용 확인
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ 포트 $1: 사용 중${NC}"
    else
        echo -e "${GREEN}✅ 포트 $1: 사용 가능${NC}"
    fi
}

echo "포트 상태:"
check_port 3000
check_port 3001
check_port 3002

# 6. Feature Flags 상태
if [ -f "src/lib/feature-flags/index.ts" ]; then
    echo -e "${GREEN}✅ Feature Flags: 설정됨${NC}"
else
    echo -e "${YELLOW}⚠️  Feature Flags: 미설정${NC}"
fi

# 7. 환경 변수 확인
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 파일: 존재${NC}"
else
    echo -e "${YELLOW}⚠️  .env 파일: 없음${NC}"
fi

echo "================================"
echo "터미널별 명령어:"
echo ""
echo "🖥️  터미널 1 (메인 - 보호):"
echo "   git checkout main"
echo "   git status"
echo ""
echo "🖥️  터미널 2 (Feature 1):"
echo "   git checkout -b feature/feature-1"
echo "   npm run dev"
echo ""
echo "🖥️  터미널 3 (Feature 2):"
echo "   git checkout -b feature/feature-2"
echo "   npm run dev -- --port 3001"
echo ""
echo "🖥️  터미널 4 (Feature 3):"
echo "   git checkout -b feature/feature-3"
echo "   npm run dev -- --port 3002"
echo ""
echo "================================"
echo "🚀 준비 완료! 개발 시작하세요!"