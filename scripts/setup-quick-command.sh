#!/bin/bash

# 🚀 Quick Command Setup - 숫자 1을 단축 명령어로 설정
# 사용법: ./scripts/setup-quick-command.sh

echo "🚀 숫자 1 단축 명령어 설정 중..."

# 현재 디렉토리 경로
CURRENT_DIR=$(pwd)
QUICK_SCRIPT="$CURRENT_DIR/scripts/quick-response.sh"

# 1. .bashrc 또는 .zshrc에 alias 추가
if [ -f ~/.zshrc ]; then
    SHELL_RC=~/.zshrc
    echo "📝 .zshrc 파일에 alias 추가 중..."
elif [ -f ~/.bashrc ]; then
    SHELL_RC=~/.bashrc
    echo "📝 .bashrc 파일에 alias 추가 중..."
else
    echo "❌ .zshrc 또는 .bashrc 파일을 찾을 수 없습니다."
    exit 1
fi

# 2. 기존 alias 제거 (있다면)
sed -i.bak '/alias 1=/d' "$SHELL_RC"

# 3. 새로운 alias 추가
echo "" >> "$SHELL_RC"
echo "# 🚀 ClaudeCode 빠른 응답 단축 명령어" >> "$SHELL_RC"
echo "alias 1='$QUICK_SCRIPT'" >> "$SHELL_RC"

echo "✅ alias 설정 완료!"
echo ""
echo "📋 설정된 내용:"
echo "=================="
echo "alias 1='$QUICK_SCRIPT'"
echo "=================="
echo ""

# 4. 현재 세션에 즉시 적용
if [ -f ~/.zshrc ]; then
    source ~/.zshrc
    echo "✅ .zshrc 소스 완료"
elif [ -f ~/.bashrc ]; then
    source ~/.bashrc
    echo "✅ .bashrc 소스 완료"
fi

echo ""
echo "🎉 설정 완료! 이제 '1'만 입력하면 ClaudeCode 메시지를 확인하고 답변할 수 있습니다!"
echo ""
echo "💡 사용법:"
echo "  1                    # ClaudeCode 메시지 확인 및 자동 응답"
echo "  ./scripts/quick-response.sh  # 직접 실행"
echo ""
echo "🔧 테스트:"
echo "  1  # 지금 바로 테스트해보세요!"
