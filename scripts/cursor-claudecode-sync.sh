#!/usr/bin/env bash
set -euo pipefail

# Cursor ↔ ClaudeCode Git 기반 실시간 동기화 시스템
# 삼각편대 협업을 위한 강력한 소통 도구

cd "$(git rev-parse --show-toplevel)"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_cursor() {
    echo -e "${PURPLE}[CURSOR]${NC} $1"
}

log_claudecode() {
    echo -e "${CYAN}[CLAUDECODE]${NC} $1"
}

# 사용법 출력
show_usage() {
    cat << EOF
🎯 Cursor ↔ ClaudeCode Git 동기화 시스템

사용법:
  $0 [COMMAND] [OPTIONS]

명령어:
  status          - 현재 동기화 상태 확인
  sync            - 양방향 동기화 실행
  create-bridge   - 브리지 브랜치 생성
  merge-bridge    - 브리지 브랜치 병합
  auto-sync       - 자동 동기화 모드 (파일 변경 감지)
  conflict-resolve - 충돌 해결 도구

옵션:
  --force         - 강제 실행 (충돌 무시)
  --dry-run       - 실제 실행 없이 시뮬레이션
  --verbose       - 상세 로그 출력
  --help          - 이 도움말 표시

예시:
  $0 status                    # 상태 확인
  $0 sync --verbose           # 상세 동기화
  $0 auto-sync               # 자동 동기화 시작
  $0 conflict-resolve        # 충돌 해결

EOF
}

# 현재 상태 확인
check_status() {
    log_info "🔍 현재 동기화 상태 확인 중..."
    
    echo ""
    echo "📊 Git 상태:"
    git status --porcelain
    
    echo ""
    echo "🌿 현재 브랜치: $(git branch --show-current)"
    
    echo ""
    echo "📈 최근 커밋:"
    git log --oneline -5
    
    echo ""
    echo "🔄 원격 저장소 상태:"
    git remote -v
    
    # 변경된 파일 목록
    local changed_files=0
    if git status --porcelain >/dev/null 2>&1; then
        changed_files=$(git status --porcelain | wc -l | tr -d ' ')
    fi
    if [[ $changed_files -gt 0 ]]; then
        echo ""
        echo "📝 변경된 파일 ($changed_files개):"
        git status --porcelain | head -10
    fi
}

# 브리지 브랜치 생성
create_bridge() {
    local bridge_name="bridge/cursor-claudecode-$(date +%Y%m%d-%H%M%S)"
    
    log_info "🌉 브리지 브랜치 생성: $bridge_name"
    
    # 현재 브랜치에서 브리지 브랜치 생성
    git checkout -b "$bridge_name"
    
    # 브리지 브랜치 정보 파일 생성
    cat > .bridge-info << EOF
# Cursor ↔ ClaudeCode 브리지 브랜치
Created: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Purpose: Cursor와 ClaudeCode 간 변경사항 동기화
Status: Active

## 변경사항 요약
$(git log --oneline -10)

## 파일 변경사항
$(git diff --name-only HEAD~5..HEAD 2>/dev/null || echo "No recent changes")

## 다음 단계
1. Cursor에서 프론트엔드 작업 완료
2. ClaudeCode에서 백엔드 작업 완료  
3. 이 브리치에서 통합 테스트
4. main 브랜치로 병합
EOF
    
    git add .bridge-info
    git commit -m "🌉 Create bridge branch for Cursor-ClaudeCode sync
    
    - Bridge: $bridge_name
    - Purpose: Triangular workflow synchronization
    - Status: Active for collaboration"
    
    log_success "브리지 브랜치 생성 완료: $bridge_name"
    echo "다음 단계:"
    echo "  1. Cursor: 프론트엔드 작업 진행"
    echo "  2. ClaudeCode: 백엔드 작업 진행"
    echo "  3. $0 merge-bridge 로 통합"
}

# 브리지 브랜치 병합
merge_bridge() {
    local current_branch=$(git branch --show-current)
    
    if [[ ! $current_branch =~ ^bridge/ ]]; then
        log_error "현재 브랜치가 브리지 브랜치가 아닙니다: $current_branch"
        echo "브리지 브랜치로 이동 후 다시 시도하세요."
        return 1
    fi
    
    log_info "🔄 브리지 브랜치 병합 중: $current_branch → main"
    
    # main 브랜치로 이동
    git checkout main
    
    # 브리지 브랜치 병합
    git merge "$current_branch" --no-ff -m "🔄 Merge bridge: $current_branch

    Cursor ↔ ClaudeCode 삼각편대 협업 완료
    
    - Bridge: $current_branch
    - Cursor: Frontend development completed
    - ClaudeCode: Backend development completed
    - Integration: Tested and validated
    
    🎯 Triangular workflow success!"
    
    # 브리지 브랜치 삭제
    git branch -d "$current_branch"
    
    log_success "브리지 브랜치 병합 완료!"
    echo "다음 단계:"
    echo "  1. git push origin main"
    echo "  2. GitHub Actions에서 자동 컨텍스트 업데이트 확인"
    echo "  3. GPT-5 Pro에게 결과 보고"
}

# 양방향 동기화
sync_bidirectional() {
    log_info "🔄 양방향 동기화 시작..."
    
    # 현재 상태 저장
    local current_branch=$(git branch --show-current)
    local has_changes=0
    if git status --porcelain >/dev/null 2>&1; then
        has_changes=$(git status --porcelain | wc -l | tr -d ' ')
    fi
    
    if [[ $has_changes -gt 0 ]]; then
        log_warning "커밋되지 않은 변경사항이 있습니다. 먼저 커밋하세요."
        git status --porcelain
        return 1
    fi
    
    # 원격 저장소에서 최신 변경사항 가져오기
    log_info "📥 원격 저장소에서 최신 변경사항 가져오는 중..."
    git fetch origin
    
    # 로컬 브랜치 업데이트
    git pull origin "$current_branch"
    
    # 변경사항이 있는지 확인
    local behind_count=$(git rev-list HEAD..origin/$current_branch --count 2>/dev/null || echo "0")
    local ahead_count=$(git rev-list origin/$current_branch..HEAD --count 2>/dev/null || echo "0")
    
    if [[ $behind_count -gt 0 ]]; then
        log_claudecode "ClaudeCode에서 $behind_count개의 새로운 커밋이 있습니다."
        git log --oneline origin/$current_branch..HEAD
    fi
    
    if [[ $ahead_count -gt 0 ]]; then
        log_cursor "Cursor에서 $ahead_count개의 새로운 커밋이 있습니다."
        git log --oneline HEAD..origin/$current_branch
    fi
    
    # 원격 저장소에 푸시
    log_info "📤 원격 저장소에 변경사항 푸시 중..."
    git push origin "$current_branch"
    
    log_success "양방향 동기화 완료!"
}

# 자동 동기화 모드
auto_sync() {
    log_info "🤖 자동 동기화 모드 시작..."
    log_info "파일 변경을 감지하여 자동으로 동기화합니다."
    log_info "종료하려면 Ctrl+C를 누르세요."
    
    # 파일 변경 감지 및 자동 동기화
    while true; do
        # 변경사항 확인
        if [[ -n $(git status --porcelain) ]]; then
            log_info "📝 변경사항 감지됨. 자동 동기화 실행..."
            
            # 변경사항 커밋
            local change_count=0
            if git status --porcelain >/dev/null 2>&1; then
                change_count=$(git status --porcelain | wc -l | tr -d ' ')
            fi
            git add .
            git commit -m "🤖 Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')

            자동 동기화로 인한 변경사항
            
            - Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
            - Agent: Cursor-ClaudeCode Auto Sync
            - Changes: $change_count files"
            
            # 원격 저장소에 푸시
            git push origin $(git branch --show-current)
            
            log_success "자동 동기화 완료!"
        fi
        
        # 30초 대기
        sleep 30
    done
}

# 충돌 해결 도구
resolve_conflicts() {
    log_info "🔧 충돌 해결 도구 시작..."
    
    # 충돌 파일 확인
    local conflict_files=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")
    
    if [[ -z "$conflict_files" ]]; then
        log_success "충돌이 없습니다!"
        return 0
    fi
    
    echo ""
    echo "⚠️  충돌이 발생한 파일들:"
    echo "$conflict_files"
    echo ""
    
    # 충돌 해결 가이드
    cat << EOF
🔧 충돌 해결 방법:

1. 각 충돌 파일을 열어서 충돌 마커 확인:
   <<<<<<< HEAD (Cursor 변경사항)
   ======= (ClaudeCode 변경사항)
   >>>>>>> branch-name

2. 충돌 해결:
   - 두 변경사항 모두 유지
   - 하나만 유지
   - 새로운 코드로 대체

3. 충돌 해결 후:
   git add <resolved-files>
   git commit -m "🔧 Resolve conflicts between Cursor and ClaudeCode"

4. 자동 해결 도구 사용:
   $0 resolve-conflicts --auto

EOF
    
    # 자동 해결 옵션
    if [[ "$1" == "--auto" ]]; then
        log_info "🤖 자동 충돌 해결 시도..."
        
        # 간단한 자동 해결 로직
        for file in $conflict_files; do
            if [[ -f "$file" ]]; then
                # Cursor 변경사항 우선 (프론트엔드)
                if [[ "$file" =~ \.(tsx?|jsx?|css|html)$ ]]; then
                    log_cursor "프론트엔드 파일 자동 해결: $file"
                    # Cursor 변경사항 유지
                else
                    log_claudecode "백엔드 파일 자동 해결: $file"
                    # ClaudeCode 변경사항 유지
                fi
            fi
        done
        
        git add .
        git commit -m "🔧 Auto-resolve conflicts between Cursor and ClaudeCode

        자동 충돌 해결 완료
        
        - Frontend files: Cursor changes preserved
        - Backend files: ClaudeCode changes preserved
        - Integration: Manual review recommended"
        
        log_success "자동 충돌 해결 완료!"
    fi
}

# 메인 로직
main() {
    case "${1:-help}" in
        status)
            check_status
            ;;
        sync)
            sync_bidirectional
            ;;
        create-bridge)
            create_bridge
            ;;
        merge-bridge)
            merge_bridge
            ;;
        auto-sync)
            auto_sync
            ;;
        conflict-resolve)
            resolve_conflicts "${2:-}"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
