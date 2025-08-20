#!/bin/bash
# 통합 운영 점검 실행 스크립트
# 모든 검증을 순차적으로 실행하여 t2-extract 서비스의 운영 준비 상태를 종합적으로 확인

set -e

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# 스크립트 경로
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPERATIONAL_CHECK="$SCRIPT_DIR/operational-check.sh"
PLATFORM_CHECK="$SCRIPT_DIR/test-platform-validation.sh"

echo -e "${BOLD}🎯 t2-extract Service Complete Validation Suite${NC}"
echo "================================================="
echo "Directory: $SCRIPT_DIR"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# 결과 저장 변수
OPERATIONAL_RESULT=""
PLATFORM_RESULT=""
OVERALL_SCORE=0

# 로그 파일 생성
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/validation-$(date +%Y%m%d-%H%M%S).log"

echo "📝 Logging to: $LOG_FILE"
echo ""

# 공통 함수
log_and_echo() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

run_check() {
    local check_name=$1
    local script_path=$2
    local result_var=$3
    
    log_and_echo "${BLUE}🔍 Running $check_name...${NC}"
    log_and_echo "Script: $script_path"
    
    if [[ ! -f "$script_path" ]]; then
        log_and_echo "${RED}❌ Script not found: $script_path${NC}"
        eval "$result_var='SCRIPT_NOT_FOUND'"
        return 1
    fi
    
    if [[ ! -x "$script_path" ]]; then
        log_and_echo "${YELLOW}⚠️  Making script executable: $script_path${NC}"
        chmod +x "$script_path"
    fi
    
    local start_time=$(date +%s)
    local exit_code=0
    
    # 스크립트 실행
    if "$script_path" 2>&1 | tee -a "$LOG_FILE"; then
        exit_code=0
    else
        exit_code=${PIPESTATUS[0]}
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_and_echo ""
    log_and_echo "⏱️  $check_name completed in ${duration}s with exit code $exit_code"
    
    # 결과 판정
    case $exit_code in
        0)
            eval "$result_var='PASS'"
            log_and_echo "${GREEN}✅ $check_name: PASSED${NC}"
            ((OVERALL_SCORE++))
            ;;
        1)
            eval "$result_var='WARN'"
            log_and_echo "${YELLOW}⚠️  $check_name: WARNING${NC}"
            ;;
        *)
            eval "$result_var='FAIL'"
            log_and_echo "${RED}❌ $check_name: FAILED${NC}"
            ;;
    esac
    
    log_and_echo "================================================="
    log_and_echo ""
    
    return $exit_code
}

# 1. 운영 환경 검증
log_and_echo "${BOLD}Phase 1: Operational Environment Check${NC}"
log_and_echo "========================================"
run_check "Operational Readiness" "$OPERATIONAL_CHECK" "OPERATIONAL_RESULT"
OPERATIONAL_EXIT_CODE=$?

# 2. 플랫폼별 기능 검증
log_and_echo "${BOLD}Phase 2: Platform-Specific Validation${NC}"
log_and_echo "======================================"
run_check "Platform Validation" "$PLATFORM_CHECK" "PLATFORM_RESULT"
PLATFORM_EXIT_CODE=$?

# 3. 통합 결과 분석
log_and_echo "${BOLD}📊 Final Validation Summary${NC}"
log_and_echo "============================"
log_and_echo ""

log_and_echo "🔍 Individual Check Results:"

OPERATIONAL_STATUS=""
case $OPERATIONAL_RESULT in 
    'PASS') OPERATIONAL_STATUS="${GREEN}✅ PASSED${NC}" ;; 
    'WARN') OPERATIONAL_STATUS="${YELLOW}⚠️  WARNING${NC}" ;; 
    'FAIL') OPERATIONAL_STATUS="${RED}❌ FAILED${NC}" ;; 
    *) OPERATIONAL_STATUS="${RED}❌ ERROR${NC}" ;; 
esac
log_and_echo "   Operational Environment: $OPERATIONAL_STATUS"

PLATFORM_STATUS=""
case $PLATFORM_RESULT in 
    'PASS') PLATFORM_STATUS="${GREEN}✅ PASSED${NC}" ;; 
    'WARN') PLATFORM_STATUS="${YELLOW}⚠️  WARNING${NC}" ;; 
    'FAIL') PLATFORM_STATUS="${RED}❌ FAILED${NC}" ;; 
    *) PLATFORM_STATUS="${RED}❌ ERROR${NC}" ;; 
esac
log_and_echo "   Platform Validation:     $PLATFORM_STATUS"

log_and_echo ""
log_and_echo "🎯 Overall Score: $OVERALL_SCORE/2 phases passed"

# 최종 결과 및 권장사항
if [[ $OVERALL_SCORE -eq 2 ]]; then
    log_and_echo "${GREEN}🎉 COMPLETE VALIDATION SUCCESSFUL${NC}"
    log_and_echo "${GREEN}✅ System is READY for production deployment${NC}"
    log_and_echo ""
    log_and_echo "🚀 Production Deployment Checklist:"
    log_and_echo "   ✓ All operational checks passed"
    log_and_echo "   ✓ All platform validations passed"
    log_and_echo "   ✓ Ready for large-scale batch processing"
    log_and_echo ""
    log_and_echo "📋 Next Steps:"
    log_and_echo "   1. Update deployment documentation"
    log_and_echo "   2. Set up monitoring alerts"
    log_and_echo "   3. Prepare rollback procedures"
    log_and_echo "   4. Schedule batch processing windows"
    log_and_echo "   5. Notify stakeholders of deployment readiness"
    
    # 환경변수 업데이트 명령어 제공
    log_and_echo ""
    log_and_echo "💡 Environment Update Commands (if needed):"
    log_and_echo "   gcloud run services update t2-vdp \\"
    log_and_echo "     --region=us-central1 \\"
    log_and_echo "     --set-env-vars=PLATFORM_SEGMENTED_PATH=true \\"
    log_and_echo "     --set-env-vars=RAW_BUCKET=tough-variety-raw-central1"
    
    EXIT_CODE=0
    
elif [[ $OVERALL_SCORE -eq 1 ]]; then
    log_and_echo "${YELLOW}⚠️  PARTIAL VALIDATION SUCCESS${NC}"
    log_and_echo "${YELLOW}⚠️  System has some issues but may be deployable${NC}"
    log_and_echo ""
    log_and_echo "📋 Review Required:"
    log_and_echo "   • Check failed validation details above"
    log_and_echo "   • Assess risk vs. business impact"
    log_and_echo "   • Consider staged deployment approach"
    log_and_echo ""
    log_and_echo "🔧 Recommended Actions:"
    log_and_echo "   1. Fix critical issues if any"
    log_and_echo "   2. Monitor closely during deployment"
    log_and_echo "   3. Have rollback plan ready"
    log_and_echo "   4. Consider limited batch sizes initially"
    
    EXIT_CODE=1
    
else
    log_and_echo "${RED}❌ VALIDATION FAILED${NC}"
    log_and_echo "${RED}❌ System is NOT READY for production deployment${NC}"
    log_and_echo ""
    log_and_echo "🚨 Critical Issues Detected:"
    log_and_echo "   • Multiple validation failures"
    log_and_echo "   • Risk of service disruption"
    log_and_echo "   • Data integrity concerns possible"
    log_and_echo ""
    log_and_echo "🔧 Required Actions:"
    log_and_echo "   1. Review all failed checks in detail"
    log_and_echo "   2. Fix infrastructure and configuration issues"
    log_and_echo "   3. Re-deploy service components if needed"
    log_and_echo "   4. Re-run complete validation"
    log_and_echo "   5. Do NOT proceed with production load"
    
    EXIT_CODE=2
fi

# 추가 진단 정보
log_and_echo ""
log_and_echo "📋 Diagnostic Information:"
log_and_echo "   Log File: $LOG_FILE"
log_and_echo "   GCP Project: $(gcloud config get-value project 2>/dev/null || echo 'not set')"
log_and_echo "   GCP Region: $(gcloud config get-value run/region 2>/dev/null || echo 'not set')"
log_and_echo "   Auth Status: $(if gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -1 > /dev/null 2>&1; then echo 'authenticated'; else echo 'not authenticated'; fi)"
log_and_echo "   Service Status: $(gcloud run services describe t2-vdp --region=us-central1 --format='value(status.conditions[0].status)' 2>/dev/null || echo 'unknown')"

# 로그 파일 최종 정리
echo "" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"
echo "Validation completed at: $(date)" >> "$LOG_FILE"
echo "Exit code: $EXIT_CODE" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

log_and_echo ""
log_and_echo "📝 Complete log available at: $LOG_FILE"

exit $EXIT_CODE