#!/bin/bash
# VDP 배치 처리 스크립트 - 업그레이드된 방식
# 여러 YouTube URL을 한 번에 처리

set -euo pipefail

# 사용법
usage() {
    echo "사용법: $0 <URL_LIST_FILE>"
    echo "예시: $0 urls.txt"
    echo ""
    echo "URL 파일 형식 (한 줄에 하나씩):"
    echo "https://www.youtube.com/shorts/6_I2FmT1mbY"
    echo "https://www.youtube.com/shorts/aPKQzMEd2pw"
    exit 1
}

if [ $# -ne 1 ]; then
    usage
fi

URL_FILE="$1"
if [ ! -f "$URL_FILE" ]; then
    echo "❌ URL 파일을 찾을 수 없습니다: $URL_FILE"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VDP_SCRIPT="${SCRIPT_DIR}/vdp-extract-upgraded.sh"

if [ ! -x "$VDP_SCRIPT" ]; then
    echo "❌ VDP 추출 스크립트를 찾을 수 없습니다: $VDP_SCRIPT"
    exit 1
fi

BATCH_ID=$(date '+%Y%m%d_%H%M%S')
BATCH_DIR="batch_${BATCH_ID}"
mkdir -p "$BATCH_DIR"

echo "📦 VDP 배치 처리 시작"
echo "===================="
echo "📂 배치 ID: $BATCH_ID"
echo "📁 작업 디렉토리: $BATCH_DIR"
echo "📋 URL 파일: $URL_FILE"
echo ""

# URL 개수 확인
TOTAL_URLS=$(wc -l < "$URL_FILE")
echo "📊 처리할 URL 개수: $TOTAL_URLS"
echo ""

# URL 처리
PROCESSED=0
SUCCEEDED=0
FAILED=0

while IFS= read -r url || [ -n "$url" ]; do
    # 빈 줄이나 주석 건너뛰기
    [[ -z "$url" || "$url" =~ ^[[:space:]]*# ]] && continue
    
    PROCESSED=$((PROCESSED + 1))
    echo "🔄 [$PROCESSED/$TOTAL_URLS] 처리 중: $url"
    
    # 각 URL을 별도 디렉토리에서 처리
    VIDEO_ID=$(basename "$url" | sed 's/.*\///')
    WORK_DIR="${BATCH_DIR}/${VIDEO_ID}"
    mkdir -p "$WORK_DIR"
    
    cd "$WORK_DIR"
    
    if "$VDP_SCRIPT" "$url" > "process.log" 2>&1; then
        SUCCEEDED=$((SUCCEEDED + 1))
        echo "  ✅ 성공: $VIDEO_ID"
    else
        FAILED=$((FAILED + 1))
        echo "  ❌ 실패: $VIDEO_ID"
        echo "     로그: $WORK_DIR/process.log"
    fi
    
    cd - > /dev/null
    echo ""
done < "$URL_FILE"

# 결과 요약
echo "📊 배치 처리 완료"
echo "==============="
echo "전체: $PROCESSED"
echo "성공: $SUCCEEDED"
echo "실패: $FAILED"
echo "성공률: $(( SUCCEEDED * 100 / PROCESSED ))%"
echo ""

# 성공한 파일들 수집
echo "📁 성공한 파일들 수집 중..."
COLLECTION_DIR="${BATCH_DIR}/collected_files"
mkdir -p "$COLLECTION_DIR"

find "$BATCH_DIR" -name "*.mp4" -exec cp {} "$COLLECTION_DIR/" \;
find "$BATCH_DIR" -name "*UPGRADED.vdp.json" -exec cp {} "$COLLECTION_DIR/" \;

echo "✅ 모든 파일이 $COLLECTION_DIR 에 수집되었습니다."
echo ""
echo "🎉 배치 처리 완료! 디렉토리: $BATCH_DIR"