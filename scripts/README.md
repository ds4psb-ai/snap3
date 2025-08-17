# YouTube 댓글 수집 스크립트

YouTube/YouTube Shorts의 베스트 댓글을 직접 API로 수집하는 스크립트입니다.

## 사전 준비

1. `.env.local` 파일에 YouTube API 키가 설정되어 있어야 합니다:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```

2. YouTube Data API v3가 활성화된 Google Cloud Console 프로젝트가 필요합니다.

## 사용 방법

### Bash 스크립트 (권장)

```bash
# 기본 사용법 (5개 댓글)
./scripts/get-youtube-comments.sh "https://www.youtube.com/shorts/Hd1FSSjsEhk"

# 특정 개수 댓글 수집
./scripts/get-youtube-comments.sh "https://www.youtube.com/shorts/Hd1FSSjsEhk" 3

# 일반 YouTube 비디오
./scripts/get-youtube-comments.sh "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 10
```

### Node.js 스크립트

```bash
# 기본 사용법 (5개 댓글)
node scripts/get-youtube-comments.js "https://www.youtube.com/shorts/Hd1FSSjsEhk"

# 특정 개수 댓글 수집
node scripts/get-youtube-comments.js "https://www.youtube.com/shorts/Hd1FSSjsEhk" 3

# JSON 파일로 결과 저장
node scripts/get-youtube-comments.js "https://www.youtube.com/shorts/Hd1FSSjsEhk" 5 --json
```

## 지원하는 URL 형식

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`  
- `https://youtu.be/VIDEO_ID`

## 출력 정보

### 비디오 정보
- 제목
- 채널명
- 조회수
- 좋아요 수
- 댓글 수

### 댓글 정보 (베스트 순)
- 작성자명
- 댓글 내용
- 좋아요 수
- 작성일시

## 특징

- **베스트 댓글 우선**: `order=relevance`로 가장 인기 있는 댓글부터 수집
- **다양한 URL 지원**: YouTube, Shorts, youtu.be 모든 형식 지원
- **깔끔한 출력**: 이모지와 포맷팅으로 가독성 향상
- **오류 처리**: API 오류 및 잘못된 URL에 대한 적절한 처리
- **JSON 출력**: Node.js 버전에서 JSON 파일 저장 기능 지원

## 주의사항

- YouTube Data API의 일일 할당량을 확인하세요
- 비공개 비디오나 댓글이 비활성화된 비디오는 수집할 수 없습니다
- API 키는 안전하게 관리하세요 (공개 저장소에 업로드하지 마세요)

## 트러블슈팅

### 403 Forbidden 오류
- YouTube Data API v3가 Google Cloud Console에서 활성화되었는지 확인
- API 키가 올바른지 확인
- API 키에 YouTube Data API 사용 권한이 있는지 확인

### 404 Not Found 오류
- 비디오 ID가 올바른지 확인
- 비디오가 삭제되거나 비공개 설정되지 않았는지 확인

### 할당량 초과 오류
- Google Cloud Console에서 일일 할당량 확인
- 필요시 할당량 증가 요청