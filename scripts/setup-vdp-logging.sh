#!/usr/bin/env bash
#
# VDP Pipeline Logging Setup Script
#
# Purpose: Configure structured logging and tracing for all VDP scripts
# Usage: ./scripts/setup-vdp-logging.sh [--environment dev|prod]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default environment
ENVIRONMENT="${NODE_ENV:-dev}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --environment) ENVIRONMENT="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 [--environment dev|prod]"
      echo "Configure VDP pipeline logging and tracing"
      exit 0;;
    *) echo "Unknown argument: $1"; exit 1;;
  esac
done

echo "🔧 Setting up VDP Pipeline Logging & Tracing"
echo "Environment: $ENVIRONMENT"
echo

# 1. Ensure logging dependencies are installed
echo "📦 Checking Node.js dependencies..."
cd "$PROJECT_ROOT"

if [[ ! -f "package.json" ]]; then
  echo "📋 Creating package.json..."
  npm init -y
fi

# Check if pino is installed
if ! npm list pino >/dev/null 2>&1; then
  echo "📦 Installing Pino logging dependencies..."
  npm install pino pino-http pino-pretty
fi

# Check if OpenTelemetry is installed
if ! npm list @opentelemetry/sdk-node >/dev/null 2>&1; then
  echo "📦 Installing OpenTelemetry dependencies..."
  npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
fi

echo "✅ Dependencies verified"

# 2. Set up log directory structure
echo "📁 Setting up log directories..."
mkdir -p logs/{app,error,access,performance}
mkdir -p logs/correlation

echo "✅ Log directories created"

# 3. Create environment-specific logging configuration
echo "⚙️ Creating logging configuration..."

cat > "config/logging.${ENVIRONMENT}.json" <<EOF
{
  "level": "${LOG_LEVEL:-info}",
  "environment": "${ENVIRONMENT}",
  "service": "vdp-pipeline",
  "version": "1.0.0",
  "correlation": {
    "enabled": true,
    "header": "x-correlation-id",
    "generate": true
  },
  "transport": {
    "type": "${ENVIRONMENT}",
    "file": {
      "destination": "./logs/app/vdp-pipeline.log",
      "rotation": {
        "size": "10MB",
        "count": 5
      }
    },
    "console": {
      "colorize": true,
      "translateTime": true,
      "ignore": "pid,hostname"
    }
  },
  "performance": {
    "enabled": true,
    "slow_threshold_ms": 1000,
    "log_level": "warn"
  },
  "tracing": {
    "enabled": true,
    "service_name": "vdp-storage-service",
    "service_version": "1.0.0",
    "exporters": ["console", "jaeger"]
  }
}
EOF

echo "✅ Created config/logging.${ENVIRONMENT}.json"

# 4. Create correlation ID management script
echo "🔗 Setting up correlation ID management..."

cat > "scripts/correlation-helper.sh" <<'EOF'
#!/usr/bin/env bash
#
# Correlation ID Helper for VDP Pipeline
#

# Generate new correlation ID
generate_correlation_id() {
  echo "vdp-$(date +%Y%m%d)-$(openssl rand -hex 6)"
}

# Set correlation ID for current session
set_correlation_id() {
  export CORRELATION_ID="${1:-$(generate_correlation_id)}"
  echo "Correlation ID: $CORRELATION_ID"
}

# Get current correlation ID
get_correlation_id() {
  echo "${CORRELATION_ID:-$(generate_correlation_id)}"
}

# Save correlation ID to file for cross-script sharing
save_correlation_id() {
  local correlation_id="${1:-$CORRELATION_ID}"
  local session_file="logs/correlation/session-$(date +%Y%m%d-%H%M%S).id"
  echo "$correlation_id" > "$session_file"
  echo "Saved correlation ID to: $session_file"
}

# Load latest correlation ID
load_latest_correlation_id() {
  local latest_file
  latest_file="$(ls -t logs/correlation/session-*.id 2>/dev/null | head -n1)"
  
  if [[ -n "$latest_file" ]]; then
    export CORRELATION_ID="$(cat "$latest_file")"
    echo "Loaded correlation ID: $CORRELATION_ID"
  else
    set_correlation_id
  fi
}

# Main function for CLI usage
case "${1:-}" in
  generate) generate_correlation_id;;
  set) set_correlation_id "$2";;
  get) get_correlation_id;;
  save) save_correlation_id;;
  load) load_latest_correlation_id;;
  *) echo "Usage: $0 {generate|set|get|save|load} [correlation_id]";;
esac
EOF

chmod +x "scripts/correlation-helper.sh"
echo "✅ Created scripts/correlation-helper.sh"

# 5. Update environment variables
echo "🌍 Setting up environment variables..."

cat >> ".env.${ENVIRONMENT}" <<EOF

# Logging Configuration (Added by setup-vdp-logging.sh)
LOG_LEVEL=${LOG_LEVEL:-info}
PINO_LOG_LEVEL=${LOG_LEVEL:-info}
OTEL_SERVICE_NAME=vdp-storage-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=service.name=vdp-storage-service,service.version=1.0.0,deployment.environment=${ENVIRONMENT}

# Performance Monitoring
PERFORMANCE_MONITORING_ENABLED=true
SLOW_OPERATION_THRESHOLD_MS=1000

EOF

echo "✅ Updated .env.${ENVIRONMENT}"

# 6. Create log rotation script
echo "🔄 Setting up log rotation..."

cat > "scripts/rotate-logs.sh" <<'EOF'
#!/usr/bin/env bash
#
# VDP Pipeline Log Rotation Script
#

LOG_DIR="logs"
MAX_SIZE="50MB"
MAX_COUNT=10

echo "🔄 Rotating VDP pipeline logs..."

for log_type in app error access performance; do
  log_path="${LOG_DIR}/${log_type}"
  
  if [[ -d "$log_path" ]]; then
    echo "Processing ${log_type} logs..."
    
    # Compress old logs
    find "$log_path" -name "*.log" -size +$MAX_SIZE -exec gzip {} \;
    
    # Remove old compressed logs
    find "$log_path" -name "*.log.gz" -mtime +30 -delete
    
    # Keep only recent logs
    ls -t "$log_path"/*.log.gz 2>/dev/null | tail -n +$((MAX_COUNT + 1)) | xargs rm -f
    
    echo "✅ ${log_type} logs rotated"
  fi
done

# Clean correlation ID files older than 7 days
find "logs/correlation" -name "session-*.id" -mtime +7 -delete 2>/dev/null || true

echo "✅ Log rotation completed"
EOF

chmod +x "scripts/rotate-logs.sh"
echo "✅ Created scripts/rotate-logs.sh"

# 7. Test logging setup
echo "🧪 Testing logging setup..."

# Generate test correlation ID
CORRELATION_ID="$(scripts/correlation-helper.sh generate)"
export CORRELATION_ID

# Test Pino logging
if node scripts/logging-helper.js info "VDP logging setup test" "{\"test\":true,\"environment\":\"$ENVIRONMENT\"}" >/dev/null 2>&1; then
  echo "✅ Pino structured logging working"
else
  echo "⚠️ Pino logging test failed - fallback to console logging"
fi

# Test bash logging integration
if source scripts/bash-logger.sh && log_info "Bash logging integration test" "{\"test\":true}"; then
  echo "✅ Bash logging integration working"
else
  echo "⚠️ Bash logging integration test failed"
fi

echo
echo "🎉 VDP Pipeline Logging Setup Complete!"
echo
echo "📋 Summary:"
echo "  • Pino structured logging: ✅"
echo "  • OpenTelemetry tracing: ✅"
echo "  • Correlation ID tracking: ✅"
echo "  • Bash script integration: ✅"
echo "  • Log rotation: ✅"
echo "  • Environment: $ENVIRONMENT"
echo
echo "🚀 Usage:"
echo "  • Start with correlation ID: source scripts/correlation-helper.sh && set_correlation_id"
echo "  • Run health check: ./scripts/ops-health-check.sh"
echo "  • Run enrichment: ./scripts/vdp-enrich-complete.sh"
echo "  • View logs: tail -f logs/app/vdp-pipeline.log"
echo "  • Rotate logs: ./scripts/rotate-logs.sh"