#!/usr/bin/env bash
set -euo pipefail

# Cursor ↔ ClaudeCode 실시간 협업 알림 시스템
# 삼각편대 협업을 위한 즉시 통신 도구

cd "$(git rev-parse --show-toplevel)"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_cursor() { echo -e "${PURPLE}[CURSOR]${NC} $1"; }
log_claudecode() { echo -e "${CYAN}[CLAUDECODE]${NC} $1"; }

# 협업 메시지 생성
create_collaboration_message() {
    local agent="$1"
    local action="$2"
    local details="$3"
    local priority="${4:-normal}"
    
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    local message_id=$(date +%s%N | cut -b1-13)
    
    cat > ".collab-msg-$message_id" << EOF
# 🤝 삼각편대 협업 메시지

**ID**: $message_id
**Agent**: $agent
**Action**: $action
**Priority**: $priority
**Timestamp**: $timestamp

## 📋 상세 내용
$details

## 🎯 다음 단계
- [ ] ClaudeCode 확인
- [ ] Cursor 확인  
- [ ] GPT-5 Pro 검토
- [ ] 작업 완료

## 📊 상태
- Status: Pending
- Created: $timestamp
- Agent: $agent
EOF
    
    echo "$message_id"
}

# 메시지 전송
send_message() {
    local agent="$1"
    local action="$2"
    local details="$3"
    local priority="${4:-normal}"
    
    log_info "📤 $agent에서 메시지 전송 중..."
    
    local message_id=$(create_collaboration_message "$agent" "$action" "$details" "$priority")
    
    # Git에 메시지 파일 추가
    git add ".collab-msg-$message_id"
    git commit -m "🤝 $agent: $action

    삼각편대 협업 메시지 전송
    
    - Message ID: $message_id
    - Agent: $agent
    - Action: $action
    - Priority: $priority
    - Details: $details
    
    📤 Collaboration notification sent"
    
    # 원격 저장소에 푸시
    git push origin $(git branch --show-current)
    
    log_success "메시지 전송 완료! ID: $message_id"
    echo "다음 단계:"
    echo "  1. ClaudeCode/Cursor에서 git pull로 메시지 확인"
    echo "  2. .collab-msg-$message_id 파일 읽기"
    echo "  3. 응답 메시지 전송"
}

# 메시지 확인
check_messages() {
    log_info "📥 협업 메시지 확인 중..."
    
    # 최신 메시지 파일들 찾기
    local messages=$(find . -name ".collab-msg-*" -type f -mtime -1 2>/dev/null | sort -r)
    
    if [[ -z "$messages" ]]; then
        log_info "새로운 협업 메시지가 없습니다."
        return 0
    fi
    
    echo ""
    echo "📬 새로운 협업 메시지들:"
    echo "================================"
    
    for msg_file in $messages; do
        if [[ -f "$msg_file" ]]; then
            echo ""
            echo "📄 $msg_file:"
            echo "--------------------------------"
            cat "$msg_file"
            echo "--------------------------------"
        fi
    done
    
    echo ""
    echo "💡 응답하려면:"
    echo "  $0 respond <message-id> <response-text>"
}

# 메시지 응답
respond_to_message() {
    local message_id="$1"
    local response_text="$2"
    local agent="${3:-$(whoami)}"
    
    local msg_file=".collab-msg-$message_id"
    
    if [[ ! -f "$msg_file" ]]; then
        log_error "메시지를 찾을 수 없습니다: $message_id"
        return 1
    fi
    
    log_info "📝 메시지 응답 중: $message_id"
    
    # 응답 추가
    cat >> "$msg_file" << EOF

## 💬 응답
**Agent**: $agent
**Timestamp**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Response**: $response_text

---
EOF
    
    # Git에 응답 추가
    git add "$msg_file"
    git commit -m "💬 $agent: Respond to $message_id

    삼각편대 협업 메시지 응답
    
    - Message ID: $message_id
    - Agent: $agent
    - Response: $response_text
    
    💬 Collaboration response sent"
    
    # 원격 저장소에 푸시
    git push origin $(git branch --show-current)
    
    log_success "응답 전송 완료!"
}

# 작업 완료 알림
notify_completion() {
    local task_name="$1"
    local agent="${2:-$(whoami)}"
    local details="${3:-Task completed successfully}"
    
    log_info "✅ 작업 완료 알림 전송 중..."
    
    send_message "$agent" "Task Completed: $task_name" "$details" "high"
}

# 작업 시작 알림
notify_start() {
    local task_name="$1"
    local agent="${2:-$(whoami)}"
    local details="${3:-Starting work on task}"
    
    log_info "🚀 작업 시작 알림 전송 중..."
    
    send_message "$agent" "Task Started: $task_name" "$details" "normal"
}

# 도움말
show_usage() {
    cat << EOF
🤝 Cursor ↔ ClaudeCode 실시간 협업 알림 시스템

사용법:
  $0 [COMMAND] [OPTIONS]

명령어:
  send <agent> <action> <details> [priority]  - 협업 메시지 전송
  check                                        - 메시지 확인
  respond <message-id> <response> [agent]      - 메시지 응답
  start <task> [agent] [details]               - 작업 시작 알림
  complete <task> [agent] [details]            - 작업 완료 알림
  list                                         - 모든 메시지 목록
  clear                                        - 오래된 메시지 정리

옵션:
  --help                                       - 이 도움말 표시

예시:
  $0 send "Cursor" "UI Update" "Instagram extractor UI completed" "high"
  $0 check
  $0 respond "1234567890" "API integration completed" "ClaudeCode"
  $0 start "VDP Integration" "Cursor" "Starting frontend-backend integration"
  $0 complete "API Development" "ClaudeCode" "All endpoints tested and working"

EOF
}

# 메시지 목록
list_messages() {
    log_info "📋 모든 협업 메시지 목록:"
    
    local messages=$(find . -name ".collab-msg-*" -type f 2>/dev/null | sort -r)
    
    if [[ -z "$messages" ]]; then
        log_info "협업 메시지가 없습니다."
        return 0
    fi
    
    echo ""
    echo "📬 협업 메시지 목록:"
    echo "================================"
    
    for msg_file in $messages; do
        if [[ -f "$msg_file" ]]; then
            local message_id=$(basename "$msg_file" | sed 's/\.collab-msg-//')
            local timestamp=$(grep "Timestamp:" "$msg_file" | head -1 | cut -d':' -f2- | xargs)
            local agent=$(grep "Agent:" "$msg_file" | head -1 | cut -d':' -f2- | xargs)
            local action=$(grep "Action:" "$msg_file" | head -1 | cut -d':' -f2- | xargs)
            
            echo "ID: $message_id | $timestamp | $agent | $action"
        fi
    done
}

# 오래된 메시지 정리
clear_old_messages() {
    log_info "🧹 오래된 협업 메시지 정리 중..."
    
    # 7일 이상 된 메시지 파일들 찾기
    local old_messages=$(find . -name ".collab-msg-*" -type f -mtime +7 2>/dev/null)
    
    if [[ -z "$old_messages" ]]; then
        log_info "정리할 오래된 메시지가 없습니다."
        return 0
    fi
    
    echo "다음 메시지들을 정리합니다:"
    echo "$old_messages"
    echo ""
    
    read -p "정말로 삭제하시겠습니까? (y/N): " confirm
    
    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        for msg_file in $old_messages; do
            rm -f "$msg_file"
            log_info "삭제됨: $msg_file"
        done
        
        # Git에서도 제거
        git add -A
        git commit -m "🧹 Clean up old collaboration messages

        오래된 협업 메시지 정리
        
        - Removed: $(echo "$old_messages" | wc -l | tr -d ' ') old messages
        - Cleanup: 7+ days old messages removed
        
        🧹 Collaboration cleanup completed"
        
        git push origin $(git branch --show-current)
        
        log_success "오래된 메시지 정리 완료!"
    else
        log_info "정리 작업이 취소되었습니다."
    fi
}

# 메인 로직
main() {
    case "${1:-help}" in
        send)
            if [[ $# -lt 4 ]]; then
                log_error "send 명령어는 agent, action, details가 필요합니다."
                show_usage
                exit 1
            fi
            send_message "$2" "$3" "$4" "${5:-normal}"
            ;;
        check)
            check_messages
            ;;
        respond)
            if [[ $# -lt 3 ]]; then
                log_error "respond 명령어는 message-id와 response가 필요합니다."
                show_usage
                exit 1
            fi
            respond_to_message "$2" "$3" "${4:-$(whoami)}"
            ;;
        start)
            if [[ $# -lt 2 ]]; then
                log_error "start 명령어는 task가 필요합니다."
                show_usage
                exit 1
            fi
            notify_start "$2" "${3:-$(whoami)}" "${4:-Starting work on task}"
            ;;
        complete)
            if [[ $# -lt 2 ]]; then
                log_error "complete 명령어는 task가 필요합니다."
                show_usage
                exit 1
            fi
            notify_completion "$2" "${3:-$(whoami)}" "${4:-Task completed successfully}"
            ;;
        list)
            list_messages
            ;;
        clear)
            clear_old_messages
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
