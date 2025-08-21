#!/bin/bash

# 🚀 Snap3 VDP Raw 시스템 컨텍스트 복구 스크립트
# 컴퓨터 재시작 후에도 모든 상황을 즉시 복구

echo "🔄 Snap3 VDP Raw 시스템 컨텍스트 복구 시작..."

# 1. 프로젝트 디렉토리로 이동
cd /Users/ted/snap3

# 2. 최신 Git 상태 확인
echo "📊 Git 상태 확인..."
git status --porcelain
echo ""

# 3. 최근 커밋 확인 (GPT-5 Pro CTO 컨설팅 요청)
echo "🎯 최근 GPT-5 Pro CTO 컨설팅 요청 확인..."
git log --oneline -5
echo ""

# 4. 현재 구현 상황 확인
echo "📋 현재 구현 상황 확인..."
echo "✅ T1→T3 어댑터: /api/vdp/generate 엔드포인트"
echo "✅ JSON-only 강제: Zod 스키마 검증"
echo "✅ VDP Post-Merge: Deep Merge 함수"
echo "✅ 헬스체크 기반 라우팅: 엔진 선택 로직"
echo "⚠️ T3 서브 서버: 422 에러 (스키마 검증 실패)"
echo "⚠️ 포트 충돌: T3 서브 서버가 3001 포트 사용 시도"
echo "⚠️ /readyz 엔드포인트: 인식 안됨"
echo ""

# 5. 서버 상태 확인
echo "🖥️ 서버 상태 확인..."
echo "T1 서버 (8080):"
curl -s http://localhost:8080/healthz | jq . 2>/dev/null || echo "❌ T1 서버 연결 실패"
echo ""

echo "T3 메인 서버 (3001):"
curl -s http://localhost:3001/healthz | jq . 2>/dev/null || echo "❌ T3 메인 서버 연결 실패"
echo ""

echo "T3 서브 서버 (8082):"
curl -s http://localhost:8082/healthz | jq . 2>/dev/null || echo "❌ T3 서브 서버 연결 실패"
echo ""

# 6. 중요 문서 확인
echo "📚 중요 문서 확인..."
echo "24시간 VDP Raw 구현 런북:"
ls -la docs/24-HOUR-VDP-RAW-IMPLEMENTATION-RUNBOOK.md 2>/dev/null || echo "❌ 런북 파일 없음"
echo ""

echo "GPT-5 Pro CTO 재컨설팅 요청:"
ls -la .collab-msg-cursor-gpt5-cto-vdp-raw-implementation-progress 2>/dev/null || echo "❌ 재컨설팅 요청 파일 없음"
echo ""

# 7. 현재 문제점 요약
echo "🎯 현재 문제점 요약:"
echo "1. T3 서브 서버 (8082) 422 에러 - 스키마 검증 실패"
echo "2. 포트 충돌 - T3 서브 서버가 3001 포트 사용 시도"
echo "3. /readyz 엔드포인트 인식 안됨"
echo ""

# 8. 다음 단계 안내
echo "🚀 다음 단계:"
echo "1. GPT-5 Pro CTO 재컨설팅 응답 대기"
echo "2. T3 서브 서버 422 에러 해결"
echo "3. 포트 설정 수정 (8082로 변경)"
echo "4. /readyz 엔드포인트 정상 작동 확인"
echo "5. VDP Raw 생성 테스트"
echo ""

# 9. 빠른 복구 명령어 안내
echo "⚡ 빠른 복구 명령어:"
echo "T1 서버 시작: node simple-web-server.js"
echo "T3 메인 서버 시작: cd services/vdp-extractor && npm start"
echo "T3 서브 서버 시작: cd services/vdp-extractor && PORT=8082 npm start"
echo ""

echo "✅ 컨텍스트 복구 완료! GPT-5 Pro CTO 재컨설팅 응답을 기다리는 중..."
