#!/usr/bin/env bash
set -euo pipefail

# Simple Cursor ↔ ClaudeCode Collaboration Notifier

cd "$(git rev-parse --show-toplevel)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Log functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_cursor() { echo -e "${PURPLE}[CURSOR]${NC} $1"; }
log_claudecode() { echo -e "${CYAN}[CLAUDECODE]${NC} $1"; }

# Create collaboration message
create_message() {
    local agent="$1"
    local action="$2"
    local details="$3"
    local priority="${4:-normal}"
    
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    local message_id=$(date +%s%N | cut -b1-13)
    
    cat > ".collab-msg-$message_id" << EOF
# Collaboration Message

**ID**: $message_id
**Agent**: $agent
**Action**: $action
**Priority**: $priority
**Timestamp**: $timestamp

## Details
$details

## Next Steps
- [ ] ClaudeCode review
- [ ] Cursor review
- [ ] GPT-5 Pro review
- [ ] Task completed

## Status
- Status: Pending
- Created: $timestamp
- Agent: $agent
EOF
    
    echo "$message_id"
}

# Send message
send_message() {
    local agent="$1"
    local action="$2"
    local details="$3"
    local priority="${4:-normal}"
    
    log_info "Sending message from $agent..."
    
    local message_id=$(create_message "$agent" "$action" "$details" "$priority")
    
    git add ".collab-msg-$message_id"
    git commit -m "$agent: $action

    Collaboration message sent
    
    - Message ID: $message_id
    - Agent: $agent
    - Action: $action
    - Priority: $priority
    - Details: $details"
    
    git push origin $(git branch --show-current)
    
    log_success "Message sent! ID: $message_id"
    echo "Next steps:"
    echo "  1. ClaudeCode/Cursor: git pull to check messages"
    echo "  2. Read .collab-msg-$message_id"
    echo "  3. Send response message"
}

# Check messages
check_messages() {
    log_info "Checking collaboration messages..."
    
    local messages=$(find . -name ".collab-msg-*" -type f -mtime -1 2>/dev/null | sort -r)
    
    if [[ -z "$messages" ]]; then
        log_info "No new collaboration messages."
        return 0
    fi
    
    echo ""
    echo "New collaboration messages:"
    echo "================================"
    
    for msg_file in $messages; do
        if [[ -f "$msg_file" ]]; then
            echo ""
            echo "File: $msg_file"
            echo "--------------------------------"
            cat "$msg_file"
            echo "--------------------------------"
        fi
    done
    
    echo ""
    echo "To respond:"
    echo "  $0 respond <message-id> <response-text>"
}

# Respond to message
respond_to_message() {
    local message_id="$1"
    local response_text="$2"
    local agent="${3:-$(whoami)}"
    
    local msg_file=".collab-msg-$message_id"
    
    if [[ ! -f "$msg_file" ]]; then
        log_error "Message not found: $message_id"
        return 1
    fi
    
    log_info "Responding to message: $message_id"
    
    cat >> "$msg_file" << EOF

## Response
**Agent**: $agent
**Timestamp**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Response**: $response_text

---
EOF
    
    git add "$msg_file"
    git commit -m "$agent: Respond to $message_id

    Collaboration message response
    
    - Message ID: $message_id
    - Agent: $agent
    - Response: $response_text"
    
    git push origin $(git branch --show-current)
    
    log_success "Response sent!"
}

# Notify task completion
notify_completion() {
    local task_name="$1"
    local agent="${2:-$(whoami)}"
    local details="${3:-Task completed successfully}"
    
    log_info "Sending completion notification..."
    
    send_message "$agent" "Task Completed: $task_name" "$details" "high"
}

# Notify task start
notify_start() {
    local task_name="$1"
    local agent="${2:-$(whoami)}"
    local details="${3:-Starting work on task}"
    
    log_info "Sending start notification..."
    
    send_message "$agent" "Task Started: $task_name" "$details" "normal"
}

# List all messages
list_messages() {
    log_info "Listing all collaboration messages:"
    
    local messages=$(find . -name ".collab-msg-*" -type f 2>/dev/null | sort -r)
    
    if [[ -z "$messages" ]]; then
        log_info "No collaboration messages found."
        return 0
    fi
    
    echo ""
    echo "Collaboration messages:"
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

# Clear old messages
clear_old_messages() {
    log_info "Clearing old collaboration messages..."
    
    local old_messages=$(find . -name ".collab-msg-*" -type f -mtime +7 2>/dev/null)
    
    if [[ -z "$old_messages" ]]; then
        log_info "No old messages to clear."
        return 0
    fi
    
    echo "Clearing these messages:"
    echo "$old_messages"
    echo ""
    
    read -p "Really delete? (y/N): " confirm
    
    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        for msg_file in $old_messages; do
            rm -f "$msg_file"
            log_info "Deleted: $msg_file"
        done
        
        git add -A
        git commit -m "Clear old collaboration messages

        Cleaned up old collaboration messages
        
        - Removed: $(echo "$old_messages" | wc -l | tr -d ' ') old messages
        - Cleanup: 7+ days old messages removed"
        
        git push origin $(git branch --show-current)
        
        log_success "Old messages cleared!"
    else
        log_info "Cleanup cancelled."
    fi
}

# Show usage
show_usage() {
    cat << EOF
Cursor ↔ ClaudeCode Collaboration Notifier

Usage:
  $0 [COMMAND] [OPTIONS]

Commands:
  send <agent> <action> <details> [priority]  - Send collaboration message
  check                                        - Check messages
  respond <message-id> <response> [agent]      - Respond to message
  start <task> [agent] [details]               - Notify task start
  complete <task> [agent] [details]            - Notify task completion
  list                                         - List all messages
  clear                                        - Clear old messages

Examples:
  $0 send "Cursor" "UI Update" "Instagram extractor UI completed" "high"
  $0 check
  $0 respond "1234567890" "API integration completed" "ClaudeCode"
  $0 start "VDP Integration" "Cursor" "Starting frontend-backend integration"
  $0 complete "API Development" "ClaudeCode" "All endpoints tested and working"

EOF
}

# Main logic
main() {
    case "${1:-help}" in
        send)
            if [[ $# -lt 4 ]]; then
                log_error "send command requires agent, action, details"
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
                log_error "respond command requires message-id and response"
                show_usage
                exit 1
            fi
            respond_to_message "$2" "$3" "${4:-$(whoami)}"
            ;;
        start)
            if [[ $# -lt 2 ]]; then
                log_error "start command requires task"
                show_usage
                exit 1
            fi
            notify_start "$2" "${3:-$(whoami)}" "${4:-Starting work on task}"
            ;;
        complete)
            if [[ $# -lt 2 ]]; then
                log_error "complete command requires task"
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
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
