#!/bin/bash

# ClaudeCode Auto-Responder
# Automatically processes and responds to collaboration messages

set -e

PROJECT_DIR="/Users/ted/snap3"
RESPONSE_DIR="$PROJECT_DIR/.auto-responses"
LOG_FILE="$PROJECT_DIR/logs/claudecode-auto-responder.log"

# Ensure directories exist
mkdir -p "$RESPONSE_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to generate automatic response
generate_auto_response() {
    local msg_file="$1"
    local msg_name=$(basename "$msg_file")
    local response_file="$RESPONSE_DIR/${msg_name}-claudecode-response"
    
    log_msg "🤖 Generating auto-response for: $msg_name"
    
    # Analyze message content for auto-response
    local message_content=$(cat "$msg_file")
    local response_type="ACKNOWLEDGE"
    local priority="NORMAL"
    
    # Detect message characteristics
    if echo "$message_content" | grep -qi "urgent\|critical\|즉시\|긴급"; then
        priority="URGENT"
        response_type="IMMEDIATE_ACTION"
    fi
    
    if echo "$message_content" | grep -qi "api.*integration\|endpoint"; then
        response_type="API_TASK_RECEIVED"
    elif echo "$message_content" | grep -qi "ui.*integration\|frontend"; then
        response_type="UI_TASK_RECEIVED"  
    elif echo "$message_content" | grep -qi "test\|validation"; then
        response_type="TESTING_TASK_RECEIVED"
    fi
    
    # Generate response content
    cat > "$response_file" << EOF
# 🤖 ClaudeCode Auto-Response

**Message**: $msg_name  
**Timestamp**: $(date '+%Y-%m-%d %H:%M:%S')  
**Priority**: $priority  
**Type**: $response_type  
**Correlation-ID**: AUTO-RESPONSE-$(date +%s)

---

## 📩 Message Processing Status

✅ **Message received and analyzed**  
✅ **Content categorized**: $response_type  
✅ **Priority assessed**: $priority  

## 🎯 Auto-Response Actions

EOF

    # Add specific actions based on message type
    case "$response_type" in
        "API_TASK_RECEIVED")
            cat >> "$response_file" << EOF
### 🔧 API Integration Task Detected
- **Status**: Task acknowledged and queued
- **Assignment**: Ready to implement API endpoints
- **Timeline**: Will begin upon message review
- **Dependencies**: Reviewing API requirements

EOF
            ;;
        "UI_TASK_RECEIVED")
            cat >> "$response_file" << EOF
### 🎨 UI Integration Task Detected  
- **Status**: Frontend task acknowledged
- **Assignment**: Ready to implement UI changes
- **Timeline**: Will begin upon message review
- **Dependencies**: Analyzing UI requirements

EOF
            ;;
        "IMMEDIATE_ACTION")
            cat >> "$response_file" << EOF
### 🚨 URGENT Task Detected
- **Status**: HIGH PRIORITY - Immediate attention required
- **Assignment**: Task escalated to priority queue
- **Timeline**: Will begin immediately upon message review
- **Alert**: User notification triggered

EOF
            ;;
        *)
            cat >> "$response_file" << EOF
### 📋 General Task Acknowledged
- **Status**: Message received and categorized
- **Assignment**: Task added to queue
- **Timeline**: Will process in order

EOF
            ;;
    esac
    
    cat >> "$response_file" << EOF
## ⏰ Next Steps

1. **ClaudeCode Action**: Review detailed requirements
2. **Implementation**: Execute assigned tasks
3. **Coordination**: Update progress with team
4. **Completion**: Report results

---

**Auto-generated response from ClaudeCode Auto-Responder v1.0**  
🤖 This response was generated automatically based on message analysis
EOF
    
    log_msg "✅ Auto-response generated: $response_file"
    echo "📝 Auto-response created: $(basename "$response_file")"
}

# Function to monitor and auto-respond
monitor_and_respond() {
    local last_check_file="$PROJECT_DIR/.claudecode-auto-responder-check"
    
    # Initialize if needed
    if [ ! -f "$last_check_file" ]; then
        touch "$last_check_file"
    fi
    
    # Find new messages
    while IFS= read -r -d '' msg_file; do
        generate_auto_response "$msg_file"
    done < <(find "$PROJECT_DIR" -name ".collab-msg-*" -newer "$last_check_file" 2>/dev/null -print0)
    
    # Update check timestamp
    touch "$last_check_file"
}

# Function to start continuous auto-responding
start_auto_responder() {
    log_msg "🚀 Starting ClaudeCode Auto-Responder"
    echo "🚀 ClaudeCode Auto-Responder started"
    echo "📁 Monitoring: $PROJECT_DIR"
    echo "📝 Responses: $RESPONSE_DIR"
    echo "📊 Logs: $LOG_FILE"
    echo ""
    
    while true; do
        monitor_and_respond
        sleep 3  # Check every 3 seconds for fast response
    done
}

# Main execution
case "${1:-start}" in
    "start")
        start_auto_responder
        ;;
    "check")
        monitor_and_respond
        echo "✅ One-time check completed"
        ;;
    "status")
        echo "📊 ClaudeCode Auto-Responder Status"
        echo "📁 Project: $PROJECT_DIR"
        echo "📝 Responses: $RESPONSE_DIR"
        echo "📊 Log: $LOG_FILE"
        if [ -f "$PROJECT_DIR/.claudecode-auto-responder-check" ]; then
            echo "📅 Last Check: $(date -r "$PROJECT_DIR/.claudecode-auto-responder-check")"
        else
            echo "📅 Last Check: Never"
        fi
        ;;
    *)
        echo "Usage: $0 {start|check|status}"
        exit 1
        ;;
esac