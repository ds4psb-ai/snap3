#!/usr/bin/env bash
set -euo pipefail

# 표준화된 폴링/승격 스크립트 v2.1 (운영 안정성 강화)
# 폴링 대상: 항상 gs://bucket/vdp/{content_id}.NEW.universal.json
# 승격 로직: 로컬 *.API.response.json / *.raw.json → ID 기준 매칭

OBJ="$1"         # gs://.../vdp/{content_id}.NEW.universal.json (표준화)
DEST="$2"        # ~/snap3/out/vdp/{content_id}.downloaded.json
MAX_ATTEMPTS=40  # 최대 약 10분 (40회 × 평균 15초)
SLEEP=5          # 시작 간격(초)
FACTOR=1.35      # 지수 백오프 계수

# 구조화된 로깅 함수
log_event() {
  local level="$1"
  local message="$2"
  local content_id="${3:-unknown}"
  local timestamp=$(date -Iseconds)
  
  # JSON 구조화 로그 (모니터링 시스템 연동 가능)
  echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"content_id\":\"$content_id\",\"message\":\"$message\",\"script\":\"poll-vdp.sh\"}" >&2
  
  # 사람이 읽기 쉬운 로그
  echo "[$timestamp] $level: $message" >&1
}

# Content ID 검증 함수
validate_content_id() {
  local content_id="$1"
  
  # 빈 문자열 체크
  if [[ -z "$content_id" ]]; then
    log_event "ERROR" "Empty content_id extracted from URI: $OBJ" "$content_id"
    return 1
  fi
  
  # 특수문자/공백 체크 (알파벳, 숫자, 하이픈, 언더스코어만 허용)
  if [[ ! "$content_id" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    log_event "ERROR" "Invalid content_id format: '$content_id'. Only alphanumeric, hyphens, and underscores allowed." "$content_id"
    return 1
  fi
  
  # 길이 체크 (너무 짧거나 긴 경우)
  if [[ ${#content_id} -lt 3 || ${#content_id} -gt 100 ]]; then
    log_event "ERROR" "Invalid content_id length: ${#content_id} chars. Must be 3-100 characters." "$content_id"
    return 1
  fi
  
  return 0
}

# GCS 권한 체크 함수
check_gcs_permissions() {
  local bucket_path="$1"
  local content_id="$2"
  
  # 읽기 권한 체크
  if ! gsutil -q stat "$bucket_path" 2>/dev/null; then
    local bucket=$(echo "$bucket_path" | sed 's|gs://\([^/]*\)/.*|\1|')
    log_event "ERROR" "GCS read permission denied or object not found. Check bucket access: gs://$bucket" "$content_id"
    log_event "INFO" "💡 Fix: gcloud projects add-iam-policy-binding PROJECT_ID --member='serviceAccount:SERVICE_ACCOUNT' --role='roles/storage.objectViewer'" "$content_id"
    return 1
  fi
  
  return 0
}

# Content ID 추출 및 검증
CONTENT_ID=$(basename "$OBJ" .NEW.universal.json)
if ! validate_content_id "$CONTENT_ID"; then
  exit 1
fi

# 표준화 검증: GCS URI 패턴 확인
if [[ ! "$OBJ" =~ gs://[^/]+/.*vdp/.*\.NEW\.universal\.json$ ]]; then
  log_event "WARN" "Non-standard GCS URI pattern detected" "$CONTENT_ID"
  echo "💡 Expected: gs://bucket/vdp/{content_id}.NEW.universal.json"
fi

log_event "INFO" "Starting polling for VDP file" "$CONTENT_ID"

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
  if gsutil -q stat "$OBJ" 2>/dev/null; then
    log_event "INFO" "VDP file found, downloading" "$CONTENT_ID"
    
    if gsutil -q cp "$OBJ" "$DEST"; then
      log_event "SUCCESS" "VDP file downloaded successfully" "$CONTENT_ID"
      echo "✅ Downloaded: $DEST"
      
      # VDP 검증 및 요약 표시
      jq -C '{
        content_id: (.video_id // .content_id),
        platform: (.platform_context.platform // .platform // "unknown"),
        scenes: (.scenes | length),
        hook_strength: (.overall_analysis.hookGenome.strength_score // .hook_genome.strength_score // "N/A")
      }' "$DEST" || true
      
      # Evidence Pack 검증 실행
      SCRIPT_DIR=$(dirname "$0")
      if [[ -x "$SCRIPT_DIR/validate-vdp-evidence.sh" ]]; then
        log_event "INFO" "Running Evidence Pack validation" "$CONTENT_ID"
        echo ""
        echo "🔍 Starting Evidence Pack validation..."
        
        if "$SCRIPT_DIR/validate-vdp-evidence.sh" "$DEST" "$CONTENT_ID"; then
          log_event "SUCCESS" "Evidence Pack validation completed successfully" "$CONTENT_ID"
        else
          log_event "WARN" "Evidence Pack validation completed with warnings or errors" "$CONTENT_ID"
        fi
      else
        log_event "WARN" "Evidence validation script not found or not executable" "$CONTENT_ID"
      fi
      
      exit 0
    else
      log_event "ERROR" "Failed to download VDP file from GCS" "$CONTENT_ID"
      exit 1
    fi
  fi
  
  printf "⏳ [%02d/%02d] waiting for %s ...\n" "$attempt" "$MAX_ATTEMPTS" "$OBJ"
  sleep "$SLEEP"
  
  # 지수 백오프
  SLEEP=$(python3 - <<PY
s=$SLEEP*${FACTOR}
print(int(s) if s<30 else 30)
PY
)
  attempt=$((attempt+1))
done

# 타임아웃 시 로컬 API 응답 승격 시도
log_event "WARN" "Polling timeout reached, attempting local promotion" "$CONTENT_ID"

# ID 기준 로컬 파일 후보들 (표준화된 승격 로직)
CANDIDATES=(
  "${HOME}/snap3/out/vdp/${CONTENT_ID}.API.response.json"
  "${HOME}/snap3/out/vdp/${CONTENT_ID}.raw.json"
  "${HOME}/snap3/out/vdp/${CONTENT_ID}.NEW.v5.json"
)

log_event "INFO" "Checking promotion candidates" "$CONTENT_ID"

# 승격 시도 함수 (재시도 로직 포함)
attempt_promotion() {
  local candidate="$1"
  local max_retries=3
  local retry=1
  
  while (( retry <= max_retries )); do
    log_event "INFO" "Promotion attempt $retry/$max_retries for: $(basename "$candidate")" "$CONTENT_ID"
    
    # VDP 구조 확인
    if ! jq -e '.video_id // .vdp.video_id // .content_id' "$candidate" >/dev/null 2>&1; then
      log_event "ERROR" "Invalid VDP structure in candidate file" "$CONTENT_ID"
      return 1
    fi
    
    # VDP 섹션 추출 (nested 구조인 경우)
    local upload_file="$candidate"
    if jq -e '.vdp' "$candidate" >/dev/null 2>&1; then
      log_event "INFO" "Extracting VDP section from nested structure" "$CONTENT_ID"
      local tmp_vdp="/tmp/vdp_promotion_${CONTENT_ID}_$$.json"
      jq '.vdp' "$candidate" > "$tmp_vdp"
      upload_file="$tmp_vdp"
    fi
    
    # GCS 업로드 시도
    if gsutil cp "$upload_file" "$OBJ" 2>/dev/null; then
      log_event "SUCCESS" "Promotion successful from: $(basename "$candidate")" "$CONTENT_ID"
      
      # 로컬 복사
      if gsutil -q cp "$OBJ" "$DEST"; then
        log_event "SUCCESS" "Downloaded promoted VDP successfully" "$CONTENT_ID"
        
        # VDP 검증 및 요약 표시
        jq -C '{
          content_id: (.video_id // .content_id),
          platform: (.platform_context.platform // .platform // "unknown"),
          scenes: (.scenes | length),
          hook_strength: (.overall_analysis.hookGenome.strength_score // .hook_genome.strength_score // "N/A")
        }' "$DEST" || true
        
        # Evidence Pack 검증 실행 (승격된 파일에 대해서도)
        SCRIPT_DIR=$(dirname "$0")
        if [[ -x "$SCRIPT_DIR/validate-vdp-evidence.sh" ]]; then
          log_event "INFO" "Running Evidence Pack validation on promoted file" "$CONTENT_ID"
          echo ""
          echo "🔍 Starting Evidence Pack validation (promoted)..."
          
          if "$SCRIPT_DIR/validate-vdp-evidence.sh" "$DEST" "$CONTENT_ID"; then
            log_event "SUCCESS" "Evidence Pack validation completed successfully" "$CONTENT_ID"
          else
            log_event "WARN" "Evidence Pack validation completed with warnings or errors" "$CONTENT_ID"
          fi
        fi
        
        # 임시 파일 정리
        [[ -f "/tmp/vdp_promotion_${CONTENT_ID}_$$.json" ]] && rm -f "/tmp/vdp_promotion_${CONTENT_ID}_$$.json"
        
        return 0
      else
        log_event "ERROR" "Failed to download promoted VDP" "$CONTENT_ID"
      fi
    else
      log_event "WARN" "Upload attempt $retry failed, retrying..." "$CONTENT_ID"
      sleep $((retry * 2))  # 점진적 백오프
    fi
    
    # 임시 파일 정리 (실패 시에도)
    [[ -f "/tmp/vdp_promotion_${CONTENT_ID}_$$.json" ]] && rm -f "/tmp/vdp_promotion_${CONTENT_ID}_$$.json"
    
    ((retry++))
  done
  
  return 1
}

# 각 후보 파일에 대해 승격 시도
for CAND in "${CANDIDATES[@]}"; do
  if [[ -f "$CAND" ]]; then
    log_event "INFO" "Found promotion candidate: $(basename "$CAND")" "$CONTENT_ID"
    
    if attempt_promotion "$CAND"; then
      exit 0
    fi
  fi
done

log_event "ERROR" "Promotion failed: no valid local VDP found or all upload attempts failed" "$CONTENT_ID"
echo "💡 Troubleshooting:"
echo "   1. Check if VDP generation completed: ls -la ~/snap3/out/vdp/${CONTENT_ID}*"
echo "   2. Verify GCS write permissions: gsutil -m cp test.txt gs://$(echo "$OBJ" | sed 's|gs://\([^/]*\)/.*|\1|')/"
echo "   3. Check service account roles: gcloud projects get-iam-policy PROJECT_ID"
exit 2