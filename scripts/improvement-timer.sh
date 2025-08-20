#!/usr/bin/env bash
set -euo pipefail

# 🚨 개선 중독 방지 타이머 시스템

cd "$(git rev-parse --show-toplevel)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
IMPROVEMENT_LIMIT=1800  # 30분 (1800초)
IMPROVEMENT_COUNT_FILE=".git/improvement-count"
IMPROVEMENT_TIME_FILE=".git/improvement-time"

# Initialize counters if not exist
if [[ ! -f "$IMPROVEMENT_COUNT_FILE" ]]; then
    echo "0" > "$IMPROVEMENT_COUNT_FILE"
fi

if [[ ! -f "$IMPROVEMENT_TIME_FILE" ]]; then
    echo "0" > "$IMPROVEMENT_TIME_FILE"
fi

# Functions
start_improvement() {
    local current_count=$(cat "$IMPROVEMENT_COUNT_FILE")
    local new_count=$((current_count + 1))
    
    if [[ $new_count -gt 3 ]]; then
        echo -e "${RED}🚨 개선 한계 초과!${NC}"
        echo -e "${YELLOW}⚠️  더 이상 개선하지 마세요.${NC}"
        echo -e "${BLUE}🎯 실제 VDP 작업을 시작하세요:${NC}"
        echo "   - Instagram 메타데이터 추출기 UI"
        echo "   - Evidence Pack 실제 데이터 생성"
        echo "   - Hook Genome 알고리즘 개선"
        echo "   - BigQuery 적재 최적화"
        return 1
    fi
    
    echo "$new_count" > "$IMPROVEMENT_COUNT_FILE"
    echo "$(date +%s)" > "$IMPROVEMENT_TIME_FILE"
    
    echo -e "${GREEN}⏰ 개선 세션 시작${NC}"
    echo -e "${BLUE}📊 개선 횟수: $new_count/3${NC}"
    echo -e "${YELLOW}⏱️  제한 시간: 30분${NC}"
    echo ""
    echo -e "${PURPLE}💡 기억하세요: Good Enough > Perfect${NC}"
}

check_time() {
    if [[ ! -f "$IMPROVEMENT_TIME_FILE" ]]; then
        echo -e "${YELLOW}⚠️  개선 세션이 시작되지 않았습니다.${NC}"
        echo "   사용법: $0 start"
        return 1
    fi
    
    local start_time=$(cat "$IMPROVEMENT_TIME_FILE")
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    local remaining=$((IMPROVEMENT_LIMIT - elapsed))
    
    if [[ $elapsed -gt $IMPROVEMENT_LIMIT ]]; then
        echo -e "${RED}🚨 개선 시간 초과!${NC}"
        echo -e "${BLUE}📊 소요 시간: $((elapsed/60))분${NC}"
        echo -e "${GREEN}🎯 Production 모드로 전환하세요!${NC}"
        echo ""
        echo -e "${PURPLE}실제 작업 시작:${NC}"
        echo "   1. ./scripts/simple-sync.sh create-bridge"
        echo "   2. Instagram/TikTok UI 개발"
        echo "   3. VDP 데이터 파이프라인 완성"
        return 1
    fi
    
    echo -e "${GREEN}⏰ 개선 진행 중${NC}"
    echo -e "${BLUE}📊 소요 시간: $((elapsed/60))분${NC}"
    echo -e "${YELLOW}⏱️  남은 시간: $((remaining/60))분${NC}"
    
    if [[ $remaining -lt 300 ]]; then  # 5분 남음
        echo -e "${RED}⚠️  곧 시간 종료! 마무리하세요.${NC}"
    fi
}

stop_improvement() {
    if [[ -f "$IMPROVEMENT_TIME_FILE" ]]; then
        local start_time=$(cat "$IMPROVEMENT_TIME_FILE")
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        echo -e "${GREEN}✅ 개선 세션 완료${NC}"
        echo -e "${BLUE}📊 소요 시간: $((elapsed/60))분${NC}"
        
        # 누적 시간 업데이트
        local total_file=".git/improvement-total-time"
        local total_time=$(cat "$total_file" 2>/dev/null || echo "0")
        local new_total=$((total_time + elapsed))
        echo "$new_total" > "$total_file"
        
        echo -e "${PURPLE}📈 총 개선 시간: $((new_total/60))분${NC}"
        
        # 2시간 초과 체크
        if [[ $new_total -gt 7200 ]]; then
            echo -e "${RED}🚨 총 개선 시간 초과! (2시간 한계)${NC}"
            echo -e "${GREEN}🎯 강제 Production 모드 전환!${NC}"
        fi
        
        rm -f "$IMPROVEMENT_TIME_FILE"
    else
        echo -e "${YELLOW}⚠️  진행 중인 개선 세션이 없습니다.${NC}"
    fi
}

show_status() {
    echo -e "${BLUE}📊 개선 중독 방지 시스템 상태${NC}"
    echo "================================"
    
    local current_count=$(cat "$IMPROVEMENT_COUNT_FILE" 2>/dev/null || echo "0")
    local total_time_file=".git/improvement-total-time"
    local total_time=$(cat "$total_time_file" 2>/dev/null || echo "0")
    
    echo -e "${PURPLE}개선 횟수:${NC} $current_count/3"
    echo -e "${PURPLE}총 개선 시간:${NC} $((total_time/60))분/120분"
    
    if [[ -f "$IMPROVEMENT_TIME_FILE" ]]; then
        echo -e "${GREEN}✅ 개선 세션 진행 중${NC}"
        # check_time  # 상태 확인 시에는 타이머 체크 생략
    else
        echo -e "${YELLOW}⏸️  개선 세션 없음${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🎯 Production 모드 체크리스트:${NC}"
    echo "   [x] Git 메시지 송수신"
    echo "   [x] 4터미널 상태 감지"
    echo "   [x] 기본 충돌 방지"
    echo "   [x] 브리지 브랜치 생성/병합"
    echo ""
    echo -e "${GREEN}결론: Good Enough! 실제 작업 시작하세요!${NC}"
}

force_production() {
    echo -e "${RED}🛑 강제 Production 모드 전환!${NC}"
    
    # 모든 개선 관련 파일 리셋
    echo "999" > "$IMPROVEMENT_COUNT_FILE"  # 더 이상 개선 불가
    rm -f "$IMPROVEMENT_TIME_FILE"
    
    echo -e "${GREEN}🎯 실제 작업 시작 체크리스트:${NC}"
    echo ""
    echo "[ ] Instagram/TikTok 메타데이터 추출기 UI 완성"
    echo "[ ] Evidence Pack v2.0 실제 데이터 생성"
    echo "[ ] Hook Genome 정확도 90%+ 달성"
    echo "[ ] BigQuery 적재 성능 최적화"
    echo "[ ] End-to-End 파이프라인 테스트"
    echo ""
    echo -e "${PURPLE}📋 다음 명령어로 실제 작업 시작:${NC}"
    echo "   ./scripts/simple-sync.sh create-bridge"
    echo "   cd ~/snap3 && npm run dev"
    echo "   node simple-web-server.js"
}

# Main command handler
case "${1:-help}" in
    start)
        start_improvement
        ;;
    check)
        check_time
        ;;
    stop)
        stop_improvement
        ;;
    status)
        show_status
        ;;
    force-production)
        force_production
        ;;
    help|--help|-h)
        cat << EOF
🚨 개선 중독 방지 타이머 시스템

Usage:
  $0 start              - 개선 세션 시작 (30분 타이머)
  $0 check              - 남은 시간 확인
  $0 stop               - 개선 세션 완료
  $0 status             - 전체 상태 확인
  $0 force-production   - 강제 Production 모드 전환

Examples:
  $0 start              # 개선 작업 시작
  $0 check              # 시간 확인
  $0 stop               # 개선 완료

🎯 목표: 개선보다 완성!
EOF
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac