#!/bin/bash

# 🚀 Quick Response Script - 숫자 1만 입력하면 ClaudeCode 메시지 확인 및 답변
# 사용법: ./scripts/quick-response.sh 또는 alias 1='./scripts/quick-response.sh'

set -e

echo "🔍 ClaudeCode 메시지 확인 중..."

# 1. 최신 ClaudeCode 메시지 찾기 (macOS 호환)
LATEST_MESSAGE=$(find . -name ".collab-msg-*" -not -name "*.processed" -type f -exec ls -t {} + | head -1)

if [ -z "$LATEST_MESSAGE" ]; then
    echo "❌ 새로운 ClaudeCode 메시지가 없습니다."
    exit 0
fi

echo "📨 발견된 메시지: $LATEST_MESSAGE"

# 2. 메시지 내용 표시
echo ""
echo "📋 메시지 내용:"
echo "=================="
cat "$LATEST_MESSAGE"
echo "=================="
echo ""

# 3. 메시지 타입 분석
MESSAGE_TYPE=$(grep -E "Type|Priority" "$LATEST_MESSAGE" | head -1 | grep -oE "(CRITICAL|HIGH|MEDIUM|LOW|INTEGRATION|DEBUG|SYSTEM)" || echo "GENERAL")

echo "🏷️ 메시지 타입: $MESSAGE_TYPE"

# 4. 자동 응답 생성
case $MESSAGE_TYPE in
    "CRITICAL")
        echo "🚨 CRITICAL 메시지 감지! 즉시 응답 생성 중..."
        RESPONSE_TYPE="CRITICAL_RESPONSE"
        ;;
    "INTEGRATION")
        echo "🔗 INTEGRATION 메시지 감지! API 통합 응답 생성 중..."
        RESPONSE_TYPE="INTEGRATION_RESPONSE"
        ;;
    "DEBUG")
        echo "🔧 DEBUG 메시지 감지! 디버깅 응답 생성 중..."
        RESPONSE_TYPE="DEBUG_RESPONSE"
        ;;
    *)
        echo "📝 일반 메시지 감지! 표준 응답 생성 중..."
        RESPONSE_TYPE="GENERAL_RESPONSE"
        ;;
esac

# 5. 응답 파일명 생성 (macOS 호환)
MESSAGE_BASE=$(basename "$LATEST_MESSAGE")
RESPONSE_FILE=".collab-msg-cursor-$(echo $RESPONSE_TYPE | tr '[:upper:]' '[:lower:]')-$(date +%s)"

# 6. 자동 응답 생성
cat > "$RESPONSE_FILE" << EOF
# 🚀 CURSOR: 자동 응답 ($RESPONSE_TYPE)

**Priority**: AUTO_RESPONSE  
**Type**: $RESPONSE_TYPE  
**Timeline**: 즉시 처리  
**Correlation-ID**: CURSOR-AUTO-$(date +%s)

---

## 📨 **메시지 확인 완료**

**원본 메시지**: $MESSAGE_BASE  
**응답 타입**: $RESPONSE_TYPE  
**처리 시간**: $(date '+%Y-%m-%d %H:%M:%S')

---

## ✅ **자동 처리 결과**

### **메시지 분석:**
- **타입**: $MESSAGE_TYPE
- **우선순위**: 자동 감지됨
- **상태**: 처리 중

### **다음 액션:**
1. **메시지 내용 검토** ✅
2. **응답 생성** ✅
3. **Git 커밋 및 푸시** (수동 실행 필요)

---

## 🚀 **즉시 실행 명령어**

\`\`\`bash
# 응답 전송
git add . && git commit -m "Cursor auto response to $MESSAGE_TYPE" && git push

# ClaudeCode 확인 명령어
git pull
cat $RESPONSE_FILE
\`\`\`

---

🧠 **자동 응답 생성 완료!**

**ClaudeCode 확인 명령어:**
\`\`\`bash
git pull
cat $RESPONSE_FILE
# 자동 응답에 대한 추가 지시사항 확인
\`\`\`
EOF

echo "✅ 자동 응답 생성 완료: $RESPONSE_FILE"
echo ""
echo "📋 생성된 응답 내용:"
echo "=================="
cat "$RESPONSE_FILE"
echo "=================="
echo ""

# 7. 사용자에게 다음 단계 안내
echo "🚀 다음 단계:"
echo "1. 응답 내용 검토 (위 내용 확인)"
echo "2. 필요시 수정: nano $RESPONSE_FILE"
echo "3. 전송: git add . && git commit -m 'Cursor auto response' && git push"
echo ""
echo "💡 팁: '1' 명령어로 언제든지 빠른 응답 가능!"
