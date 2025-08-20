#!/usr/bin/env bash
set -euo pipefail

# 병렬 폴링 관리 스크립트 v1.0
# 다중 플랫폼 VDP 폴링의 안전한 병렬 실행 및 결과 집계

# 기본 설정
MAX_CONCURRENT_JOBS=3
POLL_SCRIPT="${HOME}/snap3/scripts/poll-vdp.sh"
LOG_DIR="${HOME}/snap3/logs"
RESULT_DIR="${HOME}/snap3/out/vdp"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 구조화된 로깅
log_parallel_event() {
  local level="$1"
  local message="$2"
  local job_id="${3:-parallel}"
  local timestamp=$(date -Iseconds)
  
  echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"job_id\":\"$job_id\",\"message\":\"$message\",\"script\":\"parallel-poll-manager.sh\"}" >&2
  echo "[$timestamp] $level: $message" >&1
}

# 사용법 표시
usage() {
  cat << EOF
Usage: $0 [OPTIONS] VDP_URI1 VDP_URI2 [VDP_URI3 ...]

Options:
  -j, --max-jobs N     Maximum concurrent jobs (default: $MAX_CONCURRENT_JOBS)
  -t, --timeout N      Timeout per job in seconds (default: 600)
  -r, --retry          Enable retry for failed jobs
  -v, --verbose        Verbose output
  -h, --help           Show this help

Examples:
  # 3개 플랫폼 병렬 폴링
  $0 \\
    "gs://bucket/vdp/youtube_id.NEW.universal.json" \\
    "gs://bucket/vdp/instagram_id.NEW.universal.json" \\
    "gs://bucket/vdp/tiktok_id.NEW.universal.json"

  # 최대 2개 동시 실행으로 제한
  $0 -j 2 \\
    "gs://bucket/vdp/video1.NEW.universal.json" \\
    "gs://bucket/vdp/video2.NEW.universal.json" \\
    "gs://bucket/vdp/video3.NEW.universal.json"
EOF
}

# 옵션 파싱
TIMEOUT=600
RETRY_FAILED=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -j|--max-jobs)
      MAX_CONCURRENT_JOBS="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -r|--retry)
      RETRY_FAILED=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

# VDP URI 목록 검증
if [[ $# -eq 0 ]]; then
  echo "Error: No VDP URIs provided" >&2
  usage >&2
  exit 1
fi

VDP_URIS=("$@")

log_parallel_event "INFO" "Starting parallel polling for ${#VDP_URIS[@]} VDP files"
log_parallel_event "INFO" "Configuration: max_jobs=$MAX_CONCURRENT_JOBS, timeout=${TIMEOUT}s, retry=$RETRY_FAILED"

# 작업 상태 추적
declare -A job_pids=()
declare -A job_status=()
declare -A job_start_time=()
declare -A job_content_ids=()
declare -A job_log_files=()

# 작업 시작 함수
start_job() {
  local vdp_uri="$1"
  local content_id=$(basename "$vdp_uri" .NEW.universal.json)
  local dest_file="${RESULT_DIR}/${content_id}.downloaded.json"
  local log_file="${LOG_DIR}/poll_${content_id}_$(date +%Y%m%d_%H%M%S).log"
  
  log_parallel_event "INFO" "Starting job for content_id: $content_id" "$content_id"
  
  # 백그라운드에서 폴링 실행
  (
    exec > "$log_file" 2>&1
    timeout "$TIMEOUT" "$POLL_SCRIPT" "$vdp_uri" "$dest_file"
  ) &
  
  local pid=$!
  job_pids["$content_id"]=$pid
  job_status["$content_id"]="running"
  job_start_time["$content_id"]=$(date +%s)
  job_content_ids["$content_id"]="$content_id"
  job_log_files["$content_id"]="$log_file"
  
  return 0
}

# 완료된 작업 확인 함수
check_completed_jobs() {
  for content_id in "${!job_pids[@]}"; do
    local pid="${job_pids[$content_id]}"
    
    if [[ "${job_status[$content_id]}" == "running" ]]; then
      if ! kill -0 "$pid" 2>/dev/null; then
        # 작업 완료됨
        wait "$pid"
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - ${job_start_time[$content_id]}))
        
        if [[ $exit_code -eq 0 ]]; then
          job_status["$content_id"]="success"
          log_parallel_event "SUCCESS" "Job completed successfully in ${duration}s" "$content_id"
        else
          job_status["$content_id"]="failed"
          log_parallel_event "ERROR" "Job failed with exit code $exit_code after ${duration}s" "$content_id"
        fi
        
        unset job_pids["$content_id"]
      fi
    fi
  done
}

# 실행 중인 작업 수 확인
count_running_jobs() {
  local count=0
  for status in "${job_status[@]}"; do
    if [[ "$status" == "running" ]]; then
      ((count++))
    fi
  done
  echo $count
}

# 메인 실행 루프
uri_index=0
retry_queue=()

while [[ $uri_index -lt ${#VDP_URIS[@]} ]] || [[ $(count_running_jobs) -gt 0 ]] || [[ ${#retry_queue[@]} -gt 0 ]]; do
  # 완료된 작업 확인
  check_completed_jobs
  
  # 새 작업 시작 (동시 실행 수 제한 내에서)
  while [[ $(count_running_jobs) -lt $MAX_CONCURRENT_JOBS ]]; do
    local next_uri=""
    
    # 재시도 큐 우선 처리
    if [[ ${#retry_queue[@]} -gt 0 ]]; then
      next_uri="${retry_queue[0]}"
      retry_queue=("${retry_queue[@]:1}")
      log_parallel_event "INFO" "Starting retry job for: $next_uri"
    elif [[ $uri_index -lt ${#VDP_URIS[@]} ]]; then
      next_uri="${VDP_URIS[$uri_index]}"
      ((uri_index++))
    else
      break
    fi
    
    if [[ -n "$next_uri" ]]; then
      start_job "$next_uri"
    fi
  done
  
  # 실패한 작업들을 재시도 큐에 추가 (옵션이 활성화된 경우)
  if [[ "$RETRY_FAILED" == "true" ]]; then
    for content_id in "${!job_status[@]}"; do
      if [[ "${job_status[$content_id]}" == "failed" ]]; then
        # 재시도를 위해 원본 URI 복원
        for uri in "${VDP_URIS[@]}"; do
          if [[ "$(basename "$uri" .NEW.universal.json)" == "$content_id" ]]; then
            retry_queue+=("$uri")
            job_status["$content_id"]="retry_queued"
            log_parallel_event "INFO" "Queued for retry: $content_id" "$content_id"
            break
          fi
        done
      fi
    done
  fi
  
  # 상태 출력 (verbose 모드)
  if [[ "$VERBOSE" == "true" ]] && [[ $(count_running_jobs) -gt 0 ]]; then
    log_parallel_event "INFO" "Running jobs: $(count_running_jobs), Remaining: $((${#VDP_URIS[@]} - uri_index)), Retry queue: ${#retry_queue[@]}"
  fi
  
  sleep 2
done

# 최종 결과 집계
log_parallel_event "INFO" "All jobs completed, generating summary report"

total_jobs=0
successful_jobs=0
failed_jobs=0

echo ""
echo "🎯 병렬 폴링 실행 결과 요약"
echo "================================"

for content_id in "${!job_status[@]}"; do
  ((total_jobs++))
  local status="${job_status[$content_id]}"
  local log_file="${job_log_files[$content_id]}"
  
  case "$status" in
    "success")
      ((successful_jobs++))
      echo "✅ $content_id: 성공"
      
      # VDP 파일 검증
      local dest_file="${RESULT_DIR}/${content_id}.downloaded.json"
      if [[ -f "$dest_file" ]]; then
        echo "   📄 $(jq -r '(.video_id // .content_id) + " (" + (.platform_context.platform // .platform // "unknown") + ")"' "$dest_file" 2>/dev/null || echo "파일 확인됨")"
      fi
      ;;
    "failed"|"retry_queued")
      ((failed_jobs++))
      echo "❌ $content_id: 실패"
      
      # 로그 파일에서 마지막 에러 추출
      if [[ -f "$log_file" ]]; then
        local last_error=$(tail -n 5 "$log_file" | grep -E "(ERROR|❌)" | tail -n 1 || echo "에러 정보 없음")
        echo "   🔍 $last_error"
      fi
      ;;
  esac
done

echo ""
echo "📊 실행 통계"
echo "- 전체: $total_jobs"
echo "- 성공: $successful_jobs"
echo "- 실패: $failed_jobs"
echo "- 성공률: $(( successful_jobs * 100 / total_jobs ))%"

# 실패한 작업들에 대한 문제 해결 가이드
if [[ $failed_jobs -gt 0 ]]; then
  echo ""
  echo "🛠️ 실패한 작업 문제 해결 가이드"
  echo "1. 로그 파일 확인: ls -la $LOG_DIR/poll_*"
  echo "2. GCS 권한 확인: gcloud auth list"
  echo "3. VDP 생성 상태 확인: ls -la $RESULT_DIR/"
  echo "4. 재시도: $0 -r [실패한 URI들]"
fi

echo ""
log_parallel_event "INFO" "Parallel polling completed: $successful_jobs/$total_jobs successful"

# 종료 코드 설정
if [[ $failed_jobs -gt 0 ]]; then
  exit 1
else
  exit 0
fi