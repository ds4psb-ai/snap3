#!/bin/bash

# ClaudeCode 자동 메시지 모니터링 시스템
# Git hook을 통해 자동으로 메시지를 감지하고 처리

set -e

# 설정
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$REPO_DIR/logs/auto-message.log"
MESSAGE_PATTERN=".collab-msg-*"
CURSOR_TERMINAL="T1"  # Cursor가 사용하는 터미널

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 메시지 파일 감지 함수
detect_new_messages() {
    local new_messages=()
    
    # Git pull로 최신 변경사항 가져오기
    cd "$REPO_DIR"
    git pull --quiet 2>/dev/null || true
    
    # 새로운 메시지 파일 찾기 (최근 1분 내에 생성된 파일만)
    for file in $MESSAGE_PATTERN; do
        if [[ -f "$file" ]]; then
            # 파일이 최근 1분 내에 생성되었는지 확인 (processed 파일 제외)
            if [[ ! "$file" =~ \.processed$ ]] && [[ $(find "$file" -cmin -1 2>/dev/null) ]]; then
                new_messages+=("$file")
            fi
        fi
    done
    
    echo "${new_messages[@]}"
}

# 메시지 처리 함수
process_message() {
    local message_file="$1"
    local message_content=""
    
    log "새 메시지 감지: $message_file"
    
    # 메시지 내용 읽기
    if [[ -f "$message_file" ]]; then
        message_content=$(cat "$message_file")
        log "메시지 내용: $message_content"
        
        # 메시지 타입 분석
        if [[ "$message_content" == *"CRITICAL"* ]]; then
            log "🚨 CRITICAL 메시지 감지 - 즉시 처리 필요"
            handle_critical_message "$message_file" "$message_content"
        elif [[ "$message_content" == *"high"* ]]; then
            log "⚠️ HIGH 우선순위 메시지 감지"
            handle_high_priority_message "$message_file" "$message_content"
        else
            log "📝 일반 메시지 처리"
            handle_normal_message "$message_file" "$message_content"
        fi
        
        # 처리 완료 표시
        mark_message_processed "$message_file"
        
    else
        log "❌ 메시지 파일을 읽을 수 없음: $message_file"
    fi
}

# CRITICAL 메시지 처리
handle_critical_message() {
    local file="$1"
    local content="$2"
    
    # 즉시 알림 (터미널에 표시)
    echo ""
    echo "🚨🚨🚨 CRITICAL MESSAGE FROM CLAUDECODE 🚨🚨🚨"
    echo "================================================"
    echo "$content"
    echo "================================================"
    echo "🚨 즉시 확인 및 조치가 필요합니다! 🚨"
    echo ""
    
    # 소리 알림 (선택사항)
    echo -e "\a"  # 터미널 벨
    echo -e "\a"  # 터미널 벨
    
    # 추가 알림 (선택사항)
    # notify-send "ClaudeCode Critical Message" "$content" 2>/dev/null || true
}

# HIGH 우선순위 메시지 처리
handle_high_priority_message() {
    local file="$1"
    local content="$2"
    
    echo "⚠️ HIGH PRIORITY MESSAGE FROM CLAUDECODE ⚠️"
    echo "============================================"
    echo "$content"
    echo "============================================"
    echo "빠른 확인이 필요합니다."
}

# 일반 메시지 처리
handle_normal_message() {
    local file="$1"
    local content="$2"
    
    echo "📝 MESSAGE FROM CLAUDECODE"
    echo "=========================="
    echo "$content"
    echo "=========================="
}

# 메시지 처리 완료 표시
mark_message_processed() {
    local file="$1"
    local processed_file="${file}.processed"
    
    # 처리 완료 파일로 이동
    mv "$file" "$processed_file"
    log "메시지 처리 완료: $file → $processed_file"
    
    # Git에 커밋
    git add "$processed_file" 2>/dev/null || true
    git commit -m "Auto-processed ClaudeCode message: $(basename "$file")" 2>/dev/null || true
    git push 2>/dev/null || true
}

# 메인 모니터링 루프
main_monitor_loop() {
    log "🚀 ClaudeCode 자동 메시지 모니터링 시작"
    log "터미널: $CURSOR_TERMINAL"
    log "모니터링 패턴: $MESSAGE_PATTERN"
    
    # 로그 디렉토리 생성
    mkdir -p "$(dirname "$LOG_FILE")"
    
    while true; do
        # 새로운 메시지 감지
        new_messages=$(detect_new_messages)
        
        if [[ -n "$new_messages" ]]; then
            for message in $new_messages; do
                process_message "$message"
            done
        fi
        
        # 5초 대기 (더 빠른 감지)
        sleep 5
    done
}

# Git hook 설치 함수
install_git_hook() {
    local hook_dir="$REPO_DIR/.git/hooks"
    local hook_file="$hook_dir/post-merge"
    
    log "Git hook 설치 중..."
    
    # post-merge hook 생성
    cat > "$hook_file" << 'EOF'
#!/bin/bash
# ClaudeCode 메시지 자동 감지 Git hook

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MONITOR_SCRIPT="$REPO_DIR/scripts/auto-message-monitor.sh"

# 메시지 파일이 있는지 확인
if ls "$REPO_DIR"/.collab-msg-* 1> /dev/null 2>&1; then
    echo "🔔 ClaudeCode 메시지 감지됨!"
    echo "터미널에서 다음 명령어로 확인하세요:"
    echo "cat .collab-msg-*"
    echo ""
fi
EOF
    
    chmod +x "$hook_file"
    log "Git hook 설치 완료: $hook_file"
}

# 시작 함수
start_monitoring() {
    case "${1:-monitor}" in
        "install")
            install_git_hook
            ;;
        "monitor")
            main_monitor_loop
            ;;
        "test")
            echo "테스트 메시지 생성 중..."
            echo "테스트 메시지입니다. $(date)" > ".collab-msg-test-$(date +%s)"
            echo "테스트 메시지 생성 완료"
            ;;
        *)
            echo "사용법: $0 [install|monitor|test]"
            echo "  install  - Git hook 설치"
            echo "  monitor  - 메시지 모니터링 시작 (기본값)"
            echo "  test     - 테스트 메시지 생성"
            ;;
    esac
}

# 스크립트 실행
start_monitoring "$@"
