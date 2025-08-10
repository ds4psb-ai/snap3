#\!/bin/bash

# Branch Protection Setup Script for snap3
# Run with: GH_TOKEN=your_token ./setup-branch-protection.sh

REPO="ds4psb-ai/snap3"
BRANCH="main"

echo "Setting up branch protection for $REPO:$BRANCH"

# Use existing token from git remote URL or environment
TOKEN="${GH_TOKEN:-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}"

curl -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/branches/$BRANCH/protection" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["tests", "schemas", "contracts", "qa-guards"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "required_approving_review_count": 1
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_linear_history": true,
    "allow_squash_merge": true,
    "allow_merge_commit": false,
    "allow_rebase_merge": true
  }'

echo "Branch protection configured\!"
