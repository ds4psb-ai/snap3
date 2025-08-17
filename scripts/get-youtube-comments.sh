#!/bin/bash

# YouTube 베스트 댓글 수집 스크립트
# 사용법: ./get-youtube-comments.sh "YouTube_URL" [댓글_개수]

set -e

# 환경변수 로드
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# 매개변수 확인
if [ $# -lt 1 ]; then
    echo "사용법: $0 \"YouTube_URL\" [댓글_개수]"
    echo "예시: $0 \"https://www.youtube.com/shorts/Hd1FSSjsEhk\" 5"
    exit 1
fi

URL=$1
MAX_COMMENTS=${2:-5}

# YouTube Video ID 추출
extract_video_id() {
    local url=$1
    # YouTube URL 패턴 매칭
    if [[ $url =~ youtube\.com/watch\?v=([a-zA-Z0-9_-]+) ]]; then
        echo ${BASH_REMATCH[1]}
    elif [[ $url =~ youtube\.com/shorts/([a-zA-Z0-9_-]+) ]]; then
        echo ${BASH_REMATCH[1]}
    elif [[ $url =~ youtu\.be/([a-zA-Z0-9_-]+) ]]; then
        echo ${BASH_REMATCH[1]}
    else
        echo "오류: 유효하지 않은 YouTube URL입니다." >&2
        exit 1
    fi
}

# API 키 확인
if [ -z "$YOUTUBE_API_KEY" ]; then
    echo "오류: YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다." >&2
    exit 1
fi

VIDEO_ID=$(extract_video_id "$URL")
echo "Video ID: $VIDEO_ID"
echo "댓글 수집 개수: $MAX_COMMENTS"
echo "========================="

# 1단계: 비디오 정보 수집
echo "📹 비디오 정보 수집 중..."
VIDEO_INFO=$(curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${VIDEO_ID}&key=${YOUTUBE_API_KEY}")

if echo "$VIDEO_INFO" | jq -e '.error' >/dev/null 2>&1; then
    echo "오류: YouTube API 호출 실패"
    echo "$VIDEO_INFO" | jq '.error.message'
    exit 1
fi

# 비디오 정보 출력
echo "$VIDEO_INFO" | jq -r '
.items[0] | 
"제목: " + .snippet.title +
"\n채널: " + .snippet.channelTitle +
"\n조회수: " + (.statistics.viewCount | tonumber | tostring) + "회" +
"\n좋아요: " + (.statistics.likeCount | tonumber | tostring) + "개" +
"\n댓글수: " + (.statistics.commentCount | tonumber | tostring) + "개"
'

echo "========================="

# 2단계: 베스트 댓글 수집 (relevance 순서로)
echo "💬 베스트 댓글 $MAX_COMMENTS 개 수집 중..."
COMMENTS=$(curl -s "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${VIDEO_ID}&maxResults=${MAX_COMMENTS}&order=relevance&key=${YOUTUBE_API_KEY}")

if echo "$COMMENTS" | jq -e '.error' >/dev/null 2>&1; then
    echo "오류: 댓글 API 호출 실패"
    echo "$COMMENTS" | jq '.error.message'
    exit 1
fi

# 댓글 정보 포맷팅
echo "$COMMENTS" | jq -r '
.items[] | 
"👤 " + .snippet.topLevelComment.snippet.authorDisplayName +
"\n❤️  " + (.snippet.topLevelComment.snippet.likeCount | tostring) + " 좋아요" +
"\n💬 " + (.snippet.topLevelComment.snippet.textDisplay | gsub("<br>"; "\n   ")) +
"\n📅 " + .snippet.topLevelComment.snippet.publishedAt +
"\n" + ("=" * 50)
'

echo "✅ 댓글 수집 완료!"