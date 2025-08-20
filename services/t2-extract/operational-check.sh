#!/bin/bash
# 운영 점검 루틴 - t2-extract 서비스 (v1.4.0)
# 플랫폼 3종 (YouTube/Instagram/TikTok) 대량 적재 전 "한 번에" 전체 시스템 검증

set -e  # 에러 발생 시 즉시 중단

echo "🎯 t2-extract Service Operational Readiness Check"
echo "=================================================="
echo "Date: $(date)"
echo "Region: us-central1"
echo ""

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCORE=0
TOTAL_CHECKS=10
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

print_status() {
    local status=$1
    local message=$2
    local details=${3:-""}
    
    if [[ $status == "pass" ]]; then
        echo -e "  ${GREEN}✅ Pass${NC} - $message"
        [[ -n "$details" ]] && echo -e "     ${BLUE}ℹ️  $details${NC}"
        ((SCORE++))
    elif [[ $status == "warn" ]]; then
        echo -e "  ${YELLOW}⚠️  Warning${NC} - $message"
        [[ -n "$details" ]] && echo -e "     ${YELLOW}⚠️  $details${NC}"
    else
        echo -e "  ${RED}❌ Fail${NC} - $message"
        [[ -n "$details" ]] && echo -e "     ${RED}❌ $details${NC}"
    fi
}

# 1. Cloud Run Service Status
echo "1. Cloud Run Service Status Check..."
if gcloud run services describe t2-vdp --region=us-central1 > "$TEMP_DIR/service_info.yaml" 2>&1; then
    REVISION=$(grep -A 1 "latestReadyRevisionName" "$TEMP_DIR/service_info.yaml" | tail -1 | sed 's/.*: //' | tr -d ' ')
    print_status "pass" "Service active" "Latest revision: $REVISION"
else
    print_status "fail" "Service not found or inaccessible"
fi

# 2. Environment Variables
echo "2. Environment Variables Validation..."
if gcloud run services describe t2-vdp --region=us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[*].name)" > "$TEMP_DIR/env_vars.txt" 2>&1; then
    ENV_COUNT=$(wc -w < "$TEMP_DIR/env_vars.txt")
    REQUIRED_VARS=("PLATFORM_SEGMENTED_PATH" "RAW_BUCKET" "GOLD_BUCKET" "EVIDENCE_MODE" "HOOK_MIN_STRENGTH")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "$var" "$TEMP_DIR/env_vars.txt"; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [[ ${#MISSING_VARS[@]} -eq 0 ]]; then
        print_status "pass" "All required environment variables present" "Total: $ENV_COUNT variables"
    else
        print_status "fail" "Missing required environment variables" "Missing: ${MISSING_VARS[*]}"
    fi
else
    print_status "fail" "Unable to retrieve environment variables"
fi

# 3. ID Token Generation
echo "3. ID Token Generation Test..."
if TOKEN=$(gcloud auth print-identity-token 2>/dev/null); then
    TOKEN_LENGTH=${#TOKEN}
    if [[ $TOKEN_LENGTH -gt 100 ]]; then
        print_status "pass" "ID token generated successfully" "Token length: $TOKEN_LENGTH chars"
    else
        print_status "fail" "ID token too short" "Token length: $TOKEN_LENGTH chars"
    fi
else
    print_status "fail" "Unable to generate ID token"
fi

# 4. Service Health Check
echo "4. Service Health Check..."
if SERVICE_URL=$(gcloud run services describe t2-vdp --region=us-central1 --format="value(status.url)" 2>/dev/null); then
    if [[ -n "$TOKEN" ]]; then
        HTTP_CODE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health" -o "$TEMP_DIR/health_response.txt")
        if [[ $HTTP_CODE == "200" ]]; then
            RESPONSE_TIME=$(curl -s -w "%{time_total}" -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health" -o /dev/null)
            print_status "pass" "Service health check passed" "Response time: ${RESPONSE_TIME}s"
        else
            print_status "fail" "Health check failed" "HTTP $HTTP_CODE"
        fi
    else
        print_status "fail" "No token available for health check"
    fi
else
    print_status "fail" "Unable to retrieve service URL"
fi

# 5. RAW Bucket Access
echo "5. RAW Bucket Access Verification..."
if gsutil ls "gs://tough-variety-raw-central1/raw/vdp/" > "$TEMP_DIR/raw_bucket.txt" 2>&1; then
    OBJECT_COUNT=$(wc -l < "$TEMP_DIR/raw_bucket.txt")
    print_status "pass" "RAW bucket accessible" "Objects found: $OBJECT_COUNT"
else
    print_status "fail" "RAW bucket access failed" "Check permissions and bucket name"
fi

# 6. GOLD Bucket Access
echo "6. GOLD Bucket Access Verification..."
if gsutil ls "gs://tough-variety-gold-central1/" > "$TEMP_DIR/gold_bucket.txt" 2>&1; then
    PARTITION_COUNT=$(grep -c "dt=" "$TEMP_DIR/gold_bucket.txt" || echo "0")
    print_status "pass" "GOLD bucket accessible" "Date partitions: $PARTITION_COUNT"
else
    print_status "fail" "GOLD bucket access failed" "Check permissions and bucket name"
fi

# 7. BigQuery Table Access
echo "7. BigQuery Table Access..."
if bq show tough-variety-466003-c5:vdp_dataset.vdp_gold > "$TEMP_DIR/bq_table.txt" 2>&1; then
    TABLE_SIZE=$(grep -i "numRows" "$TEMP_DIR/bq_table.txt" | sed 's/.*: //' | tr -d ' ')
    print_status "pass" "BigQuery table accessible" "Total rows: ${TABLE_SIZE:-unknown}"
else
    print_status "fail" "BigQuery table access failed" "Check table name and permissions"
fi

# 8. Recent VDP Data
echo "8. Recent VDP Data Validation..."
QUERY="SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE load_date = CURRENT_DATE()"
if RECENT_COUNT=$(bq query --use_legacy_sql=false --format=csv "$QUERY" 2>/dev/null | tail -n1); then
    if [[ $RECENT_COUNT -gt 0 ]]; then
        print_status "pass" "Recent VDP data found" "$RECENT_COUNT records today"
    else
        print_status "warn" "No VDP data today" "This may be normal depending on processing schedule"
    fi
else
    print_status "fail" "Unable to query recent VDP data"
fi

# 9. Hook Genome Integration
echo "9. Hook Genome Integration..."
HOOK_QUERY="SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE JSON_VALUE(overall_analysis, '$.hookGenome.pattern_code') IS NOT NULL AND load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
if HOOK_COUNT=$(bq query --use_legacy_sql=false --format=csv "$HOOK_QUERY" 2>/dev/null | tail -n1); then
    if [[ $HOOK_COUNT -gt 0 ]]; then
        print_status "pass" "Hook Genome integration working" "$HOOK_COUNT records with Hook Genome (7 days)"
    else
        print_status "warn" "No Hook Genome data found" "Check Hook Genome generation pipeline"
    fi
else
    print_status "fail" "Unable to query Hook Genome data"
fi

# 10. Evidence Pack Integration
echo "10. Evidence Pack Integration..."
EVIDENCE_QUERY="SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE evidence_pack IS NOT NULL AND load_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
if EVIDENCE_COUNT=$(bq query --use_legacy_sql=false --format=csv "$EVIDENCE_QUERY" 2>/dev/null | tail -n1); then
    if [[ $EVIDENCE_COUNT -gt 0 ]]; then
        print_status "pass" "Evidence Pack integration working" "$EVIDENCE_COUNT records with Evidence Pack (7 days)"
    else
        print_status "warn" "No Evidence Pack data found" "Check Evidence Pack generation"
    fi
else
    print_status "fail" "Unable to query Evidence Pack data"
fi

# 결과 출력
echo ""
echo "=================================================="
echo "🎯 Final Score: $SCORE/$TOTAL_CHECKS ($(echo "scale=1; $SCORE*100/$TOTAL_CHECKS" | bc -l 2>/dev/null || echo "unknown")%)"

if [[ $SCORE -ge 8 ]]; then
    echo -e "${GREEN}✅ SYSTEM READY FOR PRODUCTION LOAD${NC}"
    echo "   ✓ Ready for multi-platform batch processing"
    echo "   ✓ All critical systems operational"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Proceed with planned batch operations"
    echo "   2. Monitor system performance during load"
    echo "   3. Check processing metrics after completion"
    EXIT_CODE=0
elif [[ $SCORE -ge 6 ]]; then
    echo -e "${YELLOW}⚠️  SYSTEM PARTIALLY READY${NC}"
    echo "   ⚠ Review failing checks before production load"
    echo "   ⚠ Non-critical issues detected"
    echo ""
    echo "📋 Recommended Actions:"
    echo "   1. Review failed checks above"
    echo "   2. Fix critical issues if any"
    echo "   3. Re-run this check before proceeding"
    EXIT_CODE=1
else
    echo -e "${RED}❌ SYSTEM NOT READY${NC}"
    echo "   ❌ Critical issues must be resolved"
    echo "   ❌ DO NOT proceed with production load"
    echo ""
    echo "🔧 Required Actions:"
    echo "   1. Fix all critical failures above"
    echo "   2. Verify service deployment"
    echo "   3. Check authentication and permissions"
    echo "   4. Re-run this check until score >= 8"
    EXIT_CODE=2
fi

echo ""
echo "📊 Detailed Results:"
echo "   Log files: $TEMP_DIR"
echo "   Service URL: ${SERVICE_URL:-unknown}"
echo "   Timestamp: $(date)"
echo "   Region: us-central1"

# 추가 진단 정보
if [[ $SCORE -lt 8 ]]; then
    echo ""
    echo "🔍 Troubleshooting Tips:"
    echo "   • Ensure you're authenticated: gcloud auth login"
    echo "   • Check region setting: gcloud config get-value run/region"
    echo "   • Verify project: gcloud config get-value project"
    echo "   • Check service logs: gcloud run services logs read t2-vdp --region=us-central1"
fi

exit $EXIT_CODE