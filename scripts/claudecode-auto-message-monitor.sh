#!/bin/bash

# ClaudeCode Auto Message Monitor
# Automatically detects and processes collaboration messages

set -e

PROJECT_DIR="/Users/ted/snap3"
LAST_CHECK_FILE="$PROJECT_DIR/.claudecode-last-check"
LOG_FILE="$PROJECT_DIR/logs/claudecode-auto-monitor.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to process new messages
process_new_messages() {
    local message_files=()
    
    # Find collaboration message files newer than last check
    while IFS= read -r -d '' file; do
        message_files+=("$file")
    done < <(find "$PROJECT_DIR" -name ".collab-msg-*" -newer "$LAST_CHECK_FILE" 2>/dev/null -print0)
    
    if [ ${#message_files[@]} -eq 0 ]; then
        return 0
    fi
    
    log_with_timestamp "🔔 Found ${#message_files[@]} new collaboration messages"
    
    for msg_file in "${message_files[@]}"; do
        local msg_name=$(basename "$msg_file")
        log_with_timestamp "📩 Processing: $msg_name"
        
        # Determine message type and priority
        if [[ "$msg_name" == *"urgent"* || "$msg_name" == *"critical"* ]]; then
            log_with_timestamp "🚨 URGENT MESSAGE DETECTED: $msg_name"
            echo "🚨 URGENT: ClaudeCode action required - $msg_name"
            
            # Send system notification if available
            if command -v osascript >/dev/null 2>&1; then
                osascript -e "display notification \"Urgent collaboration message: $msg_name\" with title \"ClaudeCode Auto Monitor\""
            fi
            
        elif [[ "$msg_name" == *"cursor"* ]]; then
            log_with_timestamp "🤖 Cursor message: $msg_name"
            echo "📨 Cursor message received: $msg_name"
            
        elif [[ "$msg_name" == *"gpt5"* ]]; then
            log_with_timestamp "🧠 GPT-5 message: $msg_name"
            echo "🧠 GPT-5 consultation: $msg_name"
            
        else
            log_with_timestamp "📋 General message: $msg_name"
            echo "📋 New message: $msg_name"
        fi
        
        # Auto-categorize and suggest actions
        if grep -q "API.*integration\|endpoint\|implement" "$msg_file" 2>/dev/null; then
            log_with_timestamp "🔧 API integration task detected"
            echo "   → Suggested action: API development"
            
        elif grep -q "UI.*integration\|frontend\|form" "$msg_file" 2>/dev/null; then
            log_with_timestamp "🎨 UI integration task detected"
            echo "   → Suggested action: Frontend work"
            
        elif grep -q "test\|validation\|verify" "$msg_file" 2>/dev/null; then
            log_with_timestamp "🧪 Testing task detected"
            echo "   → Suggested action: Testing/validation"
            
        elif grep -q "deploy\|production\|release" "$msg_file" 2>/dev/null; then
            log_with_timestamp "🚀 Deployment task detected"
            echo "   → Suggested action: Deployment"
        fi
        
        echo "   📂 Read with: cat '$msg_file'"
        echo ""
    done
    
    # Update last check timestamp
    touch "$LAST_CHECK_FILE"
}

# Function to start continuous monitoring
start_monitoring() {
    log_with_timestamp "🚀 Starting ClaudeCode Auto Message Monitor"
    echo "🚀 ClaudeCode Auto Message Monitor started"
    echo "📁 Monitoring: $PROJECT_DIR"
    echo "📝 Logs: $LOG_FILE"
    echo ""
    
    # Initialize last check file if it doesn't exist
    if [ ! -f "$LAST_CHECK_FILE" ]; then
        touch "$LAST_CHECK_FILE"
        log_with_timestamp "📅 Initialized last check timestamp"
    fi
    
    # Monitor loop
    while true; do
        process_new_messages
        sleep 5  # Check every 5 seconds
    done
}

# Function for one-time check
check_once() {
    log_with_timestamp "🔍 Running one-time message check"
    process_new_messages
}

# Function to show status
show_status() {
    echo "🔍 ClaudeCode Auto Message Monitor Status"
    echo "📁 Project Dir: $PROJECT_DIR"
    echo "📝 Log File: $LOG_FILE"
    echo "📅 Last Check: $([ -f "$LAST_CHECK_FILE" ] && date -r "$LAST_CHECK_FILE" || echo "Never")"
    echo ""
    
    # Show recent messages
    echo "📨 Recent collaboration messages:"
    find "$PROJECT_DIR" -name ".collab-msg-*" -type f 2>/dev/null | \
        head -5 | \
        while read -r file; do
            echo "   $(basename "$file") - $(date -r "$file" '+%m/%d %H:%M')"
        done
}

# Main execution
case "${1:-monitor}" in
    "monitor")
        start_monitoring
        ;;
    "check")
        check_once
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 {monitor|check|status}"
        echo "  monitor: Start continuous monitoring"
        echo "  check:   One-time check for new messages"
        echo "  status:  Show current status"
        exit 1
        ;;
esac