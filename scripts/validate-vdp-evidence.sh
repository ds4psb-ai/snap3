#!/usr/bin/env bash
set -euo pipefail

# VDP Evidence Pack 검증 스크립트 v1.0
# BGM 클러스터링, 제품/브랜드 감지, 오디오 지문 검증

VDP_FILE="$1"    # 검증할 VDP JSON 파일
CONTENT_ID="${2:-$(basename "$VDP_FILE" .downloaded.json | sed 's/.*\///g')}"

# 구조화된 로깅 함수
log_event() {
  local level="$1"
  local message="$2"
  local content_id="${3:-$CONTENT_ID}"
  local timestamp=$(date -Iseconds)
  
  # JSON 구조화 로그 (모니터링 시스템 연동)
  echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"content_id\":\"$content_id\",\"message\":\"$message\",\"script\":\"validate-vdp-evidence.sh\"}" >&2
  
  # 사람이 읽기 쉬운 로그
  echo "[$timestamp] $level: $message" >&1
}

# 안전한 JSON 필드 추출 함수
safe_jq() {
  local query="$1"
  local file="$2"
  local default="${3:-null}"
  
  # JSON 구조 검증 후 필드 추출
  if jq empty "$file" 2>/dev/null; then
    jq -r "$query" "$file" 2>/dev/null || echo "$default"
  else
    echo "$default"
  fi
}

# Evidence 검증 결과 요약 함수
evidence_summary() {
  local vdp_file="$1"
  local validation_result="$2"
  
  cat <<EOF
{
  "content_id": "$CONTENT_ID",
  "validation_timestamp": "$(date -Iseconds)",
  "validation_result": "$validation_result",
  "evidence_summary": {
EOF

  # 메타 필수 필드 검증
  local content_id_check=$(safe_jq '.video_id // .content_id // "MISSING"' "$vdp_file" "MISSING")
  local platform_check=$(safe_jq '.platform_context.platform // .platform // "MISSING"' "$vdp_file" "MISSING")
  local scenes_count=$(safe_jq '.scenes | length // 0' "$vdp_file" "0")
  
  cat <<EOF
    "meta_validation": {
      "content_id": "$content_id_check",
      "platform": "$platform_check",
      "scenes_count": $scenes_count,
      "required_fields_present": $([ "$content_id_check" != "MISSING" ] && [ "$platform_check" != "MISSING" ] && [ "$scenes_count" -gt 0 ] && echo "true" || echo "false")
    },
EOF

  # BGM 클러스터링 검증
  local bgm_cluster_id=$(safe_jq '.audio_analysis.same_bgm_cluster_id // .same_bgm_cluster_id // "null"' "$vdp_file" "null")
  local bgm_confidence=$(safe_jq '.audio_analysis.same_bgm_confidence // .same_bgm_confidence // "null"' "$vdp_file" "null")
  local chromaprint_hash=$(safe_jq '.audio_analysis.chromaprint_hash // .chromaprint_hash // "null"' "$vdp_file" "null")
  
  cat <<EOF
    "bgm_validation": {
      "cluster_id": "$bgm_cluster_id",
      "confidence": $bgm_confidence,
      "chromaprint_hash": "$chromaprint_hash",
      "bgm_analysis_present": $([ "$bgm_cluster_id" != "null" ] && echo "true" || echo "false")
    },
EOF

  # 제품/브랜드 감지 검증
  local product_mentions=$(safe_jq '.brand_detection.product_mentions // .product_mentions // "null"' "$vdp_file" "null")
  local brand_metrics=$(safe_jq '.brand_detection.brand_detection_metrics // .brand_detection_metrics // "null"' "$vdp_file" "null")
  local detected_brands=$(safe_jq '.brand_detection.detected_brands // .detected_brands // []' "$vdp_file" "[]")
  local brand_count=$(echo "$detected_brands" | jq 'length // 0' 2>/dev/null || echo "0")
  
  cat <<EOF
    "brand_validation": {
      "product_mentions": $product_mentions,
      "brand_metrics": $brand_metrics,
      "detected_brands_count": $brand_count,
      "brand_detection_present": $([ "$product_mentions" != "null" ] && [ "$brand_metrics" != "null" ] && echo "true" || echo "false")
    },
EOF

  # Hook Genome 검증
  local hook_strength=$(safe_jq '.overall_analysis.hookGenome.strength_score // .hook_genome.strength_score // "null"' "$vdp_file" "null")
  local hook_start=$(safe_jq '.overall_analysis.hookGenome.start_sec // .hook_genome.start_sec // "null"' "$vdp_file" "null")
  local hook_pattern=$(safe_jq '.overall_analysis.hookGenome.pattern_code // .hook_genome.pattern_code // "null"' "$vdp_file" "null")
  
  cat <<EOF
    "hook_validation": {
      "strength_score": $hook_strength,
      "start_sec": $hook_start,
      "pattern_code": "$hook_pattern",
      "hook_gate_pass": $([ "$hook_strength" != "null" ] && [ "$hook_start" != "null" ] && awk "BEGIN {exit !($hook_strength >= 0.70 && $hook_start <= 3.0)}" && echo "true" || echo "false")
    }
EOF

  cat <<EOF
  },
  "recommendations": [
EOF

  # 검증 기반 권장사항
  local recommendations=()
  
  if [ "$content_id_check" = "MISSING" ]; then
    recommendations+=("\"Add content_id field to VDP structure\"")
  fi
  
  if [ "$platform_check" = "MISSING" ]; then
    recommendations+=("\"Add platform information to VDP metadata\"")
  fi
  
  if [ "$scenes_count" -eq 0 ]; then
    recommendations+=("\"Ensure scene analysis is completed\"")
  fi
  
  if [ "$bgm_cluster_id" = "null" ]; then
    recommendations+=("\"Run BGM clustering analysis for content similarity\"")
  fi
  
  if [ "$product_mentions" = "null" ]; then
    recommendations+=("\"Execute brand/product detection analysis\"")
  fi
  
  if [ "$hook_strength" = "null" ] || [ "$hook_start" = "null" ]; then
    recommendations+=("\"Complete Hook Genome analysis\"")
  elif ! awk "BEGIN {exit !($hook_strength >= 0.70 && $hook_start <= 3.0)}"; then
    recommendations+=("\"Hook does not meet quality gates (≥0.70 strength, ≤3s start)\"")
  fi
  
  # 권장사항 출력
  local rec_count=${#recommendations[@]}
  for i in "${!recommendations[@]}"; do
    echo -n "    ${recommendations[$i]}"
    if [ $i -lt $((rec_count - 1)) ]; then
      echo ","
    else
      echo ""
    fi
  done
  
  cat <<EOF
  ]
}
EOF
}

# 메인 검증 로직
main() {
  log_event "INFO" "Starting VDP Evidence validation" "$CONTENT_ID"
  
  # 파일 존재 확인
  if [[ ! -f "$VDP_FILE" ]]; then
    log_event "ERROR" "VDP file not found: $VDP_FILE" "$CONTENT_ID"
    evidence_summary "$VDP_FILE" "FAILED_FILE_NOT_FOUND"
    exit 1
  fi
  
  # JSON 구조 검증
  if ! jq empty "$VDP_FILE" 2>/dev/null; then
    log_event "ERROR" "Invalid JSON structure in VDP file" "$CONTENT_ID"
    evidence_summary "$VDP_FILE" "FAILED_INVALID_JSON"
    exit 1
  fi
  
  log_event "INFO" "VDP file structure validated" "$CONTENT_ID"
  
  # 필수 메타 필드 검증
  local validation_errors=0
  
  # Content ID 검증
  local content_id_field=$(safe_jq '.video_id // .content_id // "MISSING"' "$VDP_FILE" "MISSING")
  if [[ "$content_id_field" = "MISSING" ]]; then
    log_event "WARN" "Missing content_id/video_id field" "$CONTENT_ID"
    ((validation_errors++))
  else
    log_event "INFO" "Content ID validated: $content_id_field" "$CONTENT_ID"
  fi
  
  # Platform 검증
  local platform_field=$(safe_jq '.platform_context.platform // .platform // "MISSING"' "$VDP_FILE" "MISSING")
  if [[ "$platform_field" = "MISSING" ]]; then
    log_event "WARN" "Missing platform field" "$CONTENT_ID"
    ((validation_errors++))
  else
    log_event "INFO" "Platform validated: $platform_field" "$CONTENT_ID"
  fi
  
  # Scenes 검증
  local scenes_count=$(safe_jq '.scenes | length // 0' "$VDP_FILE" "0")
  if [[ "$scenes_count" -eq 0 ]]; then
    log_event "WARN" "No scenes found in VDP" "$CONTENT_ID"
    ((validation_errors++))
  else
    log_event "INFO" "Scenes validated: $scenes_count scenes" "$CONTENT_ID"
  fi
  
  # BGM 클러스터링 검증
  local bgm_cluster_id=$(safe_jq '.audio_analysis.same_bgm_cluster_id // .same_bgm_cluster_id // "null"' "$VDP_FILE" "null")
  local bgm_confidence=$(safe_jq '.audio_analysis.same_bgm_confidence // .same_bgm_confidence // "null"' "$VDP_FILE" "null")
  
  if [[ "$bgm_cluster_id" != "null" ]] && [[ "$bgm_confidence" != "null" ]]; then
    log_event "INFO" "BGM analysis present: cluster_id=$bgm_cluster_id, confidence=$bgm_confidence" "$CONTENT_ID"
  else
    log_event "WARN" "BGM clustering analysis missing or incomplete" "$CONTENT_ID"
    ((validation_errors++))
  fi
  
  # ChromaPrint 지문 검증
  local chromaprint_hash=$(safe_jq '.audio_analysis.chromaprint_hash // .chromaprint_hash // "null"' "$VDP_FILE" "null")
  if [[ "$chromaprint_hash" != "null" ]]; then
    log_event "INFO" "Audio fingerprint present: ${chromaprint_hash:0:16}..." "$CONTENT_ID"
  else
    log_event "WARN" "ChromaPrint audio fingerprint missing" "$CONTENT_ID"
  fi
  
  # 제품/브랜드 감지 검증
  local product_mentions=$(safe_jq '.brand_detection.product_mentions // .product_mentions // "null"' "$VDP_FILE" "null")
  local brand_metrics=$(safe_jq '.brand_detection.brand_detection_metrics // .brand_detection_metrics // "null"' "$VDP_FILE" "null")
  
  if [[ "$product_mentions" != "null" ]] && [[ "$brand_metrics" != "null" ]]; then
    local detected_brands=$(safe_jq '.brand_detection.detected_brands // .detected_brands // []' "$VDP_FILE" "[]")
    local brand_count=$(echo "$detected_brands" | jq 'length // 0' 2>/dev/null || echo "0")
    log_event "INFO" "Brand detection present: $brand_count brands detected" "$CONTENT_ID"
  else
    log_event "WARN" "Brand/product detection analysis missing" "$CONTENT_ID"
    ((validation_errors++))
  fi
  
  # Hook Genome 검증
  local hook_strength=$(safe_jq '.overall_analysis.hookGenome.strength_score // .hook_genome.strength_score // "null"' "$VDP_FILE" "null")
  local hook_start=$(safe_jq '.overall_analysis.hookGenome.start_sec // .hook_genome.start_sec // "null"' "$VDP_FILE" "null")
  
  if [[ "$hook_strength" != "null" ]] && [[ "$hook_start" != "null" ]]; then
    # Hook Gate 검증 (≥0.70 strength, ≤3s start)
    if awk "BEGIN {exit !($hook_strength >= 0.70 && $hook_start <= 3.0)}"; then
      log_event "INFO" "Hook Gate PASSED: strength=$hook_strength, start=$hook_start" "$CONTENT_ID"
    else
      log_event "WARN" "Hook Gate FAILED: strength=$hook_strength, start=$hook_start" "$CONTENT_ID"
      ((validation_errors++))
    fi
  else
    log_event "WARN" "Hook Genome analysis missing or incomplete" "$CONTENT_ID"
    ((validation_errors++))
  fi
  
  # 전체 검증 결과 결정
  local validation_result
  if [[ "$validation_errors" -eq 0 ]]; then
    validation_result="PASSED"
    log_event "SUCCESS" "All Evidence Pack validations passed" "$CONTENT_ID"
  elif [[ "$validation_errors" -le 2 ]]; then
    validation_result="PASSED_WITH_WARNINGS"
    log_event "WARN" "Evidence Pack validation passed with $validation_errors warnings" "$CONTENT_ID"
  else
    validation_result="FAILED"
    log_event "ERROR" "Evidence Pack validation failed with $validation_errors errors" "$CONTENT_ID"
  fi
  
  # 요약 리포트 생성
  echo ""
  echo "=== VDP Evidence Validation Summary ==="
  if evidence_summary "$VDP_FILE" "$validation_result" | jq -C '.' 2>/dev/null; then
    log_event "INFO" "Evidence summary report generated successfully" "$CONTENT_ID"
  else
    log_event "WARN" "Evidence summary report generation failed, showing raw output" "$CONTENT_ID"
    evidence_summary "$VDP_FILE" "$validation_result"
  fi
  
  # 종료 코드 설정
  case "$validation_result" in
    "PASSED") exit 0 ;;
    "PASSED_WITH_WARNINGS") exit 0 ;;
    "FAILED") exit 1 ;;
  esac
}

# 스크립트 실행
main "$@"