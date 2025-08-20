#!/usr/bin/env bash
#
# Bash Logger Integration for VDP Pipeline
#
# Purpose: Structured logging bridge for bash scripts → Pino
# Usage: source scripts/bash-logger.sh
#

# Generate correlation ID for this session
export CORRELATION_ID="${CORRELATION_ID:-$(openssl rand -hex 8)}"

# Detect script name
export SCRIPT_NAME="${SCRIPT_NAME:-$(basename "${BASH_SOURCE[1]}")}"

# Check if Node.js logging is available
PINO_AVAILABLE=false
if command -v node >/dev/null && [[ -f "libs/logging.ts" ]] && npm list pino >/dev/null 2>&1; then
  PINO_AVAILABLE=true
fi

# Enhanced logging functions with Pino integration
pino_log() {
  local level="$1"
  local message="$2"
  local context="${3:-{}}"
  
  if [[ "$PINO_AVAILABLE" == "true" ]]; then
    # Use Pino structured logging
    node scripts/logging-helper.js "$level" "$message" "$context" 2>/dev/null || {
      # Fallback to console if Pino fails
      echo "[$level] $message" >&2
    }
  else
    # Fallback to basic console logging
    echo "[$level] $message" >&2
  fi
}

# Enhanced log functions with context support
log_info() { 
  local message="$1"
  local context="${2:-{}}"
  echo -e "${BLUE}[INFO]${NC} $message"
  pino_log "info" "$message" "$context"
}

log_success() { 
  local message="$1" 
  local context="${2:-{}}"
  echo -e "${GREEN}[OK]${NC} $message"
  pino_log "info" "$message" "$context"
}

log_warning() { 
  local message="$1"
  local context="${2:-{}}"
  echo -e "${YELLOW}[WARN]${NC} $message"
  pino_log "warn" "$message" "$context"
}

log_error() { 
  local message="$1"
  local context="${2:-{}}"
  echo -e "${RED}[ERROR]${NC} $message"
  pino_log "error" "$message" "$context"
}

log_debug() {
  local message="$1"
  local context="${2:-{}}"
  [[ "${LOG_LEVEL:-info}" == "debug" ]] && echo -e "${BLUE}[DEBUG]${NC} $message"
  pino_log "debug" "$message" "$context"
}

# Operation tracking functions
start_operation() {
  local operation="$1"
  export OPERATION="$operation"
  export OPERATION_START_TIME=$(date +%s)
  
  local context="{\"operation\":\"$operation\",\"start_time\":\"$(date -Iseconds)\",\"pid\":$$}"
  log_info "Starting operation: $operation" "$context"
}

end_operation() {
  local operation="${OPERATION:-unknown}"
  local status="${1:-success}"
  local end_time=$(date +%s)
  local duration=$((end_time - ${OPERATION_START_TIME:-$end_time}))
  
  local context="{\"operation\":\"$operation\",\"status\":\"$status\",\"duration_sec\":$duration,\"end_time\":\"$(date -Iseconds)\"}"
  
  if [[ "$status" == "success" ]]; then
    log_success "Operation completed: $operation (${duration}s)" "$context"
  else
    log_error "Operation failed: $operation (${duration}s)" "$context"
  fi
}

# Performance tracking
track_performance() {
  local metric="$1"
  local value="$2"
  local unit="${3:-count}"
  
  local context="{\"metric\":\"$metric\",\"value\":$value,\"unit\":\"$unit\",\"timestamp\":\"$(date -Iseconds)\"}"
  log_info "Performance metric: $metric = $value $unit" "$context"
}

# Initialize logging session
init_logging() {
  local script_name="${1:-$(basename "$0")}"
  export SCRIPT_NAME="$script_name"
  
  # Set colors for console output
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
  
  local context="{\"script\":\"$script_name\",\"correlation_id\":\"$CORRELATION_ID\",\"pino_available\":$PINO_AVAILABLE}"
  log_info "Logging session initialized" "$context"
}

# Health check specific functions
declare -A HEALTH_RESULTS
HEALTH_STATUS="HEALTHY"

set_health_result() {
  local component="$1"
  local status="$2"
  local details="${3:-}"
  
  HEALTH_RESULTS["$component"]="$status"
  
  # Update overall status
  case "$status" in
    "CRITICAL"|"ERROR")
      HEALTH_STATUS="CRITICAL"
      ;;
    "WARNING"|"WARN")
      [[ "$HEALTH_STATUS" != "CRITICAL" ]] && HEALTH_STATUS="WARNING"
      ;;
  esac
  
  local context="{\"component\":\"$component\",\"status\":\"$status\",\"details\":\"$details\"}"
  
  case "$status" in
    "OK"|"HEALTHY")
      log_success "$component: $status" "$context"
      ;;
    "WARNING"|"WARN")
      log_warning "$component: $status - $details" "$context"
      ;;
    "CRITICAL"|"ERROR")
      log_error "$component: $status - $details" "$context"
      ;;
    *)
      log_info "$component: $status - $details" "$context"
      ;;
  esac
}

report_health_summary() {
  local total_components=${#HEALTH_RESULTS[@]}
  local healthy_count=0
  local warning_count=0
  local critical_count=0
  
  for status in "${HEALTH_RESULTS[@]}"; do
    case "$status" in
      "OK"|"HEALTHY") ((healthy_count++)) ;;
      "WARNING"|"WARN") ((warning_count++)) ;;
      "CRITICAL"|"ERROR") ((critical_count++)) ;;
    esac
  done
  
  local context="{\"overall_status\":\"$HEALTH_STATUS\",\"total\":$total_components,\"healthy\":$healthy_count,\"warning\":$warning_count,\"critical\":$critical_count}"
  
  echo
  log_info "=== 헬스체크 요약 ===" "$context"
  log_info "전체 상태: $HEALTH_STATUS"
  log_info "점검 항목: ${total_components}개"
  log_info "정상: ${healthy_count}, 경고: ${warning_count}, 심각: ${critical_count}"
  
  if [[ "$HEALTH_STATUS" == "HEALTHY" ]]; then
    log_success "시스템 상태 양호 - 대량 처리 준비됨"
  elif [[ "$HEALTH_STATUS" == "WARNING" ]]; then
    log_warning "시스템 경고 상태 - 주의 필요"
  else
    log_error "시스템 심각 상태 - 처리 중단 권고"
  fi
}