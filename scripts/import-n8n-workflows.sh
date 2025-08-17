#!/bin/bash

# n8n 워크플로우 자동 임포트 스크립트
set -e

N8N_BASE_URL="${N8N_BASE_URL:-http://localhost:5678}"
WORKFLOWS_DIR="./n8n-workflows"

echo "🚀 n8n 워크플로우 임포트 시작..."
echo "n8n URL: $N8N_BASE_URL"

# n8n이 실행 중인지 확인
echo "⏳ n8n 서버 확인 중..."
if ! curl -s "$N8N_BASE_URL/rest/config.js" > /dev/null; then
    echo "❌ n8n 서버가 실행되지 않음 ($N8N_BASE_URL)"
    echo "다음 명령으로 n8n을 먼저 실행하세요:"
    echo "N8N_PORT=5678 npx n8n start"
    exit 1
fi

echo "✅ n8n 서버 확인됨"

# 워크플로우 파일들 확인
if [ ! -d "$WORKFLOWS_DIR" ]; then
    echo "❌ 워크플로우 디렉토리 없음: $WORKFLOWS_DIR"
    exit 1
fi

# 각 워크플로우 임포트
for workflow_file in "$WORKFLOWS_DIR"/*.json; do
    if [ -f "$workflow_file" ]; then
        workflow_name=$(basename "$workflow_file" .json)
        echo "📦 임포트 중: $workflow_name"
        
        # n8n CLI를 사용하여 워크플로우 임포트
        if npx n8n import:workflow --input="$workflow_file"; then
            echo "✅ 성공: $workflow_name"
        else
            echo "⚠️  실패: $workflow_name (이미 존재할 수 있음)"
        fi
    fi
done

echo ""
echo "🎉 워크플로우 임포트 완료!"
echo "n8n 웹 인터페이스에서 확인: $N8N_BASE_URL"
echo ""
echo "📋 다음 단계:"
echo "1. $N8N_BASE_URL 접속"
echo "2. 워크플로우들이 활성화되었는지 확인"
echo "3. 환경 변수 설정 (YOUTUBE_API_KEY 등)"

# 웹훅 엔드포인트 표시
echo ""
echo "🔗 생성된 웹훅 엔드포인트:"
echo "- YouTube: $N8N_BASE_URL/webhook/youtube-metadata"
echo "- Instagram: $N8N_BASE_URL/webhook/instagram-metadata"  
echo "- TikTok: $N8N_BASE_URL/webhook/tiktok-metadata"