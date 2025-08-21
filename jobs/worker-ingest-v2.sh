#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Ingest Request Worker v2.0 - Platform-Segmented Architecture
# ============================================================================
# 목표: 플랫폼별 분기·충돌 방지·content_id 보정
# 
# 핵심 개선사항:
# - ingest/requests/{platform}/ 디렉토리별 폴링 (크로스 오염 방지)
# - content_key 기준 중복 방지 (.{content_id}.done)
# - content_id 누락 시 content_key에서 보정 (fallback)
# - YouTube만 다운로드→증거팩→VDP 트리거, IG/TT는 메타데이터 스테이징만
# ============================================================================

# Environment Variables (with defaults) - Regional Alignment Policy v1.3.1
RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw-central1}"
REQ_PREFIX="${REQ_PREFIX:-gs://tough-variety-raw-central1/ingest/requests}"
INPUT_PREFIX="${INPUT_PREFIX:-gs://tough-variety-raw-central1/raw/input}"
EVID_PREFIX="${EVID_PREFIX:-gs://tough-variety-raw-central1/raw/vdp/evidence}"
OUT_VDP_PREFIX="${OUT_VDP_PREFIX:-gs://tough-variety-raw-central1/raw/vdp}"
US_T2="${US_T2:-http://localhost:8082}"

# Regional Alignment & Platform Segmentation Enforcement
REQUIRED_REGION="${REQUIRED_REGION:-us-central1}"
PLATFORM_SEGMENTED_PATH="${PLATFORM_SEGMENTED_PATH:-true}"

# Correlation ID for request tracing
CORRELATION_ID_PREFIX="${CORRELATION_ID_PREFIX:-worker-v2}"

# Working Directory Setup
WORKDIR="${HOME}/snap3-jobs/work"
mkdir -p "$WORKDIR"

# Once mode flag
ONCE_MODE=false
if [[ "${1:-}" == "--once" ]]; then
    ONCE_MODE=true
fi

# ============================================================================
# Regional Alignment & Platform Segmentation Validation
# ============================================================================
validate_regional_alignment() {
    local correlation_id="${1:-$MASTER_CORRELATION_ID}"
    log_with_correlation "INFO" "Validating Regional Alignment Policy v1.3.1" "$correlation_id"
    
    # Check bucket region alignment
    if [[ "$RAW_BUCKET" != *"-central1" ]]; then
        local context=$(jq -n \
            --arg expected_bucket "tough-variety-raw-central1" \
            --arg current_bucket "$RAW_BUCKET" \
            --arg expected_region "$REQUIRED_REGION" \
            --arg recommendation "Use tough-variety-raw-central1 bucket" \
            '{
              "expected_bucket": $expected_bucket,
              "current_bucket": $current_bucket,
              "expected_region": $expected_region,
              "recommendation": $recommendation
            }')
        
        log_problem_details "BUCKET_REGION_MISMATCH" \
            "GCS bucket region mismatch" \
            "Bucket $RAW_BUCKET not in required $REQUIRED_REGION region" \
            "$correlation_id" \
            "$context"
        return 1
    fi
    
    # Check service endpoint region (skip localhost)
    if [[ "$US_T2" != *"us-central1"* && "$US_T2" != *"localhost"* ]]; then
        local context=$(jq -n \
            --arg expected_region "$REQUIRED_REGION" \
            --arg service_url "$US_T2" \
            --arg recommendation "Use us-central1 service endpoint" \
            '{
              "expected_region": $expected_region,
              "service_url": $service_url,
              "recommendation": $recommendation
            }')
        
        log_problem_details "CROSS_REGION_ACCESS_DETECTED" \
            "Cross-region service access detected" \
            "Service endpoint $US_T2 not in required $REQUIRED_REGION region" \
            "$correlation_id" \
            "$context"
        return 1
    fi
    
    # Validate platform segmentation requirement
    if [[ "$PLATFORM_SEGMENTED_PATH" == "true" ]]; then
        log_with_correlation "INFO" "Platform segmentation enabled (PLATFORM_SEGMENTED_PATH=true)" "$correlation_id"
        
        # Validate that all paths use platform segments
        if [[ "$REQ_PREFIX" != *"/requests" ]]; then
            local context=$(jq -n \
                --arg current_prefix "$REQ_PREFIX" \
                --arg expected_pattern "*/requests" \
                --arg recommendation "Add /requests suffix to enable platform segmentation" \
                '{
                  "current_prefix": $current_prefix,
                  "expected_pattern": $expected_pattern,
                  "recommendation": $recommendation
                }')
            
            log_problem_details "PLATFORM_SEGMENTATION_MISSING" \
                "Platform segmentation missing" \
                "Request prefix must end with /requests for platform segmentation" \
                "$correlation_id" \
                "$context"
            return 1
        fi
    else
        log_with_correlation "WARNING" "Platform segmentation disabled (legacy mode)" "$correlation_id"
    fi
    
    log_with_correlation "INFO" "Regional alignment validation passed" "$correlation_id"
    log_with_correlation "DEBUG" "Region: $REQUIRED_REGION, Bucket: $RAW_BUCKET, Service: $US_T2" "$correlation_id"
    return 0
}

# Enhanced Platform Segmentation Validation
validate_platform_segmentation() {
    local path="$1"
    local platform="$2"
    local path_type="$3"  # input|output|staging|evidence
    local correlation_id="$4"
    
    log_with_correlation "DEBUG" "Validating platform segmentation for $path_type path" "$correlation_id"
    
    # Skip validation if platform segmentation is disabled
    if [[ "$PLATFORM_SEGMENTED_PATH" != "true" ]]; then
        log_with_correlation "DEBUG" "Platform segmentation disabled, skipping validation" "$correlation_id"
        return 0
    fi
    
    # Validate platform segment exists in path
    if [[ "$path" != *"/${platform}/"* ]]; then
        local context=$(jq -n \
            --arg path "$path" \
            --arg path_type "$path_type" \
            --arg expected_platform "$platform" \
            --arg required_format "gs://bucket/{type}/{platform}/{content_id}.ext" \
            '{
              "path": $path,
              "path_type": $path_type,
              "expected_platform": $expected_platform,
              "required_format": $required_format
            }')
        
        log_problem_details "PLATFORM_SEGMENTATION_MISSING" \
            "Platform segmentation missing" \
            "$path_type path missing platform segment for $platform" \
            "$correlation_id" \
            "$context"
        return 1
    fi
    
    # Validate path structure follows platform-segmented pattern
    case "$path_type" in
        "input")
            if [[ "$path" != *"/raw/input/${platform}/"* ]]; then
                local context=$(jq -n \
                    --arg path "$path" \
                    --arg expected "gs://bucket/raw/input/${platform}/filename.ext" \
                    --arg path_type "input" \
                    '{
                      "path": $path,
                      "expected_format": $expected,
                      "path_type": $path_type
                    }')
                
                log_problem_details "INVALID_GCS_PATH_STRUCTURE" \
                    "Invalid GCS path structure" \
                    "Input path structure does not match required format" \
                    "$correlation_id" \
                    "$context"
                return 1
            fi
            ;;
        "output")
            if [[ "$path" != *"/raw/vdp/${platform}/"* ]]; then
                local context=$(jq -n \
                    --arg path "$path" \
                    --arg expected "gs://bucket/raw/vdp/${platform}/filename.json" \
                    --arg path_type "output" \
                    '{
                      "path": $path,
                      "expected_format": $expected,
                      "path_type": $path_type
                    }')
                
                log_problem_details "INVALID_GCS_PATH_STRUCTURE" \
                    "Invalid GCS path structure" \
                    "Output path structure does not match required format" \
                    "$correlation_id" \
                    "$context"
                return 1
            fi
            ;;
        "evidence")
            if [[ "$path" != *"/raw/vdp/evidence/${platform}/"* ]]; then
                local context=$(jq -n \
                    --arg path "$path" \
                    --arg expected "gs://bucket/raw/vdp/evidence/${platform}/filename.json" \
                    --arg path_type "evidence" \
                    '{
                      "path": $path,
                      "expected_format": $expected,
                      "path_type": $path_type
                    }')
                
                log_problem_details "INVALID_GCS_PATH_STRUCTURE" \
                    "Invalid GCS path structure" \
                    "Evidence path structure does not match required format" \
                    "$correlation_id" \
                    "$context"
                return 1
            fi
            ;;
        "staging")
            if [[ "$path" != *"/staging/social_metadata/${platform}/"* ]]; then
                local context=$(jq -n \
                    --arg path "$path" \
                    --arg expected "gs://bucket/staging/social_metadata/${platform}/filename.json" \
                    --arg path_type "staging" \
                    '{
                      "path": $path,
                      "expected_format": $expected,
                      "path_type": $path_type
                    }')
                
                log_problem_details "INVALID_GCS_PATH_STRUCTURE" \
                    "Invalid GCS path structure" \
                    "Staging path structure does not match required format" \
                    "$correlation_id" \
                    "$context"
                return 1
            fi
            ;;
        *)
            log_with_correlation "WARNING" "Unknown path type for validation: $path_type" "$correlation_id"
            ;;
    esac
    
    log_with_correlation "DEBUG" "Platform segmentation validation passed for $path_type" "$correlation_id"
    return 0
}

# Validate content_key format compliance
validate_content_key_format() {
    local content_key="$1"
    local platform="$2"
    local content_id="$3"
    local correlation_id="$4"
    
    log_with_correlation "DEBUG" "Validating content_key format compliance" "$correlation_id"
    
    # Check content_key format: platform:content_id
    if [[ "$content_key" != "${platform}:${content_id}" ]]; then
        local context=$(jq -n \
            --arg expected "${platform}:${content_id}" \
            --arg actual "$content_key" \
            --arg required_format "platform:content_id" \
            --arg purpose "global uniqueness" \
            '{
              "expected": $expected,
              "actual": $actual,
              "required_format": $required_format,
              "purpose": $purpose
            }')
        
        log_problem_details "CONTENT_KEY_FORMAT_INVALID" \
            "Content key format violation" \
            "Content key format does not match required platform:content_id pattern" \
            "$correlation_id" \
            "$context"
        return 1
    fi
    
    # Validate platform component (convert to lowercase for comparison)
    platform_lower="$(echo "$platform" | tr '[:upper:]' '[:lower:]')"
    case "$platform_lower" in
        "youtube"|"instagram"|"tiktok")
            log_with_correlation "DEBUG" "Platform validation passed: $platform" "$correlation_id"
            ;;
        *)
            local context=$(jq -n \
                --arg platform "$platform" \
                --arg content_key "$content_key" \
                --arg supported_platforms "youtube|instagram|tiktok" \
                '{
                  "platform": $platform,
                  "content_key": $content_key,
                  "supported_platforms": $supported_platforms
                }')
            
            log_problem_details "PLATFORM_NORMALIZATION_FAILED" \
                "Platform normalization failed" \
                "Unknown platform $platform in content_key, supported: youtube|instagram|tiktok" \
                "$correlation_id" \
                "$context"
            return 1
            ;;
    esac
    
    # Validate content_id component (not empty, no special chars that could cause issues)
    if [[ -z "$content_id" ]]; then
        local context=$(jq -n \
            --arg content_key "$content_key" \
            --arg platform "$platform" \
            '{
              "content_key": $content_key,
              "platform": $platform,
              "missing_component": "content_id"
            }')
        
        log_problem_details "CONTENT_KEY_MISSING" \
            "Content key missing required component" \
            "content_id component is empty in content_key" \
            "$correlation_id" \
            "$context"
        return 1
    fi
    
    if [[ "$content_id" == *":"* ]]; then
        local context=$(jq -n \
            --arg content_id "$content_id" \
            --arg invalid_char ":" \
            --arg reason "colons are reserved as platform:content_id separator" \
            '{
              "content_id": $content_id,
              "invalid_character": $invalid_char,
              "reason": $reason
            }')
        
        log_problem_details "CONTENT_KEY_FORMAT_INVALID" \
            "Content key format violation" \
            "content_id contains invalid separator character" \
            "$correlation_id" \
            "$context"
        return 1
    fi
    
    log_with_correlation "DEBUG" "Content key format validation passed: $content_key" "$correlation_id"
    return 0
}

# Generate correlation ID for request tracing
generate_correlation_id() {
    echo "${CORRELATION_ID_PREFIX}-$(date +%s)-$$-$(openssl rand -hex 4 2>/dev/null || echo "$(date +%N)" | tail -c 8)"
}

# Enhanced logging with correlation ID and performance metrics
log_with_correlation() {
    local level="$1"
    local message="$2"
    local correlation_id="${3:-${CORRELATION_ID:-unknown}}"
    local timestamp="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
    
    echo "[$timestamp] [$level] [correlation_id=$correlation_id] $message"
}

# Performance timing utilities
start_timer() {
    echo "$(date +%s.%N)"
}

calculate_duration() {
    local start_time="$1"
    local end_time="$(date +%s.%N)"
    echo "$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0.0")s"
}

# ============================================================================
# RFC 9457 Problem Details Error Handling
# ============================================================================
generate_problem_details() {
    local error_code="$1"
    local title="$2"
    local detail="$3"
    local correlation_id="$4"
    local additional_context="${5:-{}}"
    
    local timestamp="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
    local instance="/worker/ingest/v2/${correlation_id}"
    
    # Generate RFC 9457 Problem Details JSON
    local problem_details=$(jq -n \
        --arg type "https://api.outlier.example/problems/$(echo "$error_code" | tr '[:upper:]' '[:lower:]' | tr '_' '-')" \
        --arg title "$title" \
        --arg detail "$detail" \
        --arg instance "$instance" \
        --arg code "$error_code" \
        --arg timestamp "$timestamp" \
        --arg correlation_id "$correlation_id" \
        --argjson context "$additional_context" \
        '{
          "type": $type,
          "title": $title,
          "status": 422,
          "detail": $detail,
          "instance": $instance,
          "code": $code,
          "timestamp": $timestamp,
          "correlation_id": $correlation_id
        } + $context')
    
    echo "$problem_details"
}

# Log RFC 9457 Problem Details error
log_problem_details() {
    local error_code="$1"
    local title="$2"
    local detail="$3"
    local correlation_id="$4"
    local additional_context="${5:-{}}"
    
    local problem_json="$(generate_problem_details "$error_code" "$title" "$detail" "$correlation_id" "$additional_context")"
    
    log_with_correlation "ERROR" "RFC 9457 Problem Details: $error_code" "$correlation_id"
    log_with_correlation "ERROR" "$problem_json" "$correlation_id"
    
    # Also log human-readable format
    log_with_correlation "ERROR" "Title: $title" "$correlation_id"
    log_with_correlation "ERROR" "Detail: $detail" "$correlation_id"
    
    return 1
}

echo "🔄 Ingest Request Polling Worker v2 (Platform-Segmented)"
echo "========================================================"
echo "📍 Polling: ${REQ_PREFIX}/{youtube,instagram,tiktok}/"
echo "📁 Work dir: $WORKDIR"
echo "🎯 VDP Service: $US_T2"
echo "🏷️  Regional Policy: $REQUIRED_REGION (v1.3.1)"
echo "🧩 Platform Segmentation: $PLATFORM_SEGMENTED_PATH"
echo

# Generate master correlation ID for this worker session
MASTER_CORRELATION_ID="$(generate_correlation_id)"

# Validate regional alignment before starting
if ! validate_regional_alignment "$MASTER_CORRELATION_ID"; then
    log_with_correlation "FATAL" "Regional alignment validation failed" "$MASTER_CORRELATION_ID"
    log_with_correlation "FATAL" "Please check configuration and ensure us-central1 alignment" "$MASTER_CORRELATION_ID"
    exit 1
fi
log_with_correlation "INFO" "Worker v2 starting with master correlation ID" "$MASTER_CORRELATION_ID"

if [[ "$ONCE_MODE" == "true" ]]; then
    log_with_correlation "INFO" "Running in single execution mode (--once)" "$MASTER_CORRELATION_ID"
else
    log_with_correlation "INFO" "Starting platform-segmented worker (Ctrl+C to stop)" "$MASTER_CORRELATION_ID"
fi
echo

# ============================================================================
# Platform-Specific Request Discovery
# ============================================================================
get_platform_requests() {
    # YouTube, Instagram, TikTok 디렉토리 개별 폴링
    gsutil ls "${REQ_PREFIX}/youtube/*.json" 2>/dev/null || true
    gsutil ls "${REQ_PREFIX}/instagram/*.json" 2>/dev/null || true  
    gsutil ls "${REQ_PREFIX}/tiktok/*.json" 2>/dev/null || true
}

# ============================================================================
# Request Processing Function
# ============================================================================
process_request() {
    local gcs_path="$1"
    local base="$(basename "$gcs_path")"
    local local_json="${WORKDIR}/${base}"
    
    # Generate correlation ID for this request
    local request_correlation_id="$(generate_correlation_id)"
    export CORRELATION_ID="$request_correlation_id"
    
    # Start performance timer
    local request_start_time="$(start_timer)"
    
    log_with_correlation "INFO" "Processing request: $gcs_path" "$request_correlation_id"
    
    # Download request JSON
    local download_start_time="$(start_timer)"
    if ! gsutil cp "$gcs_path" "$local_json"; then
        local context=$(jq -n \
            --arg gcs_path "$gcs_path" \
            --arg local_path "$local_json" \
            --arg operation "download_request" \
            '{
              "gcs_path": $gcs_path,
              "local_path": $local_path,
              "operation": $operation
            }')
        
        log_problem_details "GCS_DOWNLOAD_FAILED" \
            "GCS download operation failed" \
            "Failed to download request JSON from $gcs_path" \
            "$request_correlation_id" \
            "$context"
        return 1
    fi
    local download_duration="$(calculate_duration "$download_start_time")"
    log_with_correlation "DEBUG" "Request download completed in $download_duration" "$request_correlation_id"
    
    # ① 플랫폼 정규화 (대소문자 통일)
    platform="$(jq -r '.platform // .metadata.platform // empty' "$local_json" | tr '[:upper:]' '[:lower:]')"
    content_id="$(jq -r '.content_id // empty' "$local_json")"
    content_key="$(jq -r '.content_key // empty' "$local_json")"
    
    echo "   Raw platform: $(jq -r '.platform // .metadata.platform // "null"' "$local_json")"
    echo "   Normalized platform: $platform"
    echo "   Content ID: $content_id"
    echo "   Content key: $content_key"
    
    # ② content_id 보정 (null_* 문제 영구 차단)
    if [[ -z "$content_id" && -n "$content_key" ]]; then
        content_id="${content_key#*:}"  # "youtube:ABC" -> "ABC"
        echo "   → Content ID corrected from content_key: $content_id"
    fi
    
    if [[ -z "$content_id" ]]; then
        log_with_correlation "ERROR" "CONTENT_KEY_MISSING: content_id missing after correction attempts" "$request_correlation_id"
        log_with_correlation "ERROR" "Request: $base, Platform: $platform, Content Key: $content_key" "$request_correlation_id"
        return 1
    fi
    
    # Validate content_key format: platform:content_id with comprehensive validation
    if [[ -n "$content_key" ]]; then
        if ! validate_content_key_format "$content_key" "$platform" "$content_id" "$request_correlation_id"; then
            log_with_correlation "ERROR" "Content key validation failed" "$request_correlation_id"
            return 1
        fi
    else
        content_key="${platform}:${content_id}"
        log_with_correlation "INFO" "Generated content_key: $content_key" "$request_correlation_id"
        
        # Validate the generated content_key
        if ! validate_content_key_format "$content_key" "$platform" "$content_id" "$request_correlation_id"; then
            log_with_correlation "ERROR" "Generated content key validation failed" "$request_correlation_id"
            return 1
        fi
    fi
    
    # ③ done 마커 (플랫폼 분리)
    DONE_MARKER="${REQ_PREFIX}/${platform}/.${content_id}.done"
    if gsutil -q stat "$DONE_MARKER" 2>/dev/null; then
        echo "⏭️  Already processed $content_key"
        return 0
    fi
    
    # Extract additional metadata (support both .url and .source_url fields)
    src_url=$(jq -r '.url // .source_url // empty' "$local_json")
    out_gcs=$(jq -r '.outGcsUri // empty' "$local_json")
    
    echo "   Source URL: $src_url"
    echo "   Output GCS: $out_gcs"
    echo "   Platform: $platform"
    
    # Platform-specific processing (convert to lowercase for comparison)
    platform_lower="$(echo "$platform" | tr '[:upper:]' '[:lower:]')"
    case "$platform_lower" in
        "youtube")
            process_youtube_request "$platform" "$content_id" "$src_url" "$out_gcs" "$local_json"
            ;;
        "instagram"|"tiktok")
            process_social_full_pipeline "$platform" "$content_id" "$src_url" "$out_gcs" "$local_json"
            ;;
        *)
            local context=$(jq -n \
                --arg platform "$platform" \
                --arg content_id "$content_id" \
                --arg supported_platforms "youtube|instagram|tiktok" \
                '{
                  "platform": $platform,
                  "content_id": $content_id,
                  "supported_platforms": $supported_platforms
                }')
            
            log_problem_details "PLATFORM_NORMALIZATION_FAILED" \
                "Unknown platform detected" \
                "Platform $platform is not supported" \
                "$request_correlation_id" \
                "$context"
            return 1
            ;;
    esac
    
    # Create done marker only after successful VDP verification for all platforms
    if [[ "$platform_lower" == "youtube" || "$platform_lower" == "instagram" || "$platform_lower" == "tiktok" ]]; then
        # All platforms: Wait for VDP file before creating .done marker
        if wait_for_vdp "$platform" "$content_id" "$request_correlation_id"; then
            echo "✅" | gsutil cp - "$DONE_MARKER"
            log_with_correlation "INFO" "Done marker created after VDP verification" "$request_correlation_id"
        else
            log_with_correlation "WARN" "❌ VDP 미생성 → .done 생략 (다음 폴링 때 재시도 허용)" "$request_correlation_id"
        fi
    else
        # Unknown platform: Create done marker immediately (fallback)
        echo "✅" | gsutil cp - "$DONE_MARKER"
        log_with_correlation "INFO" "Done marker created for unknown platform" "$request_correlation_id"
    fi
    
    # Calculate total processing time and log completion
    local total_duration="$(calculate_duration "$request_start_time")"
    log_with_correlation "INFO" "Request completed successfully in $total_duration" "$request_correlation_id"
    log_with_correlation "INFO" "Content key: $content_key, Platform: $platform, Base: $base" "$request_correlation_id"
    echo "----------------------------------------"
}

# ============================================================================
# VDP Wait Function - Verify VDP exists before creating .done marker
# ============================================================================
wait_for_vdp() {
    local platform="$1"
    local content_id="$2" 
    local correlation_id="$3"
    local guri="gs://${RAW_BUCKET}/raw/vdp/${platform}/${content_id}.NEW.universal.json"
    
    log_with_correlation "DEBUG" "Waiting for VDP file: $guri" "$correlation_id"
    
    for i in $(seq 1 60); do  # 최대 60회(=약 3분) 확인
        if gsutil -q stat "$guri" 2>/dev/null; then
            log_with_correlation "INFO" "✅ VDP ready: $guri" "$correlation_id"
            return 0
        fi
        log_with_correlation "DEBUG" "VDP check $i/60: not ready yet" "$correlation_id"
        sleep 3
    done
    
    log_with_correlation "WARN" "⏰ VDP not ready within timeout: $guri" "$correlation_id"
    return 1
}

# ============================================================================
# YouTube Full Pipeline (Download → Evidence → VDP)
# ============================================================================
process_youtube_request() {
    local platform="$1"
    local content_id="$2"
    local src_url="$3"
    local out_gcs="$4"
    local local_json="$5"
    
    log_with_correlation "INFO" "YouTube processing started" "$CORRELATION_ID"
    log_with_correlation "DEBUG" "Content ID: $content_id, Source: $src_url" "$CORRELATION_ID"
    
    # 플랫폼별 경로 표준화 with comprehensive validation
    local INPUT_MP4="${INPUT_PREFIX}/${platform}/${content_id}.mp4"
    local EVID_DIR="${EVID_PREFIX}/${platform}/"
    local OUT_VDP="${OUT_VDP_PREFIX}/${platform}/${content_id}.NEW.universal.json"
    
    # Comprehensive platform segmentation validation
    if ! validate_platform_segmentation "$INPUT_MP4" "$platform" "input" "$CORRELATION_ID"; then
        log_with_correlation "ERROR" "Platform segmentation validation failed for input path" "$CORRELATION_ID"
        return 1
    fi
    
    if ! validate_platform_segmentation "$OUT_VDP" "$platform" "output" "$CORRELATION_ID"; then
        log_with_correlation "ERROR" "Platform segmentation validation failed for output path" "$CORRELATION_ID"
        return 1
    fi
    
    if ! validate_platform_segmentation "${EVID_DIR}dummy.json" "$platform" "evidence" "$CORRELATION_ID"; then
        log_with_correlation "ERROR" "Platform segmentation validation failed for evidence path" "$CORRELATION_ID"
        return 1
    fi
    
    log_with_correlation "DEBUG" "Platform paths - Input: $INPUT_MP4, Evidence: $EVID_DIR, Output: $OUT_VDP" "$CORRELATION_ID"
    
    # Step 1: Video Download → GCS Upload (yt-dlp)
    echo "📹 Downloading video via yt-dlp: ${src_url}"
    
    if yt-dlp -f "mp4/best[height<=720]" -o - "${src_url}" | gsutil cp - "${INPUT_MP4}"; then
        echo "✅ Video uploaded to: ${INPUT_MP4}"
    else
        echo "❌ Video download failed for: ${src_url}"
        echo "⏸️  Skipping request (may need cookies/auth): ${content_id}"
        return 1
    fi
    
    # Step 2: Evidence Pack Generation/Upload (SKIPPED - Evidence OFF Mode)
    echo "🔍 Evidence Pack Generation SKIPPED (Evidence OFF Mode enabled)"
    echo "   → Evidence mode disabled, proceeding directly to VDP generation"
    
    # Step 3: VDP Generation Trigger (Async)
    echo "🚀 Triggering VDP generation: ${US_T2}"
    
    # Build API request payload with metadata passthrough (GPT-5 Pro CTO Solution)
    api_payload=$(jq -n \
        --arg gcsUri "${INPUT_MP4}" \
        --argjson meta "$(cat "$local_json")" \
        '{
          "gcsUri": $gcsUri,
          "meta": ($meta + {
            "content_id": ($meta.content_id // ""),
            "platform": "YouTube",
            "language": "ko",
            "video_origin": "Real-Footage",
            "original_sound": true
          }),
          "metadata": ($meta.metadata // {}),
          "processing_options": {
            "force_full_pipeline": true,
            "audio_fingerprint": false,
            "brand_detection": false,
            "hook_genome_analysis": true
          },
          "use_vertex": false
        }')
    
    # 🚀 GPT-5 Pro CTO Solution: T3 헬스체크 with VDP-Lite 폴백 (YouTube)
    echo "🔍 Checking T3 health: ${US_T2}/healthz"
    if t3_health=$(curl -sS -m 10 "${US_T2}/healthz" 2>/dev/null) && echo "$t3_health" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
        echo "✅ T3 service healthy, proceeding with full VDP generation"
        
        # Trigger VDP generation with Evidence Pack merger
        if curl_response=$(curl -sS -X POST "${US_T2}/api/vdp/extract-vertex" \
            -H 'Content-Type: application/json' \
            -d "$api_payload" 2>&1); then
            
            echo "✅ VDP generation triggered successfully"
            echo "   Response: $(echo "$curl_response" | jq -r '.overall_analysis.content_summary // .status // "OK"' 2>/dev/null || echo "Response received")"
        else
            echo "❌ VDP generation trigger failed despite healthy T3, falling back to VDP-Lite"
            echo "   Error: $curl_response"
            
            # VDP-Lite 폴백: 메타데이터만으로 VDP 생성
            write_metadata_vdp "youtube" "$content_id" "$local_json" "$CORRELATION_ID"
        fi
    else
        echo "⚠️ T3 service unhealthy, activating VDP-Lite fallback immediately"
        echo "   Health check result: $t3_health"
        
        # VDP-Lite 폴백: 메타데이터만으로 VDP 생성
        write_metadata_vdp "youtube" "$content_id" "$local_json" "$CORRELATION_ID"
    fi
}

# ============================================================================
# Instagram/TikTok Full Pipeline (Download → VDP)
# ============================================================================
process_social_full_pipeline() {
    local platform="$1"
    local content_id="$2"
    local src_url="$3"
    local out_gcs="$4"
    local local_json="$5"
    
    log_with_correlation "INFO" "Social full pipeline processing started" "$CORRELATION_ID"
    log_with_correlation "DEBUG" "Platform: $platform, Content ID: $content_id, Source: $src_url" "$CORRELATION_ID"
    
    # 플랫폼별 경로 표준화 with comprehensive validation
    local INPUT_MP4="${INPUT_PREFIX}/${platform}/${content_id}.mp4"
    local OUT_VDP="${OUT_VDP_PREFIX}/${platform}/${content_id}.NEW.universal.json"
    
    # Comprehensive platform segmentation validation
    if ! validate_platform_segmentation "$INPUT_MP4" "$platform" "input" "$CORRELATION_ID"; then
        log_with_correlation "ERROR" "Platform segmentation validation failed for input path" "$CORRELATION_ID"
        return 1
    fi
    
    if ! validate_platform_segmentation "$OUT_VDP" "$platform" "output" "$CORRELATION_ID"; then
        log_with_correlation "ERROR" "Platform segmentation validation failed for output path" "$CORRELATION_ID"
        return 1
    fi
    
    log_with_correlation "DEBUG" "Platform paths - Input: $INPUT_MP4, Output: $OUT_VDP" "$CORRELATION_ID"
    
    # Step 1: Video Download → GCS Upload (using simple-web-server.js API)
    echo "📹 Downloading ${platform} video via API: ${src_url}"
    
    # Call the simple-web-server.js download API
    local download_api_url="http://localhost:8080/api/download-social-video"
    local download_payload=$(jq -n \
        --arg url "$src_url" \
        --arg platform "$platform" \
        --arg content_id "$content_id" \
        '{
          "url": $url,
          "platform": $platform,
          "content_id": $content_id
        }')
    
    if download_response=$(curl -sS -X POST "$download_api_url" \
        -H 'Content-Type: application/json' \
        -d "$download_payload" 2>&1); then
        
        echo "✅ Video download API called successfully"
        
        # Check if video file was downloaded and uploaded to GCS
        if gsutil -q stat "$INPUT_MP4" 2>/dev/null; then
            echo "✅ Video uploaded to: ${INPUT_MP4}"
        else
            echo "❌ Video not found at expected location: ${INPUT_MP4}"
            echo "⏸️  Skipping request (download may have failed): ${content_id}"
            return 1
        fi
    else
        echo "❌ Video download API failed for: ${src_url}"
        echo "   Error: $download_response"
        echo "⏸️  Skipping request (API call failed): ${content_id}"
        return 1
    fi
    
    # Step 2: Evidence Pack Generation (SKIPPED - Evidence OFF Mode)
    echo "🔍 Evidence Pack Generation SKIPPED (Evidence OFF Mode enabled)"
    echo "   → Evidence mode disabled, proceeding directly to VDP generation"
    
    # Step 3: VDP Generation Trigger (Async)
    echo "🚀 Triggering VDP generation: ${US_T2}"
    
    # Build API request payload with metadata passthrough (GPT-5 Pro CTO Solution)
    api_payload=$(jq -n \
        --arg gcsUri "${INPUT_MP4}" \
        --argjson meta "$(cat "$local_json")" \
        --arg platform_name "$platform" \
        '{
          "gcsUri": $gcsUri,
          "meta": ($meta + {
            "content_id": ($meta.content_id // ""),
            "platform": $platform_name,
            "language": "ko",
            "video_origin": "Real-Footage",
            "original_sound": true
          }),
          "metadata": ($meta.metadata // {}),
          "processing_options": {
            "force_full_pipeline": true,
            "audio_fingerprint": false,
            "brand_detection": false,
            "hook_genome_analysis": true
          },
          "use_vertex": false
        }')
    
    # 🚀 GPT-5 Pro CTO Solution: T3 헬스체크 with VDP-Lite 폴백
    echo "🔍 Checking T3 health: ${US_T2}/healthz"
    if t3_health=$(curl -sS -m 10 "${US_T2}/healthz" 2>/dev/null) && echo "$t3_health" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
        echo "✅ T3 service healthy, proceeding with full VDP generation"
        
        # Trigger VDP generation
        if curl_response=$(curl -sS -X POST "${US_T2}/api/vdp/extract-vertex" \
            -H 'Content-Type: application/json' \
            -d "$api_payload" 2>&1); then
            
            echo "✅ VDP generation triggered successfully"
            echo "   Response: $(echo "$curl_response" | jq -r '.overall_analysis.content_summary // .status // "OK"' 2>/dev/null || echo "Response received")"
        else
            echo "❌ VDP generation trigger failed despite healthy T3, falling back to VDP-Lite"
            echo "   Error: $curl_response"
            
            # VDP-Lite 폴백: 메타데이터만으로 VDP 생성
            write_metadata_vdp "$platform" "$content_id" "$local_json" "$CORRELATION_ID"
        fi
    else
        echo "⚠️ T3 service unhealthy, activating VDP-Lite fallback immediately"
        echo "   Health check result: $t3_health"
        
        # VDP-Lite 폴백: 메타데이터만으로 VDP 생성
        write_metadata_vdp "$platform" "$content_id" "$local_json" "$CORRELATION_ID"
    fi
}

# ============================================================================
# Instagram/TikTok Metadata-Only Processing (LEGACY - kept for fallback)
# ============================================================================
process_social_metadata_only() {
    local platform="$1"
    local content_id="$2"
    local local_json="$3"
    
    log_with_correlation "INFO" "Social metadata processing started" "$CORRELATION_ID"
    log_with_correlation "DEBUG" "Platform: $platform, Content ID: $content_id" "$CORRELATION_ID"
    
    local processing_start_time="$(start_timer)"
    
    # Metadata staging path (platform-specific) with comprehensive validation
    local staging_path="gs://${RAW_BUCKET}/staging/social_metadata/${platform}/${content_id}.metadata.json"
    
    # Comprehensive platform segmentation validation
    if ! validate_platform_segmentation "$staging_path" "$platform" "staging" "$CORRELATION_ID"; then
        log_with_correlation "ERROR" "Platform segmentation validation failed for staging path" "$CORRELATION_ID"
        return 1
    fi
    
    # Validate regional alignment for staging bucket
    if [[ "$RAW_BUCKET" != *"-central1" ]]; then
        log_with_correlation "ERROR" "BUCKET_REGION_MISMATCH: Staging bucket not in required region" "$CORRELATION_ID"
        log_with_correlation "ERROR" "Expected: *-central1, Current: $RAW_BUCKET" "$CORRELATION_ID"
        return 1
    fi
    
    log_with_correlation "DEBUG" "Platform paths - Staging: $staging_path" "$CORRELATION_ID"
    
    # Enhanced metadata with platform context and correlation tracking
    local metadata_start_time="$(start_timer)"
    enhanced_metadata=$(jq \
        --arg platform "$platform" \
        --arg content_key "${platform}:${content_id}" \
        --arg processing_timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
        --arg correlation_id "$CORRELATION_ID" \
        --arg region "$REQUIRED_REGION" \
        '. + {
          "platform": $platform,
          "content_key": $content_key,
          "processing_metadata": {
            "processed_at": $processing_timestamp,
            "processing_type": "metadata_only",
            "video_download": false,
            "evidence_pack": false,
            "correlation_id": $correlation_id,
            "processing_region": $region,
            "platform_segmented": true
          }
        }' "$local_json")
    local metadata_duration="$(calculate_duration "$metadata_start_time")"
    log_with_correlation "DEBUG" "Metadata enhancement completed in $metadata_duration" "$CORRELATION_ID"
    
    # Handle uploaded MP4 file if present (Instagram/TikTok with file uploads)
    local uploaded_gcs_uri=$(jq -r '.uploaded_gcs_uri // empty' "$local_json")
    if [[ -n "$uploaded_gcs_uri" ]]; then
        log_with_correlation "INFO" "Processing uploaded file: $uploaded_gcs_uri" "$CORRELATION_ID"
        
        # Destination path in raw/input/{platform}/
        local input_file_path="gs://${RAW_BUCKET}/raw/input/${platform}/${content_id}.mp4"
        
        # Validate platform segmentation for input path
        if ! validate_platform_segmentation "$input_file_path" "$platform" "input" "$CORRELATION_ID"; then
            log_with_correlation "ERROR" "Platform segmentation validation failed for input file path" "$CORRELATION_ID"
            return 1
        fi
        
        # Copy uploaded file to raw/input location for T3 processing
        local file_copy_start_time="$(start_timer)"
        if gsutil cp "$uploaded_gcs_uri" "$input_file_path"; then
            local file_copy_duration="$(calculate_duration "$file_copy_start_time")"
            log_with_correlation "INFO" "MP4 file copied to raw/input in $file_copy_duration" "$CORRELATION_ID"
            log_with_correlation "DEBUG" "File copied: $uploaded_gcs_uri → $input_file_path" "$CORRELATION_ID"
            
            # Update metadata with input file path for T3 processing
            enhanced_metadata=$(echo "$enhanced_metadata" | jq \
                --arg input_gcs_uri "$input_file_path" \
                '. + {"gcsUri": $input_gcs_uri}')
        else
            local context=$(jq -n \
                --arg uploaded_gcs_uri "$uploaded_gcs_uri" \
                --arg input_file_path "$input_file_path" \
                --arg platform "$platform" \
                --arg content_id "$content_id" \
                '{
                  "uploaded_gcs_uri": $uploaded_gcs_uri,
                  "input_file_path": $input_file_path,
                  "platform": $platform,
                  "content_id": $content_id
                }')
            
            log_problem_details "FILE_COPY_FAILED" \
                "MP4 file copy failed" \
                "Failed to copy uploaded file to raw/input location" \
                "$CORRELATION_ID" \
                "$context"
            return 1
        fi
    else
        log_with_correlation "DEBUG" "No uploaded file found, metadata-only processing" "$CORRELATION_ID"
    fi
    
    # Upload enhanced metadata to staging
    local upload_start_time="$(start_timer)"
    if echo "$enhanced_metadata" | gsutil cp - "$staging_path"; then
        local upload_duration="$(calculate_duration "$upload_start_time")"
        log_with_correlation "INFO" "Metadata staged successfully in $upload_duration" "$CORRELATION_ID"
        log_with_correlation "DEBUG" "Staging path: $staging_path" "$CORRELATION_ID"
    else
        local context=$(jq -n \
            --arg staging_path "$staging_path" \
            --arg platform "$platform" \
            --arg content_id "$content_id" \
            --arg operation "social_metadata_staging" \
            '{
              "staging_path": $staging_path,
              "platform": $platform,
              "content_id": $content_id,
              "operation": $operation
            }')
        
        log_problem_details "STAGING_UPLOAD_FAILED" \
            "Metadata staging upload failed" \
            "Failed to upload enhanced metadata to staging path" \
            "$CORRELATION_ID" \
            "$context"
        return 1
    fi
    
    # Calculate total processing time and log completion
    local total_duration="$(calculate_duration "$processing_start_time")"
    log_with_correlation "INFO" "Social metadata processing completed in $total_duration" "$CORRELATION_ID"
    log_with_correlation "INFO" "Content key: ${platform}:${content_id}, Platform: $platform" "$CORRELATION_ID"
    
    # Optional: BigQuery staging table insertion tracking
    log_with_correlation "DEBUG" "BigQuery staging metadata available" "$CORRELATION_ID"
    log_with_correlation "DEBUG" "ETL pickup path: $staging_path" "$CORRELATION_ID"
    
    # Note: Actual BigQuery insertion would be handled by separate ETL process
    # This maintains separation of concerns and avoids complex dependencies
}

# ============================================================================
# Cross-Region Access Monitoring
# ============================================================================
# VDP-Lite Fallback Generation (GPT-5 Pro CTO Solution)
# ============================================================================
write_metadata_vdp() {
    local platform="$1"
    local content_id="$2" 
    local local_json="$3"
    local correlation_id="$4"
    
    log_with_correlation "INFO" "🚀 Generating VDP-Lite fallback for ${platform}:${content_id}" "$correlation_id"
    
    # Extract metadata from original request
    local metadata=$(jq '.metadata // {}' "$local_json")
    local source_url=$(jq -r '.source_url // .url // "unknown"' "$local_json")
    local content_key="${platform}:${content_id}"
    
    # Create VDP-Lite structure with real metadata
    local vdp_lite_path="${OUT_VDP_PREFIX}/${platform}/${content_id}.universal.json"
    local vdp_lite=$(jq -n \
        --arg content_id "$content_id" \
        --arg content_key "$content_key" \
        --arg platform "$platform" \
        --arg source_url "$source_url" \
        --argjson metadata "$metadata" \
        --arg correlation_id "$correlation_id" \
        '{
          "content_id": $content_id,
          "content_key": $content_key,
          "metadata": ($metadata + {
            "platform": $platform,
            "language": "ko",
            "video_origin": "Real-Footage"
          }),
          "processing_metadata": {
            "source": "vdp_lite_fallback",
            "engine": "metadata_only",
            "generated_at": (now | strftime("%Y-%m-%dT%H:%M:%S.%fZ")),
            "correlation_id": $correlation_id,
            "reason": "t3_service_unavailable",
            "fallback_type": "immediate_metadata"
          },
          "load_timestamp": (now | strftime("%Y-%m-%dT%H:%M:%S.%fZ")),
          "load_date": (now | strftime("%Y-%m-%d"))
        }')
    
    # Save VDP-Lite to GCS
    if echo "$vdp_lite" | gsutil cp - "$vdp_lite_path"; then
        echo "✅ VDP-Lite generated successfully: $vdp_lite_path"
        log_with_correlation "INFO" "VDP-Lite fallback completed successfully" "$correlation_id"
        
        # Log preserved metadata summary
        local like_count=$(echo "$metadata" | jq -r '.like_count // "unknown"')
        local comment_count=$(echo "$metadata" | jq -r '.comment_count // "unknown"')
        local view_count=$(echo "$metadata" | jq -r '.view_count // "unknown"')
        
        echo "📊 Preserved metadata: ${like_count} likes, ${comment_count} comments, ${view_count} views"
        log_with_correlation "INFO" "Metadata preserved: likes=$like_count, comments=$comment_count, views=$view_count" "$correlation_id"
        
        return 0
    else
        echo "❌ VDP-Lite generation failed"
        log_with_correlation "ERROR" "VDP-Lite fallback generation failed" "$correlation_id"
        return 1
    fi
}

# ============================================================================
monitor_cross_region_access() {
    local service_endpoint="$1"
    local correlation_id="$2"
    
    # Monitor for cross-region service calls
    if [[ "$service_endpoint" == *"us-central1"* || "$service_endpoint" == *"us-east1"* || "$service_endpoint" == *"europe-"* ]]; then
        log_with_correlation "WARNING" "CROSS_REGION_ACCESS_DETECTED: Service call outside required region" "$correlation_id"
        log_with_correlation "WARNING" "Required region: $REQUIRED_REGION, Service: $service_endpoint" "$correlation_id"
        
        # Calculate estimated latency increase
        local estimated_latency="unknown"
        case "$service_endpoint" in
            *"us-central1"*) estimated_latency="+20-40ms" ;;
            *"us-east1"*) estimated_latency="+40-80ms" ;;
            *"europe-"*) estimated_latency="+100-200ms" ;;
        esac
        
        log_with_correlation "INFO" "Estimated latency impact: $estimated_latency" "$correlation_id"
        return 1
    fi
    
    return 0
}

# ============================================================================
# Main Polling Loop with Regional Monitoring
# ============================================================================
iteration=1

while true; do
    # Generate iteration correlation ID
    iteration_correlation_id="$(generate_correlation_id)"
    
    log_with_correlation "DEBUG" "Polling iteration #${iteration} started" "$iteration_correlation_id"
    
    # Monitor VDP service regional alignment
    if ! monitor_cross_region_access "$US_T2" "$iteration_correlation_id"; then
        log_with_correlation "WARNING" "VDP service not in optimal region, performance may be degraded" "$iteration_correlation_id"
    fi
    
    # Get platform-segmented requests (macOS compatible)
    files=()
    while IFS= read -r line; do
        [[ -n "$line" ]] && files+=("$line")
    done < <(get_platform_requests)
    
    if [[ ${#files[@]} -eq 0 || (${#files[@]} -eq 1 && -z "${files[0]}") ]]; then
        log_with_correlation "DEBUG" "No requests found in platform directories" "$iteration_correlation_id"
    else
        log_with_correlation "INFO" "Found ${#files[@]} request(s) to process" "$iteration_correlation_id"
        
        for f in "${files[@]}"; do
            # Skip empty array case
            if [[ -z "$f" ]]; then continue; fi
            
            # Process each request with error tracking
            request_start_time="$(start_timer)"
            if ! process_request "$f"; then
                request_duration="$(calculate_duration "$request_start_time")"
                log_with_correlation "ERROR" "Processing failed after $request_duration" "$iteration_correlation_id"
                log_with_correlation "ERROR" "Failed request: $f" "$iteration_correlation_id"
            else
                request_duration="$(calculate_duration "$request_start_time")"
                log_with_correlation "DEBUG" "Request processed successfully in $request_duration" "$iteration_correlation_id"
            fi
            
            # Cleanup local files
            base="$(basename "$f")"
            rm -f "${WORKDIR}/${base}" "${WORKDIR}/${base}".* 2>/dev/null || true
        done
    fi
    
    # Exit if in once mode
    if [[ "$ONCE_MODE" == "true" ]]; then
        log_with_correlation "INFO" "Single execution completed" "$iteration_correlation_id"
        break
    fi
    
    log_with_correlation "DEBUG" "Iteration #${iteration} completed, sleeping 10 seconds" "$iteration_correlation_id"
    sleep 10
    ((iteration++))
done

log_with_correlation "INFO" "Platform-segmented worker shutdown completed" "$MASTER_CORRELATION_ID"