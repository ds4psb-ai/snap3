#!/bin/bash

# 🔄 Recursive Improvement Engine v1.0
# Auto-detects work completion and triggers next phase
# Prevents idle terminals and maximizes collaboration efficiency

set -euo pipefail

# Configuration
WATCH_INTERVAL=3
MAX_IDLE_TIME=30
PROJECT_DIR="/Users/ted/snap3"
LOG_FILE="$PROJECT_DIR/logs/recursive-engine.log"

# Terminal port mapping
declare -A TERMINAL_PORTS=(
    ["T1"]="3000"  # Cursor UI
    ["T2"]="8080"  # ClaudeCode API  
    ["T3"]="8082"  # VDP Extractor
    ["T4"]="8083"  # Storage
)

# State tracking
LAST_ACTIVITY_FILE="$PROJECT_DIR/.last-activity"
WORK_QUEUE_FILE="$PROJECT_DIR/.work-queue"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check terminal utilization
check_terminal_utilization() {
    local active_terminals=0
    local total_terminals=${#TERMINAL_PORTS[@]}
    
    for terminal in "${!TERMINAL_PORTS[@]}"; do
        local port="${TERMINAL_PORTS[$terminal]}"
        if lsof -i ":$port" >/dev/null 2>&1; then
            active_terminals=$((active_terminals + 1))
        fi
    done
    
    local utilization=$((active_terminals * 100 / total_terminals))
    echo "$utilization"
}

# Detect work completion signals
detect_work_completion() {
    # Check for recent commits
    if git log --since="1 minute ago" --oneline | grep -q ""; then
        log "🔍 Recent commit detected - triggering next phase analysis"
        return 0
    fi
    
    # Check for completion messages
    if find "$PROJECT_DIR" -name ".collab-msg-*" -mtime -1m 2>/dev/null | head -1; then
        log "📩 Recent collaboration message detected"
        return 0
    fi
    
    # Check for test completions
    if find "$PROJECT_DIR" -name "*.test.*" -mtime -1m 2>/dev/null | head -1; then
        log "🧪 Recent test activity detected"
        return 0
    fi
    
    return 1
}

# Generate next work suggestions
generate_next_work() {
    local current_phase="$1"
    
    case "$current_phase" in
        "testing")
            echo "optimization,validation,documentation"
            ;;
        "implementation")
            echo "testing,integration,performance"
            ;;
        "integration")
            echo "testing,optimization,monitoring"
            ;;
        "optimization")
            echo "validation,documentation,deployment"
            ;;
        *)
            echo "analysis,planning,implementation"
            ;;
    esac
}

# Terminal assignment optimization
optimize_terminal_assignment() {
    local work_type="$1"
    
    case "$work_type" in
        "ui"|"frontend")
            echo "T1"  # Cursor UI
            ;;
        "api"|"backend")
            echo "T2"  # ClaudeCode API
            ;;
        "vdp"|"extraction")
            echo "T3"  # VDP Extractor
            ;;
        "storage"|"gcs")
            echo "T4"  # Storage
            ;;
        *)
            echo "T2"  # Default to ClaudeCode
            ;;
    esac
}

# Main recursive improvement loop
main() {
    log "🚀 Recursive Improvement Engine started"
    log "📊 Monitoring 4-terminal collaboration efficiency"
    
    while true; do
        # Check terminal utilization
        local utilization=$(check_terminal_utilization)
        log "📈 Terminal utilization: ${utilization}%"
        
        # Low utilization trigger
        if [ "$utilization" -lt 50 ]; then
            log "⚠️ Low terminal utilization detected (${utilization}%)"
            
            # Check for idle work opportunities
            if detect_work_completion; then
                log "🔄 Work completion detected - analyzing next phase"
                
                # Generate work suggestions
                local next_work=$(generate_next_work "current")
                log "💡 Suggested next work: $next_work"
                
                # Create work trigger message
                cat > "$PROJECT_DIR/.collab-msg-auto-work-trigger" << EOF
# 🤖 AUTO: 재귀개선 트리거

**Priority**: AUTO_WORK_TRIGGER  
**Type**: RECURSIVE_IMPROVEMENT  
**Correlation-ID**: AUTO-$(date +%s)  
**Status**: WORK_AVAILABLE  
**Timestamp**: $(date '+%Y-%m-%d %H:%M:%S')

## 🚀 **자동 감지된 다음 작업**

**Terminal Utilization**: ${utilization}% (낮음)
**Suggested Work**: $next_work
**Optimal Assignment**: $(optimize_terminal_assignment "$next_work")

### **즉시 실행 가능:**
1. 작업 분산으로 효율성 향상
2. 터미널 활용도 최적화
3. 재귀적 품질 개선

**확인 명령어:**
\`\`\`bash
cat .collab-msg-auto-work-trigger
\`\`\`
EOF
                log "📬 Auto work trigger message created"
            fi
        fi
        
        # Update activity timestamp
        echo "$(date +%s)" > "$LAST_ACTIVITY_FILE"
        
        sleep "$WATCH_INTERVAL"
    done
}

# Handle interrupts gracefully
trap 'log "🛑 Recursive Improvement Engine stopped"; exit 0' INT TERM

# Start the engine
main "$@"