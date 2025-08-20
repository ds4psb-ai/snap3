#!/usr/bin/env bash
set -euo pipefail

# ClaudeCode 4-Terminal Coordination Guard System
# 4터미널 간 충돌 방지 및 협업 최적화

cd "$(git rev-parse --show-toplevel)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Terminal state files
TERMINAL_STATE_DIR=".git/terminal-states"
mkdir -p "$TERMINAL_STATE_DIR"

MAIN_T1_STATE="$TERMINAL_STATE_DIR/main-t1.state"
JOBS_T2_STATE="$TERMINAL_STATE_DIR/jobs-t2.state"
T2VDP_T3_STATE="$TERMINAL_STATE_DIR/t2vdp-t3.state"
STORAGE_T4_STATE="$TERMINAL_STATE_DIR/storage-t4.state"

# Lock files for coordination
LOCK_DIR=".git/terminal-locks"
mkdir -p "$LOCK_DIR"

# Terminal type detection
detect_terminal() {
  local current_dir="$PWD"
  case "$current_dir" in
    */snap3-jobs*)
      echo "jobs-t2"
      ;;
    */snap3/services/t2-extract*)
      echo "t2vdp-t3"
      ;;
    */snap3-storage*)
      echo "storage-t4"
      ;;
    */snap3*)
      echo "main-t1"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

# Update terminal state
update_terminal_state() {
  local terminal="$1"
  local action="$2"
  local details="${3:-}"
  
  local state_file
  case "$terminal" in
    main-t1) state_file="$MAIN_T1_STATE" ;;
    jobs-t2) state_file="$JOBS_T2_STATE" ;;
    t2vdp-t3) state_file="$T2VDP_T3_STATE" ;;
    storage-t4) state_file="$STORAGE_T4_STATE" ;;
    *) echo "Unknown terminal: $terminal"; return 1 ;;
  esac
  
  local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
  echo "$timestamp|$action|$details" > "$state_file"
  
  echo -e "${GREEN}[GUARD]${NC} Updated $terminal state: $action"
}

# Check for conflicts
check_conflicts() {
  local requesting_terminal="$1"
  local action="$2"
  
  # Critical actions that need coordination
  case "$action" in
    git-commit|git-push|git-merge|npm-install|schema-update)
      echo -e "${YELLOW}[GUARD]${NC} Checking for conflicts with critical action: $action"
      
      # Check if any other terminal is doing conflicting work
      for state_file in "$TERMINAL_STATE_DIR"/*.state; do
        if [[ -f "$state_file" && "$state_file" != *"$requesting_terminal"* ]]; then
          local last_line=$(tail -1 "$state_file" 2>/dev/null || echo "")
          if [[ -n "$last_line" ]]; then
            local last_action=$(echo "$last_line" | cut -d'|' -f2)
            local last_time=$(echo "$last_line" | cut -d'|' -f1)
            
            # Check if conflicting action within last 5 minutes
            local time_diff=$(( $(date +%s) - $(date -d "$last_time" +%s 2>/dev/null || echo 0) ))
            if [[ $time_diff -lt 300 && "$last_action" =~ ^(git-commit|git-push|git-merge|npm-install|schema-update)$ ]]; then
              echo -e "${RED}[CONFLICT]${NC} Terminal $(basename "$state_file" .state) is doing: $last_action"
              echo -e "${YELLOW}[GUARD]${NC} Wait 30 seconds or coordinate manually"
              return 1
            fi
          fi
        fi
      done
      ;;
  esac
  
  return 0
}

# Acquire lock for critical operations
acquire_lock() {
  local operation="$1"
  local terminal="$2"
  local lock_file="$LOCK_DIR/$operation.lock"
  local timeout=30
  
  echo -e "${BLUE}[GUARD]${NC} Acquiring lock for $operation ($terminal)"
  
  local count=0
  while [[ -f "$lock_file" && $count -lt $timeout ]]; do
    local lock_owner=$(cat "$lock_file")
    echo -e "${YELLOW}[GUARD]${NC} Waiting for $operation lock (held by $lock_owner)... $count/$timeout"
    sleep 1
    ((count++))
  done
  
  if [[ $count -ge $timeout ]]; then
    echo -e "${RED}[GUARD]${NC} Timeout waiting for $operation lock"
    return 1
  fi
  
  echo "$terminal|$(date -u '+%Y-%m-%d %H:%M:%S UTC')" > "$lock_file"
  echo -e "${GREEN}[GUARD]${NC} Lock acquired for $operation"
  return 0
}

# Release lock
release_lock() {
  local operation="$1"
  local lock_file="$LOCK_DIR/$operation.lock"
  
  if [[ -f "$lock_file" ]]; then
    rm -f "$lock_file"
    echo -e "${GREEN}[GUARD]${NC} Lock released for $operation"
  fi
}

# Show terminal status
show_status() {
  echo -e "${CYAN}[GUARD STATUS]${NC} 4-Terminal Coordination Status"
  echo "================================================"
  
  for terminal in main-t1 jobs-t2 t2vdp-t3 storage-t4; do
    local state_file="$TERMINAL_STATE_DIR/$terminal.state"
    if [[ -f "$state_file" ]]; then
      local last_line=$(tail -1 "$state_file")
      local timestamp=$(echo "$last_line" | cut -d'|' -f1)
      local action=$(echo "$last_line" | cut -d'|' -f2)
      local details=$(echo "$last_line" | cut -d'|' -f3)
      
      echo -e "${BLUE}$terminal${NC}: $action ($timestamp)"
      [[ -n "$details" ]] && echo "  Details: $details"
    else
      echo -e "${YELLOW}$terminal${NC}: No activity recorded"
    fi
  done
  
  echo ""
  echo -e "${CYAN}[ACTIVE LOCKS]${NC}"
  if ls "$LOCK_DIR"/*.lock >/dev/null 2>&1; then
    for lock_file in "$LOCK_DIR"/*.lock; do
      local operation=$(basename "$lock_file" .lock)
      local lock_info=$(cat "$lock_file")
      echo -e "${RED}🔒${NC} $operation: $lock_info"
    done
  else
    echo -e "${GREEN}✅${NC} No active locks"
  fi
}

# Enhanced Cursor Coordination
coordinate_with_cursor() {
  local action="$1"
  local details="${2:-}"
  local priority="${3:-medium}"
  local current_terminal=$(detect_terminal)
  
  # Send notification to Cursor via Git coordination system
  if [[ -x "./scripts/simple-notifier.sh" ]]; then
    ./scripts/simple-notifier.sh send "ClaudeCode" "Terminal Coordination" \
      "Terminal: $current_terminal | Action: $action | Details: $details" "$priority"
  fi
  
  # Update shared coordination state
  local coord_file=".git/cursor-coordination.state"
  echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC')|$current_terminal|$action|$details" >> "$coord_file"
  
  # Trigger sync if available
  if [[ -x "./scripts/simple-sync.sh" ]]; then
    ./scripts/simple-sync.sh sync >/dev/null 2>&1 &
  fi
}

# Clean up old states (older than 1 hour)
cleanup_old_states() {
  local cutoff_time=$(date -d "1 hour ago" +%s 2>/dev/null || date -v-1H +%s)
  
  for state_file in "$TERMINAL_STATE_DIR"/*.state; do
    if [[ -f "$state_file" ]]; then
      local timestamp=$(head -1 "$state_file" | cut -d'|' -f1)
      local file_time=$(date -d "$timestamp" +%s 2>/dev/null || echo 0)
      
      if [[ $file_time -lt $cutoff_time ]]; then
        rm -f "$state_file"
        echo -e "${GREEN}[CLEANUP]${NC} Removed old state: $(basename "$state_file")"
      fi
    fi
  done
}

# Enhanced Safe Git Operations with Cursor Integration
safe_git() {
  local git_action="$1"
  shift
  local current_terminal=$(detect_terminal)
  
  # Pre-coordination: Notify Cursor of pending git operation
  coordinate_with_cursor "git-$git_action-pending" "Args: $*" "high"
  
  if ! check_conflicts "$current_terminal" "git-$git_action"; then
    echo -e "${RED}[GUARD]${NC} Git operation blocked due to conflicts"
    coordinate_with_cursor "git-$git_action-blocked" "Conflicts detected" "urgent"
    return 1
  fi
  
  if acquire_lock "git" "$current_terminal"; then
    echo -e "${BLUE}[GUARD]${NC} Executing safe git $git_action"
    update_terminal_state "$current_terminal" "git-$git_action" "$*"
    
    # Pre-execution snapshot for Cursor
    local pre_commit=$(git rev-parse HEAD 2>/dev/null || echo "none")
    local changed_files=$(git status --porcelain | wc -l | tr -d ' ')
    
    # Execute git command
    git "$git_action" "$@"
    local git_result=$?
    
    # Post-execution coordination
    if [[ $git_result -eq 0 ]]; then
      local post_commit=$(git rev-parse HEAD 2>/dev/null || echo "none")
      if [[ "$git_action" == "commit" || "$git_action" == "merge" ]]; then
        coordinate_with_cursor "git-$git_action-success" "New commit: $post_commit | Changed: $changed_files files" "high"
      else
        coordinate_with_cursor "git-$git_action-success" "$*" "medium"
      fi
    else
      coordinate_with_cursor "git-$git_action-failed" "Exit code: $git_result" "urgent"
    fi
    
    release_lock "git"
    update_terminal_state "$current_terminal" "git-$git_action-complete" "Exit code: $git_result"
    
    return $git_result
  else
    echo -e "${RED}[GUARD]${NC} Failed to acquire git lock"
    coordinate_with_cursor "git-lock-failed" "Could not acquire git lock" "urgent"
    return 1
  fi
}

# Enhanced npm operations safety
safe_npm() {
  local npm_action="$1"
  shift
  local current_terminal=$(detect_terminal)
  
  if ! check_conflicts "$current_terminal" "npm-$npm_action"; then
    echo -e "${RED}[GUARD]${NC} NPM operation blocked due to conflicts"
    return 1
  fi
  
  if acquire_lock "npm" "$current_terminal"; then
    echo -e "${BLUE}[GUARD]${NC} Executing safe npm $npm_action"
    update_terminal_state "$current_terminal" "npm-$npm_action" "$*"
    coordinate_with_cursor "npm-$npm_action-started" "Terminal: $current_terminal" "medium"
    
    # Execute npm command
    npm "$npm_action" "$@"
    local npm_result=$?
    
    if [[ $npm_result -eq 0 ]]; then
      coordinate_with_cursor "npm-$npm_action-success" "Terminal: $current_terminal" "medium"
    else
      coordinate_with_cursor "npm-$npm_action-failed" "Exit code: $npm_result" "high"
    fi
    
    release_lock "npm"
    update_terminal_state "$current_terminal" "npm-$npm_action-complete" "Exit code: $npm_result"
    
    return $npm_result
  else
    echo -e "${RED}[GUARD]${NC} Failed to acquire npm lock"
    return 1
  fi
}

# Show Cursor coordination status
show_cursor_status() {
  echo -e "${PURPLE}[CURSOR COORDINATION]${NC} Cursor ↔ ClaudeCode Status"
  echo "================================================"
  
  local coord_file=".git/cursor-coordination.state"
  if [[ -f "$coord_file" ]]; then
    echo "Recent Cursor coordination:"
    tail -5 "$coord_file" | while IFS='|' read -r timestamp terminal action details; do
      echo -e "  ${CYAN}$timestamp${NC} [$terminal] $action: $details"
    done
  else
    echo "No Cursor coordination history"
  fi
  
  echo ""
  # Check if Cursor scripts are available
  if [[ -x "./scripts/simple-sync.sh" && -x "./scripts/simple-notifier.sh" ]]; then
    echo -e "${GREEN}✅${NC} Cursor collaboration scripts available"
    
    # Check recent messages
    local msg_count=$(ls .collab-msg-* 2>/dev/null | wc -l | tr -d ' ')
    if [[ $msg_count -gt 0 ]]; then
      echo -e "${BLUE}📧${NC} $msg_count collaboration messages pending"
    fi
  else
    echo -e "${YELLOW}⚠️${NC} Cursor collaboration scripts not found"
  fi
}

# Main command handler
case "${1:-}" in
  status)
    show_status
    ;;
  cursor-status)
    show_cursor_status
    ;;
  register)
    current_terminal=$(detect_terminal)
    action="${2:-unknown}"
    details="${3:-}"
    update_terminal_state "$current_terminal" "$action" "$details"
    coordinate_with_cursor "register" "$action: $details" "low"
    ;;
  lock)
    operation="${2:-}"
    current_terminal=$(detect_terminal)
    acquire_lock "$operation" "$current_terminal"
    ;;
  unlock)
    operation="${2:-}"
    release_lock "$operation"
    ;;
  cleanup)
    cleanup_old_states
    ;;
  git)
    shift
    safe_git "$@"
    ;;
  npm)
    shift
    safe_npm "$@"
    ;;
  check)
    current_terminal=$(detect_terminal)
    action="${2:-}"
    check_conflicts "$current_terminal" "$action"
    ;;
  coordinate)
    action="${2:-}"
    details="${3:-}"
    priority="${4:-medium}"
    coordinate_with_cursor "$action" "$details" "$priority"
    ;;
  *)
    cat << EOF
ClaudeCode 4-Terminal Coordination Guard System

Usage:
  $0 status                           - Show all terminal status
  $0 cursor-status                    - Show Cursor coordination status
  $0 register ACTION [DETAILS]        - Register terminal action
  $0 lock OPERATION                   - Acquire operation lock
  $0 unlock OPERATION                 - Release operation lock
  $0 cleanup                          - Clean old states
  $0 git ACTION [ARGS...]             - Safe git operation with Cursor sync
  $0 npm ACTION [ARGS...]             - Safe npm operation with coordination
  $0 check ACTION                     - Check for conflicts
  $0 coordinate ACTION [DETAILS] [PRIORITY] - Coordinate with Cursor

Examples:
  $0 status
  $0 cursor-status
  $0 register "npm-install" "Installing new dependencies"
  $0 git commit -m "feat: add new feature"
  $0 npm install
  $0 check git-push
  $0 coordinate "schema-update" "Updated VDP schema" "high"

EOF
    ;;
esac