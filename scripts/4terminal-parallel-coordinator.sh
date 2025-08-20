#!/bin/bash

# 4-Terminal Parallel Coordinator for VDP Pipeline Development
# Purpose: Optimize ClaudeCode terminal utilization for maximum development acceleration
# Version: 1.0.0
# Created: 2025-08-20

# Color codes for terminal identification
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Terminal coordination state file
COORD_STATE_FILE=".terminal-coordination-state"

# Function to log with terminal identification
log_terminal() {
    local terminal=$1
    local message=$2
    local color=$3
    echo -e "${color}[T${terminal}] $(date '+%H:%M:%S') - ${message}${NC}"
}

# Function to detect current terminal
detect_terminal() {
    if [[ -f "$COORD_STATE_FILE" ]]; then
        local terminal_count=$(grep -c "^TERMINAL_" "$COORD_STATE_FILE" 2>/dev/null || echo 0)
        local next_terminal=$((terminal_count + 1))
        if [ $next_terminal -gt 4 ]; then
            next_terminal=1  # Reset to T1 if all terminals allocated
        fi
        echo "TERMINAL_$next_terminal=$(date '+%H:%M:%S')" >> "$COORD_STATE_FILE"
        echo $next_terminal
    else
        echo "TERMINAL_1=$(date '+%H:%M:%S')" > "$COORD_STATE_FILE"
        echo 1
    fi
}

# Function to register terminal activity
register_activity() {
    local terminal=$1
    local task=$2
    local status=$3
    echo "T${terminal}_TASK=${task}" >> "$COORD_STATE_FILE"
    echo "T${terminal}_STATUS=${status}" >> "$COORD_STATE_FILE"
    echo "T${terminal}_UPDATED=$(date '+%H:%M:%S')" >> "$COORD_STATE_FILE"
}

# Function to check for file conflicts
check_file_conflicts() {
    local terminal=$1
    local target_file=$2
    
    if [[ -f "$COORD_STATE_FILE" ]]; then
        local active_files=$(grep "_FILE=" "$COORD_STATE_FILE" | grep -v "T${terminal}_FILE=" | cut -d'=' -f2)
        for file in $active_files; do
            if [[ "$file" == "$target_file" ]]; then
                log_terminal $terminal "❌ CONFLICT: File $target_file is being used by another terminal" $RED
                return 1
            fi
        done
    fi
    
    echo "T${terminal}_FILE=${target_file}" >> "$COORD_STATE_FILE"
    log_terminal $terminal "🔒 File locked: $target_file" $GREEN
    return 0
}

# Function to release file lock
release_file_lock() {
    local terminal=$1
    local target_file=$2
    
    if [[ -f "$COORD_STATE_FILE" ]]; then
        grep -v "T${terminal}_FILE=${target_file}" "$COORD_STATE_FILE" > "${COORD_STATE_FILE}.tmp"
        mv "${COORD_STATE_FILE}.tmp" "$COORD_STATE_FILE"
        log_terminal $terminal "🔓 File released: $target_file" $YELLOW
    fi
}

# Main coordination function
case "$1" in
    "init")
        echo "🚀 Initializing 4-Terminal Parallel Coordinator"
        cat > "$COORD_STATE_FILE" << EOF
# 4-Terminal Coordination State
# Started: $(date '+%Y-%m-%d %H:%M:%S')
# Purpose: VDP Pipeline Development Acceleration
COORDINATION_ACTIVE=true
EOF
        echo "✅ Coordination system initialized"
        ;;
        
    "assign")
        TERMINAL=$(detect_terminal)
        echo "🎯 You are assigned to Terminal $TERMINAL"
        
        # Color-coded terminal assignments
        case $TERMINAL in
            1) COLOR=$RED; ROLE="API/Backend" ;;
            2) COLOR=$GREEN; ROLE="Testing/Validation" ;;
            3) COLOR=$BLUE; ROLE="Integration/Coordination" ;;
            4) COLOR=$PURPLE; ROLE="Documentation/Support" ;;
        esac
        
        log_terminal $TERMINAL "Assigned role: $ROLE" $COLOR
        
        # Provide immediate tasks based on preparation message
        case $TERMINAL in
            1)
                log_terminal $TERMINAL "🎯 IMMEDIATE TASK: Implement /api/extract-social-metadata endpoint" $RED
                log_terminal $TERMINAL "📁 TARGET FILE: simple-web-server.js" $RED
                log_terminal $TERMINAL "⏱️  ESTIMATED: 15-20 minutes" $RED
                log_terminal $TERMINAL "🔧 TOOLS: Express.js, validation, error handling" $RED
                ;;
            2)
                log_terminal $TERMINAL "🎯 IMMEDIATE TASK: Prepare comprehensive test scenarios" $GREEN
                log_terminal $TERMINAL "📁 TARGET: scripts/test-* files" $GREEN
                log_terminal $TERMINAL "⏱️  ESTIMATED: 10 minutes" $GREEN
                log_terminal $TERMINAL "🔧 TOOLS: IG/TT URL test cases, validation scripts" $GREEN
                ;;
            3)
                log_terminal $TERMINAL "🎯 IMMEDIATE TASK: Performance benchmarking setup" $BLUE
                log_terminal $TERMINAL "📁 TARGET: scripts/benchmark-* files" $BLUE
                log_terminal $TERMINAL "⏱️  ESTIMATED: 10 minutes" $BLUE
                log_terminal $TERMINAL "🔧 TOOLS: curl timing, monitoring scripts" $BLUE
                ;;
            4)
                log_terminal $TERMINAL "🎯 IMMEDIATE TASK: Error handling strategy design" $PURPLE
                log_terminal $TERMINAL "📁 TARGET: docs/error-handling.md" $PURPLE
                log_terminal $TERMINAL "⏱️  ESTIMATED: 15 minutes" $PURPLE
                log_terminal $TERMINAL "🔧 TOOLS: RFC 9457, fallback strategies" $PURPLE
                ;;
        esac
        
        register_activity $TERMINAL "ASSIGNED" "ready"
        echo $TERMINAL
        ;;
        
    "status")
        echo "📊 4-Terminal Coordination Status:"
        if [[ -f "$COORD_STATE_FILE" ]]; then
            echo "----------------------------------------"
            grep "TERMINAL_" "$COORD_STATE_FILE" | while read -r line; do
                terminal=$(echo $line | cut -d'_' -f2 | cut -d'=' -f1)
                time=$(echo $line | cut -d'=' -f2)
                case $terminal in
                    1) color=$RED; role="API/Backend" ;;
                    2) color=$GREEN; role="Testing/Validation" ;;
                    3) color=$BLUE; role="Integration/Coordination" ;;
                    4) color=$PURPLE; role="Documentation/Support" ;;
                esac
                echo -e "${color}T${terminal} (${role}): Active since ${time}${NC}"
            done
            echo "----------------------------------------"
            
            # Show active tasks
            echo "🎯 Active Tasks:"
            grep "_TASK=" "$COORD_STATE_FILE" | while read -r line; do
                terminal=$(echo $line | cut -d'_' -f1 | sed 's/T//')
                task=$(echo $line | cut -d'=' -f2)
                status_line=$(grep "T${terminal}_STATUS=" "$COORD_STATE_FILE")
                status=$(echo $status_line | cut -d'=' -f2)
                echo "   T${terminal}: $task ($status)"
            done
        else
            echo "❌ No coordination system active. Run 'init' first."
        fi
        ;;
        
    "lock")
        if [[ -z "$2" ]] || [[ -z "$3" ]]; then
            echo "Usage: $0 lock <terminal> <file_path>"
            exit 1
        fi
        check_file_conflicts "$2" "$3"
        ;;
        
    "release")
        if [[ -z "$2" ]] || [[ -z "$3" ]]; then
            echo "Usage: $0 release <terminal> <file_path>"
            exit 1
        fi
        release_file_lock "$2" "$3"
        ;;
        
    "update")
        if [[ -z "$2" ]] || [[ -z "$3" ]]; then
            echo "Usage: $0 update <terminal> <status>"
            exit 1
        fi
        register_activity "$2" "$(grep "T${2}_TASK=" "$COORD_STATE_FILE" | cut -d'=' -f2)" "$3"
        log_terminal "$2" "Status updated to: $3" $CYAN
        ;;
        
    "cleanup")
        if [[ -f "$COORD_STATE_FILE" ]]; then
            rm "$COORD_STATE_FILE"
            echo "🧹 Coordination state cleared"
        fi
        ;;
        
    "parallel-start")
        echo "🚀 Starting Parallel Development Acceleration"
        echo "============================================="
        
        # Initialize coordination
        "$0" init
        
        echo ""
        echo "🎯 OPTIMAL TERMINAL ASSIGNMENTS:"
        echo ""
        echo -e "${RED}T1 (API/Backend Terminal)${NC}"
        echo "   📋 Role: Implement /api/extract-social-metadata endpoint"
        echo "   📁 Files: simple-web-server.js"
        echo "   ⏱️  Time: 15-20 minutes"
        echo "   🎯 Goal: Enable Cursor metadata extraction integration"
        echo ""
        
        echo -e "${GREEN}T2 (Testing/Validation Terminal)${NC}"
        echo "   📋 Role: Comprehensive test scenario preparation"
        echo "   📁 Files: scripts/test-instagram-scenarios.sh, scripts/test-tiktok-scenarios.sh"
        echo "   ⏱️  Time: 10 minutes"
        echo "   🎯 Goal: Ready test cases for immediate validation"
        echo ""
        
        echo -e "${BLUE}T3 (Integration Terminal)${NC}"
        echo "   📋 Role: Performance benchmarking infrastructure"
        echo "   📁 Files: scripts/benchmark-api-performance.sh"
        echo "   ⏱️  Time: 10 minutes"
        echo "   🎯 Goal: Establish performance baselines"
        echo ""
        
        echo -e "${PURPLE}T4 (Documentation/Support Terminal)${NC}"
        echo "   📋 Role: Error handling strategy documentation"
        echo "   📁 Files: docs/error-handling-strategies.md"
        echo "   ⏱️  Time: 15 minutes"
        echo "   🎯 Goal: Comprehensive fallback and recovery systems"
        echo ""
        
        echo "============================================="
        echo "💡 Each terminal can start immediately - no conflicts!"
        echo "🔄 Run './scripts/4terminal-parallel-coordinator.sh status' to monitor progress"
        echo "🎉 Estimated total acceleration: 60-65 minutes of parallel work!"
        ;;
        
    *)
        echo "🔧 4-Terminal Parallel Coordinator"
        echo "Usage: $0 {init|assign|status|lock|release|update|cleanup|parallel-start}"
        echo ""
        echo "Commands:"
        echo "  init          - Initialize coordination system"
        echo "  assign        - Get terminal assignment and immediate task"
        echo "  status        - Show all terminal status and active tasks"
        echo "  lock <t> <f>  - Lock file for exclusive access"
        echo "  release <t> <f> - Release file lock"
        echo "  update <t> <s> - Update terminal status"
        echo "  cleanup       - Clear coordination state"
        echo "  parallel-start - Start coordinated parallel development"
        echo ""
        echo "📊 Current Status:"
        "$0" status
        ;;
esac