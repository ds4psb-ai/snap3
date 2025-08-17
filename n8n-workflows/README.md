# n8n 워크플로우 자동 메타데이터 수집

## 개요

n8n을 사용하여 YouTube, Instagram, TikTok 플랫폼에서 자동으로 메타데이터와 통계를 수집하는 시스템입니다.

## 아키텍처

```
사용자 URL 입력 → T4 /ingest API → n8n 워크플로우 → 플랫폼 API → VDP 형식으로 정규화 → T2 호출
```

## n8n 워크플로우

### 1. YouTube Data API (`youtube-data-api.json`)

**기능:**
- YouTube Video ID 추출
- YouTube Data API 호출로 통계 수집
- VDP 형식으로 변환

**수집 데이터:**
- 제목, 설명, 채널명
- 조회수, 좋아요, 댓글 수
- 영상 길이, 태그
- 썸네일 정보

**필수 환경 변수:**
```bash
YOUTUBE_API_KEY=your_youtube_api_key
```

### 2. Instagram Graph API/oEmbed (`instagram-oembed.json`)

**기능:**
- Instagram URL 검증
- Graph API (토큰 있을 경우) 또는 oEmbed 호출
- 제한된 메타데이터 수집

**수집 데이터:**
- 작성자명, 캡션
- 썸네일, 차원 정보
- oEmbed HTML 코드

**환경 변수 (선택적):**
```bash
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
```

### 3. TikTok oEmbed + Playwright (`tiktok-scraper.json`)

**기능:**
- TikTok URL 검증 (단축 URL 지원)
- oEmbed로 기본 메타데이터 수집
- Playwright로 통계 데이터 스크래핑 (구현 필요)

**수집 데이터:**
- 작성자명, 제목
- 썸네일 정보
- 통계 (Playwright 구현 시)

## 설치 및 실행

### 1. n8n 실행

```bash
# Docker 방식 (권장)
docker run -it --rm -p 5678:5678 n8nio/n8n

# 또는 npx 방식
N8N_PORT=5678 npx n8n start
```

### 2. 환경 변수 설정

n8n 환경에서 다음 변수들을 설정:

```bash
YOUTUBE_API_KEY=AIzaSy...  # YouTube Data API v3 키
INSTAGRAM_ACCESS_TOKEN=... # Instagram Graph API 토큰 (선택)
```

### 3. 워크플로우 임포트

1. n8n 웹 인터페이스 (http://localhost:5678) 접속
2. 각 JSON 파일을 워크플로우로 임포트
3. 워크플로우 활성화

### 4. 웹훅 엔드포인트

활성화된 워크플로우들은 다음 엔드포인트에서 접근 가능:

- `GET http://localhost:5678/webhook/youtube-metadata?url={YOUTUBE_URL}`
- `GET http://localhost:5678/webhook/instagram-metadata?url={INSTAGRAM_URL}`
- `GET http://localhost:5678/webhook/tiktok-metadata?url={TIKTOK_URL}`

## T4 통합

`/src/lib/metadata-collector/n8n-client.ts`를 통해 T4에서 자동으로 사용됩니다:

```typescript
// URL 입력 시 자동 메타데이터 수집
POST /api/ingest
{
  "type": "url",
  "content": "https://www.youtube.com/watch?v=..."
}

// 응답에 자동 수집된 메타데이터 포함
{
  "id": "ingest-123",
  "autoEnriched": true,
  "platform": "youtube",
  "metadata": {
    "title": "...",
    "statistics": {...},
    "vdp": {...}
  },
  "vdpHeaders": {
    "x-goog-meta-vdp-platform": "youtube",
    "x-goog-meta-vdp-duration": "180",
    ...
  }
}
```

## API 제한 및 주의사항

### YouTube Data API
- **할당량:** 10,000 units/day (무료)
- **비용:** $0.001 per unit (유료)
- **제한:** 공식 API, 안정적

### Instagram Graph API
- **요구사항:** Facebook 앱 토큰 필요
- **제한:** 공개 포스트만, 비즈니스 계정 우선
- **대안:** oEmbed (제한된 데이터)

### TikTok
- **공식 API:** 제한적, 파트너만 접근
- **oEmbed:** 기본 메타데이터만
- **스크래핑:** Playwright 필요, ToS 주의

## 에러 처리

각 워크플로우는 graceful degradation을 지원:

- API 실패 시 오류 정보 반환
- 부분적 데이터라도 VDP 형식으로 정규화
- 신뢰도 점수 포함 (`confidence: 0.6-0.95`)

## 개발 및 확장

### 새 플랫폼 추가

1. n8n 워크플로우 생성 (`platform-name.json`)
2. `n8n-client.ts`에 플랫폼 감지 로직 추가
3. VDP 정규화 로직 구현

### Playwright 구현

TikTok 통계 수집을 위해:

1. Playwright node 추가
2. 헤드리스 브라우저로 페이지 로드
3. 통계 element 추출
4. Rate limiting 및 ToS 준수

## 모니터링

- n8n 실행 로그: `tail -f n8n.log`
- 워크플로우 실행 상태: n8n 웹 인터페이스
- API 응답 시간 모니터링 권장