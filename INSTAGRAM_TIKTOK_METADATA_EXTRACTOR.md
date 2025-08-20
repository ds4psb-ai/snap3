# Instagram & TikTok 메타데이터 추출기 & 다운로더

## 📋 개요

Instagram과 TikTok의 공개 콘텐츠에서 메타데이터를 추출하고 비디오를 다운로드할 수 있는 통합 플랫폼입니다. 웹 스크래핑 기술을 활용하여 실제 데이터만을 추출하며, 사용자 친화적인 UI를 제공합니다.

## 🏗️ 아키텍처

### 기술 스택
- **Frontend**: Next.js 15.4.6, React, TypeScript
- **UI Framework**: shadcn-ui, Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Next.js API Routes
- **Web Scraping**: Playwright, Fetch API
- **Validation**: Zod
- **State Management**: React useState

### 디렉토리 구조
```
src/
├── app/
│   ├── instagram-extractor/
│   │   └── page.tsx                    # 메인 UI 페이지
│   └── api/
│       ├── instagram/
│       │   ├── metadata/
│       │   │   └── route.ts           # Instagram 메타데이터 추출 API
│       │   └── download/
│       │       └── route.ts           # Instagram 비디오 다운로드 API
│       └── tiktok/
│           ├── metadata/
│           │   └── route.ts           # TikTok 메타데이터 추출 API
│           └── download/
│               └── route.ts           # TikTok 비디오 다운로드 API
└── components/
    └── ui/                            # shadcn-ui 컴포넌트들
```

## 🔧 핵심 기능

### 1. Instagram 메타데이터 추출

#### 추출 가능한 데이터
- **기본 정보**: 제목, 설명, 썸네일 URL
- **통계**: 좋아요 수, 댓글 수
- **작성자**: 사용자명, 표시명, 인증 여부
- **시간**: 업로드 날짜
- **해시태그**: 게시물에 포함된 모든 해시태그
- **댓글**: 상위 댓글 (최대 10개)

#### 추출 방법 (7단계 전략)
1. **Instagram 페이지 스크래핑**: 공개 웹페이지에서 og: 메타태그 추출
2. **JSON-LD 파싱**: 구조화된 데이터에서 정보 추출
3. **window._sharedData 파싱**: Instagram 내부 데이터 구조 분석
4. **인라인 스크립트 파싱**: HTML 내 JavaScript 데이터 추출
5. **HTML 직접 파싱**: DOM 요소에서 직접 데이터 추출
6. **JSON-LD 댓글 추출**: 구조화된 댓글 데이터 파싱
7. **Playwright 헤드리스 브라우저**: 실제 브라우저 환경에서 데이터 추출

#### 데이터 파싱 로직
```typescript
// description 패턴 파싱 예시
// "192K likes, 1,209 comments - hard.clipz - July 6, 2025"
const descMatch = metaData.description.match(/(\d+(?:\.\d+)?[KMB]?) likes?, (\d+(?:,\d+)?) comments? - ([^-]+) - ([^:]+):/);

// K/M/B 단위 변환
if (likeStr.includes('K')) {
  actualLikeCount = Math.round(parseFloat(likeStr.replace('K', '')) * 1000);
} else if (likeStr.includes('M')) {
  actualLikeCount = Math.round(parseFloat(likeStr.replace('M', '')) * 1000000);
}
```

### 2. TikTok 메타데이터 추출

#### 추출 가능한 데이터
- **기본 정보**: 제목, 설명, 썸네일 URL
- **통계**: 조회수, 좋아요 수, 댓글 수, 공유 수
- **작성자**: 사용자명, 팔로워 수
- **시간**: 업로드 날짜, 비디오 길이
- **해시태그**: 비디오에 포함된 모든 해시태그

#### 추출 방법
1. **TikTok 페이지 스크래핑**: 공개 웹페이지에서 데이터 추출
2. **webapp.video-detail 파싱**: TikTok 내부 데이터 구조 분석
3. **JSON-LD 파싱**: 구조화된 데이터에서 정보 추출
4. **og: 메타태그 파싱**: Open Graph 메타데이터 추출

### 3. 비디오 다운로드

#### Instagram 비디오 다운로드
- **방법 1**: Instagram GraphQL API를 통한 직접 다운로드
- **방법 2**: Instagram 페이지에서 비디오 URL 추출
- **방법 3**: oEmbed API를 통한 임베드 정보 제공
- **Fallback**: 서드파티 다운로드 사이트 링크 제공

#### TikTok 비디오 다운로드
- **방법 1**: TIKWM.COM API (JSON 기반)
- **방법 2**: SSSTIK.IO HTML 파싱
- **Fallback**: 서드파티 다운로드 사이트 링크 제공

## 📊 데이터 구조

### Instagram 메타데이터
```typescript
interface InstagramMetadata {
  content_id: string;                    // IG_{shortcode}
  platform: 'instagram';
  metadata: {
    platform: 'instagram';
    source_url: string;                  // 원본 URL
    video_origin: 'Real-Footage';
    cta_types: string[];                 // ['like', 'comment', 'share', 'follow']
    original_sound: boolean;
    hashtags: string[];                  // 추출된 해시태그들
    top_comments: Array<{               // 상위 댓글 (최대 10개)
      username: string;
      text: string;
      like_count: number;
      timestamp: string;
    }>;
    view_count: number | null;           // Instagram은 공개하지 않음
    like_count: number;                  // 실제 좋아요 수
    comment_count: number;               // 실제 댓글 수
    share_count: number | null;          // Instagram은 공개하지 않음
    upload_date: string;                 // ISO 8601 형식
    title: string;                       // 게시물 제목
    thumbnail_url: string;               // 썸네일 이미지 URL
    width: number;                       // 이미지/비디오 너비
    height: number;                      // 이미지/비디오 높이
    author?: {                          // 작성자 정보
      username: string;
      display_name: string;
      verified: boolean;
      followers: number;
    };
    is_video?: boolean;                  // 비디오 여부
  };
  scraped_data?: any;                   // 원본 스크래핑 데이터
  source: string;                       // 'web_scraping' | 'oembed_api' | 'fallback'
  error?: string;                       // 오류 메시지
  meta?: {                             // 다운로드 관련 메타데이터
    downloadLinks?: Array<{
      name: string;
      url: string;
    }>;
    message?: string;
  };
}
```

### TikTok 메타데이터
```typescript
interface TikTokMetadata {
  id: string;                           // TikTok 비디오 ID
  title: string;                        // 비디오 제목
  author: string;                       // 작성자 사용자명
  upload_date: string;                  // 업로드 날짜
  view_count: number;                   // 조회수
  like_count: number;                   // 좋아요 수
  comment_count: number;                // 댓글 수
  share_count: number;                  // 공유 수
  hashtags: string[];                   // 해시태그들
  top_comments: Array<{                // 상위 댓글
    author: string;
    text: string;
    like_count: number;
  }>;
  thumbnail_url: string;                // 썸네일 URL
  duration: number;                     // 비디오 길이 (초)
  followers: number;                    // 작성자 팔로워 수
  scraped_data: any;                   // 원본 스크래핑 데이터
  source: string;                      // 'web_scraping' | 'fallback'
  error?: string;                      // 오류 메시지
  meta?: {                            // 다운로드 관련 메타데이터
    downloadLinks?: Array<{
      name: string;
      url: string;
    }>;
    message?: string;
  };
}
```

## 🎨 사용자 인터페이스

### 메인 페이지 (`/instagram-extractor`)
- **탭 기반 레이아웃**: Instagram과 TikTok 섹션 분리
- **URL 입력 필드**: 각 플랫폼별 URL 입력
- **메타데이터 추출 버튼**: 실시간 데이터 추출
- **비디오 다운로드 버튼**: 워터마크 없는 비디오 다운로드

### 데이터 표시
- **구조화된 카드**: 메타데이터를 카테고리별로 정리
- **실시간 통계**: 좋아요, 댓글, 조회수 등을 시각적으로 표시
- **해시태그 배지**: 추출된 해시태그를 배지 형태로 표시
- **댓글 섹션**: 상위 댓글을 사용자 친화적으로 표시
- **원본 데이터**: JSON 형태의 원본 스크래핑 데이터 제공

### 오류 처리
- **사용자 친화적 메시지**: 기술적 오류를 이해하기 쉬운 메시지로 변환
- **Fallback 표시**: 댓글 추출 실패 시 안내 메시지 표시
- **로딩 상태**: 추출 및 다운로드 진행 상황 표시

## 🔒 보안 및 제한사항

### Instagram 제한사항
- **댓글 추출**: Instagram의 강력한 보안 정책으로 인해 제한적
- **조회수/공유수**: 공개적으로 제공되지 않음 (null 처리)
- **Rate Limiting**: 과도한 요청 시 429 오류 발생 가능
- **봇 탐지**: 자동화된 접근 감지 및 차단 가능

### TikTok 제한사항
- **댓글 추출**: 공개 페이지에서 제한적
- **비디오 다운로드**: 서드파티 API 의존
- **Rate Limiting**: API 호출 제한
- **지역 제한**: 일부 콘텐츠는 지역별로 차단 가능

### 보안 조치
- **User-Agent 위장**: 실제 브라우저로 위장
- **헤더 최적화**: Accept, Referer, Origin 등 브라우저 헤더 사용
- **캐시 제어**: Cache-Control, Pragma 헤더로 최신 데이터 보장
- **오류 처리**: 민감한 정보 노출 방지

## 🚀 성능 최적화

### 스크래핑 최적화
- **병렬 처리**: 여러 추출 방법을 동시에 시도
- **Fallback 체인**: 실패 시 다음 방법으로 자동 전환
- **캐싱**: 5분간 스크래핑 결과 캐시
- **타임아웃**: 30초 요청 타임아웃 설정

### UI 최적화
- **지연 로딩**: 필요 시에만 데이터 로드
- **상태 관리**: 로딩, 성공, 오류 상태 효율적 관리
- **메모리 최적화**: 불필요한 리렌더링 방지

## 📈 모니터링 및 로깅

### 로그 레벨
- **INFO**: 정상적인 추출 과정
- **WARN**: 부분적 실패 또는 fallback 사용
- **ERROR**: 완전한 실패 또는 예외 상황

### 성능 메트릭
- **응답 시간**: API 응답 시간 모니터링
- **성공률**: 각 추출 방법별 성공률 추적
- **오류율**: 플랫폼별 오류 발생률

## 🔧 설치 및 실행

### 필수 패키지
```bash
npm install playwright
npx playwright install chromium
```

### 개발 서버 실행
```bash
npm run dev
```

### 접속 URL
- **메인 페이지**: http://localhost:3000/instagram-extractor
- **API 엔드포인트**: 
  - POST `/api/instagram/metadata`
  - POST `/api/instagram/download`
  - POST `/api/tiktok/metadata`
  - POST `/api/tiktok/download`

## 📝 API 사용법

### Instagram 메타데이터 추출
```bash
curl -X POST http://localhost:3000/api/instagram/metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/DLx4668NGGv/"}'
```

### TikTok 메타데이터 추출
```bash
curl -X POST http://localhost:3000/api/tiktok/metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@username/video/1234567890"}'
```

### Instagram 비디오 다운로드
```bash
curl -X POST http://localhost:3000/api/instagram/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/DLx4668NGGv/"}'
```

### TikTok 비디오 다운로드
```bash
curl -X POST http://localhost:3000/api/tiktok/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@username/video/1234567890"}'
```

## 🎯 핵심 성과

### 데이터 정확성
- **100% 실제 데이터**: Mock 데이터 완전 제거
- **정확한 파싱**: K/M/B 단위 정확한 변환
- **실제 작성자**: description에서 정확한 사용자명 추출
- **실제 날짜**: 업로드 날짜 정확한 파싱

### 사용자 경험
- **직관적 UI**: 탭 기반 레이아웃으로 플랫폼 구분
- **실시간 피드백**: 로딩 상태 및 오류 메시지 제공
- **완전한 정보**: 메타데이터와 원본 데이터 모두 제공
- **다운로드 지원**: 워터마크 없는 비디오 다운로드

### 기술적 안정성
- **7단계 추출 전략**: 높은 성공률 보장
- **Playwright 통합**: 실제 브라우저 환경 시뮬레이션
- **오류 처리**: 견고한 예외 처리 및 fallback
- **성능 최적화**: 캐싱 및 병렬 처리

## 🔮 향후 개선 계획

### 기능 확장
- **YouTube 지원**: YouTube Shorts 메타데이터 추출
- **배치 처리**: 여러 URL 동시 처리
- **데이터 내보내기**: CSV, JSON 형식으로 내보내기
- **API 키 지원**: 공식 API 키를 통한 더 안정적인 추출

### 성능 개선
- **Redis 캐싱**: 분산 캐싱 시스템 도입
- **CDN 최적화**: 정적 자원 CDN 배포
- **데이터베이스**: 추출 이력 및 통계 저장
- **모니터링**: 실시간 성능 모니터링 대시보드

### 보안 강화
- **Rate Limiting**: 사용자별 요청 제한
- **API 키 인증**: 인증된 사용자만 접근 가능
- **프록시 로테이션**: IP 차단 방지
- **암호화**: 민감한 데이터 암호화 저장

---

**버전**: v3.0.0  
**최종 업데이트**: 2025년 8월 20일  
**상태**: Production Ready
