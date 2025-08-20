#!/bin/bash

# 🤖 Automatic Work Detection System v1.0
# Detects completion signals and triggers next phase automatically
# Eliminates manual coordination overhead

set -euo pipefail

PROJECT_DIR="/Users/ted/snap3"
DETECTION_LOG="$PROJECT_DIR/logs/work-detection.log"
WORK_TRIGGER_FILE="$PROJECT_DIR/.work-trigger"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$DETECTION_LOG"
}

# Detect completion signals
detect_completion_signals() {
    local signals_detected=()
    
    # 1. Git commit activity
    if git log --since="30 seconds ago" --oneline | grep -q ""; then
        signals_detected+=("git_commit")
    fi
    
    # 2. Message file creation
    if find "$PROJECT_DIR" -name ".collab-msg-*" -mtime -30s 2>/dev/null | head -1 >/dev/null; then
        signals_detected+=("collaboration_message")
    fi
    
    # 3. Server restart signals
    if pgrep -f "simple-web-server" >/dev/null; then
        local server_age=$(ps -o etime= -p $(pgrep -f "simple-web-server" | head -1) | tr -d ' ')
        if [[ "$server_age" =~ ^0?0:[0-5][0-9]$ ]]; then
            signals_detected+=("server_restart")
        fi
    fi
    
    # 4. File modification activity
    if find "$PROJECT_DIR" -name "*.js" -o -name "*.html" -o -name "*.css" -mtime -30s 2>/dev/null | head -1 >/dev/null; then
        signals_detected+=("file_modification")
    fi
    
    echo "${signals_detected[@]}"
}

# Analyze next work phase
analyze_next_phase() {
    local completion_signals=("$@")
    
    # Phase detection logic
    if [[ " ${completion_signals[*]} " =~ " git_commit " ]]; then
        echo "testing"
    elif [[ " ${completion_signals[*]} " =~ " collaboration_message " ]]; then
        echo "integration"
    elif [[ " ${completion_signals[*]} " =~ " server_restart " ]]; then
        echo "validation"
    elif [[ " ${completion_signals[*]} " =~ " file_modification " ]]; then
        echo "optimization"
    else
        echo "monitoring"
    fi
}

# Trigger automatic work
trigger_next_work() {
    local work_phase="$1"
    local confidence="$2"
    
    if [ "$confidence" -gt 75 ]; then
        echo "$work_phase" > "$WORK_TRIGGER_FILE"
        log "🚀 Triggered next work phase: $work_phase (confidence: ${confidence}%)"
        
        # Create trigger message
        cat > "$PROJECT_DIR/.collab-msg-auto-work-trigger" << EOF
# 🤖 AUTO: 자동 작업 트리거

**Work Phase**: $work_phase
**Confidence**: ${confidence}%
**Triggered At**: $(date '+%Y-%m-%d %H:%M:%S')

## 🎯 **자동 감지된 작업**

**Recommended Actions:**
1. $work_phase 단계 즉시 시작
2. 최적 터미널 배정
3. 병렬 처리 활성화

\`\`\`bash
cat .collab-msg-auto-work-trigger
\`\`\`
EOF
        return 0
    else
        log "⏸️ Low confidence (${confidence}%) - waiting for clearer signals"
        return 1
    fi
}

# Calculate confidence score
calculate_confidence() {
    local signals=("$@")
    local signal_count=${#signals[@]}
    local base_confidence=60
    
    # Confidence boost per signal type
    local confidence=$base_confidence
    
    for signal in "${signals[@]}"; do
        case "$signal" in
            "git_commit") confidence=$((confidence + 25)) ;;
            "collaboration_message") confidence=$((confidence + 20)) ;;
            "server_restart") confidence=$((confidence + 15)) ;;
            "file_modification") confidence=$((confidence + 10)) ;;
        esac
    done
    
    # Cap at 95%
    if [ "$confidence" -gt 95 ]; then
        confidence=95
    fi
    
    echo "$confidence"
}

# Main detection loop
main() {
    log "🤖 Automatic Work Detection System started"
    log "🔍 Monitoring completion signals every 5 seconds"
    
    while true; do
        # Detect completion signals
        local signals=($(detect_completion_signals))
        
        if [ ${#signals[@]} -gt 0 ]; then
            log "📡 Signals detected: ${signals[*]}"
            
            # Analyze and trigger
            local next_phase=$(analyze_next_phase "${signals[@]}")
            local confidence=$(calculate_confidence "${signals[@]}")
            
            log "🧠 Analysis: next_phase=$next_phase, confidence=${confidence}%"
            
            if trigger_next_work "$next_phase" "$confidence"; then
                # Cool-down period
                sleep 60
            fi
        fi
        
        sleep 5
    done
}

# Handle interrupts
trap 'log "🛑 Auto Work Detector stopped"; exit 0' INT TERM

main "$@"