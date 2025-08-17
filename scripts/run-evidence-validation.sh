#!/usr/bin/env bash
set -euo pipefail

# Evidence Pack 검증 실행 래퍼 스크립트 v1.0
# Usage: ./run-evidence-validation.sh [CID] [GCS_URI]

# 환경 설정
CID="${1:-55e6ScXfiZc}"
OUT_GCS="${2:-gs://tough-variety-raw/raw/vdp/${CID}.NEW.universal.json}"

SCRIPT_DIR=$(dirname "$0")
DEST="${HOME}/snap3/out/vdp/${CID}.downloaded.json"

# 구조화된 로깅 함수
log_event() {
  local level="$1"
  local message="$2"
  local content_id="${3:-$CID}"
  local timestamp=$(date -Iseconds)
  
  echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"content_id\":\"$content_id\",\"message\":\"$message\",\"script\":\"run-evidence-validation.sh\"}" >&2
  echo "[$timestamp] $level: $message" >&1
}

main() {
  echo "🔍 VDP Evidence Pack Validation Runner"
  echo "Content ID: $CID"
  echo "GCS URI: $OUT_GCS"
  echo "Local Destination: $DEST"
  echo ""
  
  log_event "INFO" "Starting Evidence Pack validation workflow" "$CID"
  
  # 출력 디렉터리 생성
  mkdir -p "$(dirname "$DEST")"
  
  # VDP 파일이 로컬에 이미 존재하는지 확인
  if [[ -f "$DEST" ]]; then
    log_event "INFO" "Local VDP file found, proceeding with validation" "$CID"
  else
    log_event "INFO" "Local VDP file not found, attempting download from GCS" "$CID"
    
    # GCS에서 파일 다운로드 시도
    if gsutil -q stat "$OUT_GCS" 2>/dev/null; then
      log_event "INFO" "VDP file found in GCS, downloading" "$CID"
      
      if gsutil -q cp "$OUT_GCS" "$DEST"; then
        log_event "SUCCESS" "VDP file downloaded successfully" "$CID"
      else
        log_event "ERROR" "Failed to download VDP file from GCS" "$CID"
        exit 1
      fi
    else
      log_event "ERROR" "VDP file not found in GCS: $OUT_GCS" "$CID"
      echo "💡 Try running the polling script first:"
      echo "   ./poll-vdp.sh \"$OUT_GCS\" \"$DEST\""
      exit 1
    fi
  fi
  
  # Evidence 검증 스크립트 실행
  if [[ -x "$SCRIPT_DIR/validate-vdp-evidence.sh" ]]; then
    log_event "INFO" "Running Evidence Pack validation" "$CID"
    echo ""
    echo "🔍 Starting Evidence Pack validation..."
    
    if "$SCRIPT_DIR/validate-vdp-evidence.sh" "$DEST" "$CID"; then
      log_event "SUCCESS" "Evidence Pack validation completed successfully" "$CID"
      exit 0
    else
      log_event "WARN" "Evidence Pack validation completed with warnings or errors" "$CID"
      exit 1
    fi
  else
    log_event "ERROR" "Evidence validation script not found or not executable" "$CID"
    echo "💡 Make sure the script exists and is executable:"
    echo "   chmod +x $SCRIPT_DIR/validate-vdp-evidence.sh"
    exit 1
  fi
}

# 사용법 출력
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  cat <<EOF
VDP Evidence Pack Validation Runner

Usage:
  $0 [CONTENT_ID] [GCS_URI]

Examples:
  $0 55e6ScXfiZc
  $0 55e6ScXfiZc gs://tough-variety-raw/raw/vdp/55e6ScXfiZc.NEW.universal.json
  $0 --help

Environment:
  Default Content ID: 55e6ScXfiZc
  Default GCS Path: gs://tough-variety-raw/raw/vdp/\${CID}.NEW.universal.json
  Local Destination: ~/snap3/out/vdp/\${CID}.downloaded.json

Validation Checks:
  ✓ Meta fields (content_id, platform, scenes)
  ✓ BGM clustering (cluster_id, confidence)
  ✓ Audio fingerprint (ChromaPrint hash)
  ✓ Brand/Product detection
  ✓ Hook Genome (strength ≥0.70, start ≤3s)

Output:
  - Structured JSON logs (stderr)
  - Human-readable progress (stdout)
  - Evidence Pack summary report
EOF
  exit 0
fi

main "$@"