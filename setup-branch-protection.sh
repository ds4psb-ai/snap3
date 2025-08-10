#!/bin/bash

# GitHub 브랜치 보호 규칙 설정 스크립트
# 메인 브랜치를 보호하고 병렬 작업이 안전하게 진행되도록 설정

echo "🔒 메인 브랜치 보호 규칙 설정 시작..."

# 저장소 정보 가져오기
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
if [ -z "$REPO" ]; then
    echo "❌ GitHub 저장소 정보를 가져올 수 없습니다."
    echo "먼저 'gh auth login'으로 로그인하고 저장소를 GitHub에 연결하세요."
    exit 1
fi

echo "📦 저장소: $REPO"

# 메인 브랜치 이름 확인
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
echo "🌿 기본 브랜치: $DEFAULT_BRANCH"

# 브랜치 보호 규칙 설정
echo "⚙️ 브랜치 보호 규칙 설정 중..."

# GitHub API를 사용하여 브랜치 보호 규칙 설정
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/$DEFAULT_BRANCH/protection" \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]="Tests" \
  -f required_status_checks[contexts][]="Schemas" \
  -f required_status_checks[contexts][]="Contracts" \
  -f required_status_checks[contexts][]="QA" \
  -f enforce_admins=false \
  -f required_pull_request_reviews[required_approving_review_count]=1 \
  -f required_pull_request_reviews[dismiss_stale_reviews]=true \
  -f required_pull_request_reviews[require_code_owner_reviews]=false \
  -f required_pull_request_reviews[require_last_push_approval]=false \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f block_creations=false \
  -f required_conversation_resolution=true \
  -f lock_branch=false \
  -f allow_fork_syncing=false

if [ $? -eq 0 ]; then
    echo "✅ 브랜치 보호 규칙이 성공적으로 설정되었습니다!"
    echo ""
    echo "📋 설정된 규칙:"
    echo "  • PR 필수 (최소 1명 승인)"
    echo "  • 상태 체크 필수:"
    echo "    - Tests"
    echo "    - Schemas"
    echo "    - Contracts"
    echo "    - QA"
    echo "  • 오래된 리뷰 무효화"
    echo "  • 대화 해결 필수"
    echo "  • 강제 푸시 차단"
    echo "  • 브랜치 삭제 차단"
    echo ""
    echo "🛡️ 메인 브랜치가 이제 보호되고 있습니다!"
else
    echo "❌ 브랜치 보호 규칙 설정 실패"
    echo "GitHub 권한과 저장소 설정을 확인하세요."
fi

# 현재 보호 규칙 확인
echo ""
echo "📊 현재 브랜치 보호 상태 확인:"
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/$DEFAULT_BRANCH/protection" \
  | jq '{
    required_status_checks: .required_status_checks.contexts,
    required_pull_request_reviews: {
      required_approving_review_count: .required_pull_request_reviews.required_approving_review_count,
      dismiss_stale_reviews: .required_pull_request_reviews.dismiss_stale_reviews
    },
    enforce_admins: .enforce_admins.enabled,
    restrictions: .restrictions,
    allow_force_pushes: .allow_force_pushes.enabled,
    allow_deletions: .allow_deletions.enabled,
    required_conversation_resolution: .required_conversation_resolution.enabled
  }'