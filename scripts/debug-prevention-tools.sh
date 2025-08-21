#!/bin/bash
# 🛡️ VDP RAW 시스템 디버그 사전 방지 도구 모음
# 
# 사용법:
#   ./scripts/debug-prevention-tools.sh [명령어]
#
# 명령어:
#   check-env      - 환경변수 완전성 검증
#   check-services - 서비스 상태 검증
#   check-network  - 네트워크 연결 검증
#   check-resources - 리소스 상태 검증
#   check-permissions - 권한 검증
#   comprehensive  - 전체 시스템 종합 진단
#   monitor        - 실시간 모니터링 시작
#   auto-recovery  - 자동 복구 스크립트
#   load-test      - 부하 테스트
#   platform-test  - 플랫폼별 테스트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 환경변수 완전성 검증
check_environment() {
    log_info "🔍 환경변수 완전성 검증 중..."
    
    REQUIRED_VARS=(
        "PROJECT_ID"
        "LOCATION" 
        "RAW_BUCKET"
        "T2_URL"
        "MODEL_NAME"
        "MAX_OUTPUT_TOKENS"
    )
    
    all_good=true
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "$var 환경변수가 설정되지 않음"
            all_good=false
        else
            log_success "$var: ${!var}"
        fi
    done
    
    if [ "$all_good" = true ]; then
        log_success "모든 필수 환경변수 설정 완료"
        return 0
    else
        log_error "환경변수 설정 불완전"
        return 1
    fi
}

# 서비스 상태 검증
check_services() {
    log_info "🔍 서비스 상태 검증 중..."
    
    # T1 서버 헬스체크
    if curl -f http://localhost:8080/readyz > /dev/null 2>&1; then
        log_success "T1 서버 정상 동작"
    else
        log_error "T1 서버 응답 없음 - 서버 시작 필요"
        log_info "실행 명령: node simple-web-server.js"
        return 1
    fi
    
    # T3 엔진 상태 체크
    if curl -f http://localhost:3001/healthz > /dev/null 2>&1; then
        log_success "T3 메인 엔진 정상"
    else
        log_warning "T3 메인 엔진 응답 없음"
    fi
    
    if curl -f http://localhost:8082/healthz > /dev/null 2>&1; then
        log_success "T3 서브 엔진 정상"
    else
        log_warning "T3 서브 엔진 응답 없음"
    fi
    
    return 0
}

# 네트워크 연결 검증
check_network() {
    log_info "🔍 네트워크 연결 검증 중..."
    
    # 기본 네트워크 연결 확인
    if ping -c 3 8.8.8.8 > /dev/null 2>&1; then
        log_success "기본 네트워크 연결 정상"
    else
        log_error "기본 네트워크 연결 실패"
        return 1
    fi
    
    # 플랫폼별 연결 확인
    PLATFORMS=("www.youtube.com" "www.instagram.com" "www.tiktok.com")
    for platform in "${PLATFORMS[@]}"; do
        if nslookup "$platform" > /dev/null 2>&1; then
            log_success "$platform DNS 해결 성공"
        else
            log_warning "$platform DNS 해결 실패"
        fi
    done
    
    # GCP 서비스 접근성 확인
    if gsutil ls gs://$RAW_BUCKET/ > /dev/null 2>&1; then
        log_success "GCS 접근성 확인"
    else
        log_error "GCS 접근성 실패 - gcloud auth 설정 필요"
        return 1
    fi
    
    return 0
}

# 리소스 상태 검증
check_resources() {
    log_info "🔍 리소스 상태 검증 중..."
    
    # 메모리 사용률 확인
    memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$memory_usage < 80" | bc -l) )); then
        log_success "메모리 사용률: ${memory_usage}%"
    else
        log_warning "메모리 사용률 높음: ${memory_usage}%"
    fi
    
    # 디스크 사용률 확인
    disk_usage=$(df /tmp | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 85 ]; then
        log_success "디스크 사용률: ${disk_usage}%"
    else
        log_warning "디스크 사용률 높음: ${disk_usage}%"
    fi
    
    # CPU 사용률 확인
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    if (( $(echo "$cpu_usage < 90" | bc -l) )); then
        log_success "CPU 사용률: ${cpu_usage}%"
    else
        log_warning "CPU 사용률 높음: ${cpu_usage}%"
    fi
    
    return 0
}

# 권한 검증
check_permissions() {
    log_info "🔍 권한 검증 중..."
    
    # 디렉토리 권한 확인
    DIRS=("/tmp" "./jobs/work/" "./extracted_shorts/")
    for dir in "${DIRS[@]}"; do
        if [ -d "$dir" ]; then
            permissions=$(stat -c "%a" "$dir")
            if [ "$permissions" = "755" ] || [ "$permissions" = "777" ]; then
                log_success "$dir 권한 정상: $permissions"
            else
                log_warning "$dir 권한 확인 필요: $permissions"
            fi
        else
            log_warning "$dir 디렉토리 없음"
        fi
    done
    
    # 도구 설치 확인
    if command -v yt-dlp &> /dev/null; then
        log_success "yt-dlp 설치 확인"
    else
        log_error "yt-dlp 미설치 - pip install yt-dlp 필요"
        return 1
    fi
    
    if command -v fpcalc &> /dev/null; then
        log_success "fpcalc 설치 확인"
    else
        log_error "fpcalc 미설치 - chromaprint 설치 필요"
        return 1
    fi
    
    return 0
}

# 전체 시스템 종합 진단
comprehensive_check() {
    log_info "🔧 VDP RAW 시스템 종합 진단 시작..."
    echo "=================================="
    
    local exit_code=0
    
    # 1. 환경변수 검증
    log_info "1. 환경변수 검증..."
    if ! check_environment; then
        exit_code=1
    fi
    
    # 2. 서비스 상태 검증
    log_info "2. 서비스 상태 검증..."
    if ! check_services; then
        exit_code=1
    fi
    
    # 3. 네트워크 연결 검증
    log_info "3. 네트워크 연결 검증..."
    if ! check_network; then
        exit_code=1
    fi
    
    # 4. 리소스 상태 검증
    log_info "4. 리소스 상태 검증..."
    if ! check_resources; then
        exit_code=1
    fi
    
    # 5. 권한 검증
    log_info "5. 권한 검증..."
    if ! check_permissions; then
        exit_code=1
    fi
    
    echo "=================================="
    if [ $exit_code -eq 0 ]; then
        log_success "🔧 종합 진단 완료 - 모든 검사 통과"
    else
        log_error "🔧 종합 진단 완료 - 일부 검사 실패"
    fi
    
    return $exit_code
}

# 실시간 모니터링
start_monitoring() {
    log_info "🔍 실시간 디버그 모니터링 시작..."
    
    # 모니터링 스크립트 생성
    cat > /tmp/debug-monitor.sh << 'EOF'
#!/bin/bash
echo "🔍 실시간 디버그 모니터링 시작..."

# 시스템 리소스 모니터링
while true; do
    echo "=== $(date) ==="
    echo "메모리: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    echo "디스크: $(df -h /tmp | tail -1 | awk '{print $3"/"$2}')"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
    
    # 서비스 상태 확인
    for endpoint in "http://localhost:8080/readyz" "http://localhost:3001/healthz" "http://localhost:8082/healthz"; do
        if curl -f "$endpoint" > /dev/null 2>&1; then
            echo "✅ $endpoint"
        else
            echo "❌ $endpoint"
        fi
    done
    
    echo "---"
    sleep 30
done
EOF
    
    chmod +x /tmp/debug-monitor.sh
    nohup /tmp/debug-monitor.sh > /tmp/monitor.log 2>&1 &
    
    log_success "모니터링 시작됨 (PID: $!)"
    log_info "로그 확인: tail -f /tmp/monitor.log"
}

# 자동 복구 스크립트
auto_recovery() {
    log_info "🔄 자동 복구 스크립트 시작..."
    
    # T1 서버 재시작
    if ! curl -f http://localhost:8080/readyz > /dev/null 2>&1; then
        log_warning "T1 서버 재시작 중..."
        pkill -f "node.*simple-web-server" || true
        sleep 2
        nohup node simple-web-server.js > /tmp/t1-server.log 2>&1 &
        sleep 5
        
        if curl -f http://localhost:8080/readyz > /dev/null 2>&1; then
            log_success "T1 서버 재시작 성공"
        else
            log_error "T1 서버 재시작 실패"
            return 1
        fi
    else
        log_success "T1 서버 정상 동작 중"
    fi
    
    # T3 엔진 상태 확인
    for port in 3001 8082; do
        if ! curl -f http://localhost:$port/healthz > /dev/null 2>&1; then
            log_warning "T3 엔진 (포트 $port) 응답 없음"
        else
            log_success "T3 엔진 (포트 $port) 정상"
        fi
    done
    
    return 0
}

# 부하 테스트
load_test() {
    log_info "🚀 부하 테스트 시작..."
    
    # 동시 요청 테스트
    for i in {1..5}; do
        (
            response=$(curl -s -X POST http://localhost:8080/api/unified-download \
                -H "Content-Type: application/json" \
                -d '{"url":"https://www.youtube.com/shorts/aX5y8wz60ws","platform":"auto"}' \
                -w "%{http_code}")
            
            if [[ "$response" == *"200"* ]]; then
                log_success "요청 $i 성공"
            else
                log_error "요청 $i 실패: $response"
            fi
        ) &
    done
    
    wait
    log_success "✅ 부하 테스트 완료"
}

# 플랫폼별 테스트
platform_test() {
    log_info "🎯 플랫폼별 테스트 시작..."
    
    PLATFORMS=("youtube" "instagram" "tiktok")
    TEST_URLS=(
        "https://www.youtube.com/shorts/aX5y8wz60ws"
        "https://www.instagram.com/p/DLx4668NGGv"
        "https://www.tiktok.com/@user/video/7529657626947374349"
    )
    
    for i in "${!PLATFORMS[@]}"; do
        platform="${PLATFORMS[$i]}"
        url="${TEST_URLS[$i]}"
        
        log_info "테스트 중: $platform"
        log_info "URL: $url"
        
        # 다운로드 테스트
        response=$(curl -s -X POST http://localhost:8080/api/unified-download \
            -H "Content-Type: application/json" \
            -d "{\"url\":\"$url\",\"platform\":\"$platform\"}")
        
        if echo "$response" | grep -q "success"; then
            log_success "$platform 다운로드 성공"
        else
            log_error "$platform 다운로드 실패"
            log_info "응답: $response"
        fi
        
        echo "---"
    done
}

# 메인 함수
main() {
    case "${1:-}" in
        "check-env")
            check_environment
            ;;
        "check-services")
            check_services
            ;;
        "check-network")
            check_network
            ;;
        "check-resources")
            check_resources
            ;;
        "check-permissions")
            check_permissions
            ;;
        "comprehensive")
            comprehensive_check
            ;;
        "monitor")
            start_monitoring
            ;;
        "auto-recovery")
            auto_recovery
            ;;
        "load-test")
            load_test
            ;;
        "platform-test")
            platform_test
            ;;
        *)
            echo "🛡️ VDP RAW 시스템 디버그 사전 방지 도구"
            echo ""
            echo "사용법: $0 [명령어]"
            echo ""
            echo "명령어:"
            echo "  check-env      - 환경변수 완전성 검증"
            echo "  check-services - 서비스 상태 검증"
            echo "  check-network  - 네트워크 연결 검증"
            echo "  check-resources - 리소스 상태 검증"
            echo "  check-permissions - 권한 검증"
            echo "  comprehensive  - 전체 시스템 종합 진단"
            echo "  monitor        - 실시간 모니터링 시작"
            echo "  auto-recovery  - 자동 복구 스크립트"
            echo "  load-test      - 부하 테스트"
            echo "  platform-test  - 플랫폼별 테스트"
            echo ""
            echo "예시:"
            echo "  $0 comprehensive  # 전체 진단"
            echo "  $0 monitor        # 모니터링 시작"
            echo "  $0 auto-recovery  # 자동 복구"
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
