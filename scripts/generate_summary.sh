#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== 최근 5커밋 요약 ==="
# 최신 5개 커밋 순회
for c in $(git log -n 5 --pretty=format:"%h"); do
  msg=$(git log -1 --pretty=format:"%s" "$c")
  # 변경 통계(파일수/증감 라인) 추출
  stat=$(git diff --shortstat "${c}^" "$c" | sed 's/^ //;s/,//g')
  # 예: "1 file changed 30 insertions(+) 5 deletions(-)" → 보기좋게
  files=$(echo "$stat" | awk '{print $1}')
  adds=$(echo "$stat" | grep -o '[0-9]\+ insertions*(\+)*' | awk '{print $1}' | tr -d '\n')
  dels=$(echo "$stat" | grep -o '[0-9]\+ deletions*(\-)*'  | awk '{print $1}' | tr -d '\n')
  adds=${adds:-0}; dels=${dels:-0}
  echo "$c: $msg (${files:-0} files, +${adds}/-${dels})"
done
echo "======================="