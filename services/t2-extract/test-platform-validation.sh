#!/bin/bash
# 플랫폼별 VDP 생성 검증 스크립트 (v1.4.0)
# YouTube, Instagram, TikTok 플랫폼 각각에 대한 t2-extract API 검증

set -e

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 설정 변수
PROJECT_ID="tough-variety-466003-c5"
REGION="us-central1"
SERVICE_NAME="t2-vdp"
TIMEOUT=30

echo "🧪 Platform-Specific VDP Generation Validation"
echo "=============================================="
echo "Target Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Timestamp: $(date)"
echo ""

# ID 토큰 생성
echo "🔑 Generating ID Token..."
if ! TOKEN=$(gcloud auth print-identity-token 2>/dev/null); then
    echo -e "${RED}❌ Failed to generate ID token${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# 서비스 URL 가져오기
echo "🌐 Retrieving Service URL..."
if ! SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)" 2>/dev/null); then
    echo -e "${RED}❌ Failed to retrieve service URL${NC}"
    echo "Please check service name and region"
    exit 1
fi

echo "Service URL: $SERVICE_URL"
echo ""

# 테스트 결과 변수
YOUTUBE_RESULT=""
INSTAGRAM_RESULT=""
TIKTOK_RESULT=""
TOTAL_TESTS=3
PASSED_TESTS=0

# 공통 테스트 함수
test_platform() {
    local platform=$1
    local platform_lower=$(echo "$platform" | tr '[:upper:]' '[:lower:]')
    local content_id="TEST_${platform}_$(date +%s)"
    local sample_url=""
    
    case $platform_lower in
        youtube)
            sample_url="https://youtube.com/shorts/dQw4w9WgXcQ"
            ;;
        instagram)
            sample_url="https://instagram.com/reel/ABC123DEF456"
            ;;
        tiktok)
            sample_url="https://tiktok.com/@user/video/7234567890123456789"
            ;;
    esac
    
    echo "📱 Testing $platform Platform..."
    
    # 테스트 요청 JSON 생성
    local test_request=$(cat <<EOF
{
  "gcsUri": "gs://tough-variety-raw-central1/test/sample-${platform_lower}.mp4",
  "meta": {
    "platform": "$platform",
    "language": "ko",
    "content_id": "$content_id",
    "source_url": "$sample_url",
    "video_origin": "Real-Footage"
  }
}
EOF
)
    
    echo "  Request Content ID: $content_id"
    echo "  Request Platform: $platform"
    
    # API 호출
    local temp_response=$(mktemp)
    local http_code
    local response_time
    
    http_code=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Test-Mode: true" \
        --max-time $TIMEOUT \
        "$SERVICE_URL/api/vdp/extract-vertex" \
        -d "$test_request" \
        -o "$temp_response")
    
    response_time=$(curl -s -w "%{time_total}" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Test-Mode: true" \
        --max-time $TIMEOUT \
        "$SERVICE_URL/api/vdp/extract-vertex" \
        -d "$test_request" \
        -o /dev/null 2>/dev/null || echo "timeout")
    
    # 응답 분석
    local result="FAIL"
    local details=""
    
    if [[ $http_code == "200" || $http_code == "202" ]]; then
        # 응답 JSON 검증
        if jq empty "$temp_response" 2>/dev/null; then
            local response_platform=$(jq -r '.metadata.platform // empty' "$temp_response" 2>/dev/null)
            local response_content_id=$(jq -r '.content_id // empty' "$temp_response" 2>/dev/null)
            local hook_genome=$(jq -r '.overall_analysis.hookGenome // empty' "$temp_response" 2>/dev/null)
            
            if [[ "$response_platform" == "$platform" && "$response_content_id" == "$content_id" ]]; then
                result="PASS"
                details="Platform: $response_platform, Content ID: $response_content_id"
                if [[ -n "$hook_genome" && "$hook_genome" != "null" ]]; then
                    details="$details, Hook Genome: ✅"
                else
                    details="$details, Hook Genome: ⚠️"
                fi
                ((PASSED_TESTS++))
            else
                details="Platform mismatch or Content ID mismatch"
            fi
        else
            details="Invalid JSON response"
        fi
    elif [[ $http_code == "400" ]]; then
        local error_code=$(jq -r '.code // "UNKNOWN"' "$temp_response" 2>/dev/null)
        details="Bad Request - Error: $error_code"
    elif [[ $http_code == "401" ]]; then
        details="Authentication failed"
    elif [[ $http_code == "500" ]]; then
        details="Server error"
    else
        details="HTTP $http_code"
    fi
    
    # 결과 출력
    if [[ $result == "PASS" ]]; then
        echo -e "  ${GREEN}✅ $platform Test PASSED${NC}"
        echo -e "     ${BLUE}Response Time: ${response_time}s${NC}"
        echo -e "     ${BLUE}Details: $details${NC}"
    else
        echo -e "  ${RED}❌ $platform Test FAILED${NC}"
        echo -e "     ${RED}HTTP Code: $http_code${NC}"
        echo -e "     ${RED}Details: $details${NC}"
        if [[ -f "$temp_response" ]]; then
            echo -e "     ${YELLOW}Response Preview:${NC}"
            head -3 "$temp_response" | sed 's/^/     /'
        fi
    fi
    
    # 결과 저장
    case $platform_lower in
        youtube)
            YOUTUBE_RESULT=$result
            ;;
        instagram)
            INSTAGRAM_RESULT=$result
            ;;
        tiktok)
            TIKTOK_RESULT=$result
            ;;
    esac
    
    rm -f "$temp_response"
    echo ""
}

# 플랫폼별 테스트 실행
test_platform "YouTube"
test_platform "Instagram" 
test_platform "TikTok"

# 통합 결과 출력
echo "📊 Platform Validation Results"
echo "=============================="
echo -e "YouTube:   $(if [[ $YOUTUBE_RESULT == 'PASS' ]]; then echo -e '${GREEN}✅ PASS${NC}'; else echo -e '${RED}❌ FAIL${NC}'; fi)"
echo -e "Instagram: $(if [[ $INSTAGRAM_RESULT == 'PASS' ]]; then echo -e '${GREEN}✅ PASS${NC}'; else echo -e '${RED}❌ FAIL${NC}'; fi)"
echo -e "TikTok:    $(if [[ $TIKTOK_RESULT == 'PASS' ]]; then echo -e '${GREEN}✅ PASS${NC}'; else echo -e '${RED}❌ FAIL${NC}'; fi)"
echo ""
echo "Overall Score: $PASSED_TESTS/$TOTAL_TESTS ($(echo "scale=1; $PASSED_TESTS*100/$TOTAL_TESTS" | bc -l 2>/dev/null || echo "unknown")%)"

# 최종 결과 및 권장사항
if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo -e "${GREEN}🎉 ALL PLATFORMS VALIDATED${NC}"
    echo "✅ Ready for multi-platform production processing"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Proceed with batch processing for all platforms"
    echo "   2. Monitor processing metrics during load"
    echo "   3. Validate data quality in BigQuery after processing"
    exit 0
elif [[ $PASSED_TESTS -ge 2 ]]; then
    echo -e "${YELLOW}⚠️  PARTIAL PLATFORM VALIDATION${NC}"
    echo "Some platforms passed, others need attention"
    echo ""
    echo "📋 Recommended Actions:"
    echo "   1. Fix failing platform integrations"
    echo "   2. Check platform-specific configurations"
    echo "   3. Re-run validation before full deployment"
    exit 1
else
    echo -e "${RED}❌ PLATFORM VALIDATION FAILED${NC}"
    echo "Critical issues with platform processing"
    echo ""
    echo "🔧 Required Actions:"
    echo "   1. Check service logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
    echo "   2. Verify environment variables and configurations"
    echo "   3. Test individual platform endpoints manually"
    echo "   4. Re-deploy service if necessary"
    exit 2
fi