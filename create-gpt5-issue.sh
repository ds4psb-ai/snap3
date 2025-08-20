#!/bin/bash

# GPT-5 컨설팅 Issue 자동 생성 스크립트
echo "🚀 GPT-5 디버깅 컨설팅 Issue 생성 중..."

gh issue create \
  --title "🚨 GPT-5 컨설팅: 경량 디버깅 예방 재귀개선 시스템" \
  --body "$(cat .collab-msg-gpt5-lightweight-debugging-enhancement)" \
  --label "gpt5-consulting,debugging,recursive-improvement,high-priority" \
  --assignee "@me"

echo "✅ GPT-5 컨설팅 Issue 생성 완료!"
echo "📋 Issue URL에서 GPT-5 전문가 응답을 기다려주세요"