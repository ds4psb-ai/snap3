#!/bin/bash

# TikTok 댓글 수집 스크립트
# 사용법: ./get-tiktok-comments.sh "TikTok_URL"

set -e

# 매개변수 확인
if [ $# -lt 1 ]; then
    echo "사용법: $0 \"TikTok_URL\""
    echo "예시: $0 \"https://www.tiktok.com/@username/video/1234567890\""
    echo "      $0 \"https://vm.tiktok.com/shortcode\""
    exit 1
fi

URL=$1

# TikTok URL 형식 확인
if [[ ! $URL =~ (tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com) ]]; then
    echo "오류: 유효하지 않은 TikTok URL입니다." >&2
    exit 1
fi

echo "TikTok URL: $URL"
echo "========================="

# TikTok Comments Microservice 상태 확인
echo "📡 TikTok 댓글 서비스 확인 중..."
HEALTH_CHECK=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$HEALTH_CHECK" ]; then
    echo "오류: TikTok 댓글 마이크로서비스가 실행되지 않았습니다." >&2
    echo "서비스를 시작하려면: node tiktok-comments-microservice.js" >&2
    exit 1
fi

echo "✅ TikTok 댓글 서비스 정상 작동 중"
echo "========================="

# TikTok 댓글 수집
echo "💬 TikTok 댓글 수집 중..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/comments \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$URL\"}")

# 오류 확인
if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    echo "오류: TikTok 댓글 수집 실패"
    echo "$RESPONSE" | jq -r '.error'
    exit 1
fi

# 비디오 정보 출력
echo "$RESPONSE" | jq -r '
"비디오 ID: " + .videoId +
"\n총 댓글 수: " + (.metadata.total_comments | tostring) + "개" +
"\n수집 시간: " + .metadata.fetched_at +
"\n데이터 소스: " + .metadata.source
'

echo "========================="

# 댓글 정보 포맷팅
echo "💬 댓글 목록:"
echo "$RESPONSE" | jq -r '
.comments[] | 
"👤 @" + .author +
"\n❤️  " + (.likes | tostring) + " 좋아요" +
"\n💬 " + .text +
"\n📅 " + .timestamp +
"\n🆔 " + .id +
"\n" + ("=" * 50)
'

echo "✅ TikTok 댓글 수집 완료!"