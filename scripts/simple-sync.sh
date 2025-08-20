#!/usr/bin/env bash
set -euo pipefail

# Simple Cursor ↔ ClaudeCode Git Sync System

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

# Show usage
show_usage() {
    cat << EOF
Cursor ↔ ClaudeCode Git Sync System

Usage:
  $0 [COMMAND]

Commands:
  status          - Check current sync status
  sync            - Bidirectional sync
  create-bridge   - Create bridge branch
  merge-bridge    - Merge bridge branch
  auto-sync       - Auto sync mode
  conflict-resolve - Resolve conflicts

Examples:
  $0 status
  $0 sync
  $0 create-bridge
  $0 auto-sync

EOF
}

# Check status
check_status() {
    log_info "Checking sync status..."
    
    echo ""
    echo "Git Status:"
    git status --porcelain
    
    echo ""
    echo "Current Branch: $(git branch --show-current)"
    
    echo ""
    echo "Recent Commits:"
    git log --oneline -5
    
    echo ""
    echo "Remote Status:"
    git remote -v
    
    # Changed files count
    local changed_count=$(git status --porcelain | wc -l | tr -d ' ')
    if [[ $changed_count -gt 0 ]]; then
        echo ""
        echo "Changed Files ($changed_count):"
        git status --porcelain | head -10
    fi
}

# Create bridge branch
create_bridge() {
    local bridge_name="bridge/cursor-claudecode-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Creating bridge branch: $bridge_name"
    
    git checkout -b "$bridge_name"
    
    # Create bridge info
    cat > .bridge-info << EOF
# Cursor ↔ ClaudeCode Bridge Branch
Created: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Purpose: Sync between Cursor and ClaudeCode
Status: Active

## Recent Changes
$(git log --oneline -10)

## Next Steps
1. Cursor: Frontend work
2. ClaudeCode: Backend work
3. Integration test
4. Merge to main
EOF
    
    git add .bridge-info
    git commit -m "Create bridge branch: $bridge_name"
    
    log_success "Bridge branch created: $bridge_name"
    echo "Next steps:"
    echo "  1. Cursor: Frontend work"
    echo "  2. ClaudeCode: Backend work"
    echo "  3. $0 merge-bridge"
}

# Merge bridge branch
merge_bridge() {
    local current_branch=$(git branch --show-current)
    
    if [[ ! $current_branch =~ ^bridge/ ]]; then
        log_error "Not on bridge branch: $current_branch"
        return 1
    fi
    
    log_info "Merging bridge: $current_branch → main"
    
    git checkout main
    git merge "$current_branch" --no-ff -m "Merge bridge: $current_branch"
    git branch -d "$current_branch"
    
    log_success "Bridge merged successfully!"
}

# Enhanced Bidirectional sync with ClaudeCode coordination
sync_bidirectional() {
    log_info "Starting bidirectional sync..."
    
    local current_branch=$(git branch --show-current)
    local has_changes=$(git status --porcelain | wc -l | tr -d ' ')
    
    # Check for ClaudeCode terminal guard integration
    if [[ -x "./scripts/claudecode-terminal-guard.sh" ]]; then
        log_info "Coordinating with ClaudeCode 4-terminal system..."
        ./scripts/claudecode-terminal-guard.sh coordinate "cursor-sync-start" "Bidirectional sync initiated" "medium"
    fi
    
    if [[ $has_changes -gt 0 ]]; then
        log_warning "Uncommitted changes detected. Please commit first."
        git status --porcelain
        
        # Notify ClaudeCode of uncommitted changes
        if [[ -x "./scripts/claudecode-terminal-guard.sh" ]]; then
            ./scripts/claudecode-terminal-guard.sh coordinate "cursor-uncommitted-changes" "$has_changes files modified" "high"
        fi
        return 1
    fi
    
    git fetch origin
    git pull origin "$current_branch"
    
    local behind_count=$(git rev-list HEAD..origin/$current_branch --count 2>/dev/null || echo "0")
    local ahead_count=$(git rev-list origin/$current_branch..HEAD --count 2>/dev/null || echo "0")
    
    if [[ $behind_count -gt 0 ]]; then
        log_claudecode "ClaudeCode has $behind_count new commits."
    fi
    
    if [[ $ahead_count -gt 0 ]]; then
        log_cursor "Cursor has $ahead_count new commits."
    fi
    
    git push origin "$current_branch"
    
    # Final coordination notification
    if [[ -x "./scripts/claudecode-terminal-guard.sh" ]]; then
        ./scripts/claudecode-terminal-guard.sh coordinate "cursor-sync-complete" "Behind: $behind_count, Ahead: $ahead_count" "medium"
    fi
    
    log_success "Bidirectional sync completed!"
}

# Auto sync mode
auto_sync() {
    log_info "Starting auto sync mode..."
    log_info "Press Ctrl+C to stop."
    
    while true; do
        if [[ -n $(git status --porcelain) ]]; then
            log_info "Changes detected. Auto syncing..."
            
            local change_count=$(git status --porcelain | wc -l | tr -d ' ')
            git add .
            git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S') - $change_count files"
            git push origin $(git branch --show-current)
            
            log_success "Auto sync completed!"
        fi
        
        sleep 30
    done
}

# Resolve conflicts
resolve_conflicts() {
    log_info "Checking for conflicts..."
    
    local conflict_files=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")
    
    if [[ -z "$conflict_files" ]]; then
        log_success "No conflicts found!"
        return 0
    fi
    
    echo ""
    echo "Conflict files:"
    echo "$conflict_files"
    echo ""
    echo "Please resolve conflicts manually:"
    echo "1. Edit conflict files"
    echo "2. git add <resolved-files>"
    echo "3. git commit"
}

# Main logic
main() {
    case "${1:-help}" in
        status)
            check_status
            ;;
        sync)
            sync_bidirectional
            ;;
        create-bridge)
            create_bridge
            ;;
        merge-bridge)
            merge_bridge
            ;;
        auto-sync)
            auto_sync
            ;;
        conflict-resolve)
            resolve_conflicts
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
