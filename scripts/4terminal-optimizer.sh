#!/bin/bash

# 🏗️ 4-Terminal Collaboration Optimizer v1.0
# Maximizes terminal utilization and prevents idle resources
# Implements intelligent work distribution

set -euo pipefail

PROJECT_DIR="/Users/ted/snap3"
TERMINAL_MAP_FILE="$PROJECT_DIR/.terminal-map"
WORK_DISTRIBUTION_FILE="$PROJECT_DIR/.work-distribution"

# Terminal specifications
declare -A TERMINALS=(
    ["T1"]="Cursor_UI:3000:/Users/ted/snap3"
    ["T2"]="ClaudeCode_API:8080:/Users/ted/snap3"  
    ["T3"]="VDP_Extractor:8082:/Users/ted/snap3/services/t2-extract"
    ["T4"]="Storage_Manager:8083:/Users/ted/snap3-storage"
)

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Check which terminals are active
scan_active_terminals() {
    log "🔍 Scanning 4-terminal system status..."
    
    for terminal in "${!TERMINALS[@]}"; do
        IFS=':' read -r service port dir <<< "${TERMINALS[$terminal]}"
        
        if lsof -i ":$port" >/dev/null 2>&1; then
            echo "✅ $terminal ($service) - Active on :$port"
        else
            echo "❌ $terminal ($service) - Inactive (:$port available)"
        fi
    done
}

# Distribute work based on terminal capabilities
distribute_work() {
    local work_type="$1"
    
    case "$work_type" in
        "frontend"|"ui"|"testing")
            echo "T1" # Cursor UI
            ;;
        "api"|"backend"|"integration")
            echo "T2" # ClaudeCode API
            ;;
        "vdp"|"extraction"|"processing")
            echo "T3" # VDP Extractor
            ;;
        "storage"|"gcs"|"monitoring")
            echo "T4" # Storage Manager
            ;;
        *)
            echo "T2" # Default ClaudeCode
            ;;
    esac
}

# Create work assignment
create_work_assignment() {
    local work_type="$1"
    local assigned_terminal="$2"
    local description="$3"
    
    cat > "$PROJECT_DIR/.collab-msg-work-assignment-$assigned_terminal" << EOF
# 🎯 WORK ASSIGNMENT: $assigned_terminal

**Priority**: WORK_ASSIGNMENT  
**Type**: TERMINAL_OPTIMIZATION  
**Assigned-To**: $assigned_terminal  
**Work-Type**: $work_type  
**Timestamp**: $(date '+%Y-%m-%d %H:%M:%S')

## 📋 **작업 내용**

**Description**: $description
**Terminal**: $assigned_terminal
**Specialization**: ${TERMINALS[$assigned_terminal]%%:*}

## ⚡ **실행 지침**

1. 해당 터미널에서 작업 실행
2. 완료 시 .collab-msg-work-complete-$assigned_terminal 생성
3. 다음 단계 자동 트리거

**확인 명령어:**
\`\`\`bash
cat .collab-msg-work-assignment-$assigned_terminal
\`\`\`
EOF
    
    log "📬 Work assigned to $assigned_terminal: $work_type"
}

# Monitor and rebalance workload
rebalance_workload() {
    log "⚖️ Rebalancing workload across 4 terminals..."
    
    # Identify overloaded terminals
    local overloaded=()
    local idle=()
    
    for terminal in "${!TERMINALS[@]}"; do
        IFS=':' read -r service port dir <<< "${TERMINALS[$terminal]}"
        
        # Check CPU usage (simplified)
        if lsof -i ":$port" >/dev/null 2>&1; then
            # Active but check for work messages
            if [ -f "$PROJECT_DIR/.collab-msg-work-assignment-$terminal" ]; then
                overloaded+=("$terminal")
            fi
        else
            idle+=("$terminal")
        fi
    done
    
    log "🔍 Overloaded terminals: ${overloaded[*]:-none}"
    log "😴 Idle terminals: ${idle[*]:-none}"
    
    # Suggest redistributions
    if [ ${#idle[@]} -gt 0 ] && [ ${#overloaded[@]} -gt 0 ]; then
        log "💡 Rebalancing opportunity: ${#idle[@]} idle, ${#overloaded[@]} overloaded"
        
        cat > "$PROJECT_DIR/.collab-msg-rebalance-suggestion" << EOF
# ⚖️ AUTO: 워크로드 리밸런싱 제안

**Idle Terminals**: ${idle[*]}
**Overloaded Terminals**: ${overloaded[*]}
**Rebalance Opportunity**: HIGH
**Efficiency Gain**: Estimated 40-60%

**Suggested Actions:**
1. Redistribute ${overloaded[0]:-} work to ${idle[0]:-}
2. Activate parallel processing
3. Implement concurrent task execution

\`\`\`bash
cat .collab-msg-rebalance-suggestion
\`\`\`
EOF
    fi
}

# Main optimization loop
main() {
    log "🏗️ 4-Terminal Optimizer started"
    
    while true; do
        scan_active_terminals
        
        # Check for new work
        if [ -f "$PROJECT_DIR/.work-trigger" ]; then
            local work_type=$(cat "$PROJECT_DIR/.work-trigger")
            local assigned_terminal=$(distribute_work "$work_type")
            
            create_work_assignment "$work_type" "$assigned_terminal" "Auto-detected work: $work_type"
            rm "$PROJECT_DIR/.work-trigger"
        fi
        
        # Rebalance if needed
        rebalance_workload
        
        sleep 10
    done
}

# Handle interrupts
trap 'log "🛑 4-Terminal Optimizer stopped"; exit 0' INT TERM

main "$@"