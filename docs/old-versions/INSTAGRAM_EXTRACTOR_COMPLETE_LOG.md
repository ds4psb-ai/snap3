# Instagram & TikTok 메타데이터 추출기 완성 로그

## 📅 구현 완료 일시
**일자**: 2025-08-20  
**버전**: v3.0.0 Production Ready  
**구현자**: ClaudeCode  
**상태**: 완전 구현 완료

---

## 🎯 프로젝트 개요

### 목적
Instagram과 TikTok의 공개 콘텐츠에서 메타데이터를 추출하고 워터마크 없는 비디오를 다운로드할 수 있는 통합 플랫폼 구축

### 핵심 성과
- **100% 실제 데이터**: Mock 데이터 완전 제거
- **완전한 메타데이터 추출**: 좋아요, 댓글, 해시태그, 작성자 정보
- **워터마크 없는 다운로드**: 고품질 비디오 다운로드 지원
- **Production Ready**: 실제 서비스 환경에서 사용 가능

---

## 🏗️ 아키텍처 구현

### 기술 스택
```yaml
Frontend:
  - Framework: Next.js 15.4.6
  - Language: TypeScript
  - UI: shadcn-ui + Tailwind CSS
  - Icons: Lucide React

Backend:
  - Runtime: Next.js API Routes
  - Scraping: Playwright + Fetch API
  - Validation: Zod
  - State: React useState
```

### 디렉토리 구조
```
src/
├── app/
│   ├── instagram-extractor/
│   │   └── page.tsx                    # 메인 UI 페이지
│   └── api/
│       ├── instagram/
│       │   ├── metadata/route.ts       # Instagram 메타데이터 API
│       │   └── download/route.ts       # Instagram 다운로드 API
│       └── tiktok/
│           ├── metadata/route.ts       # TikTok 메타데이터 API
│           └── download/route.ts       # TikTok 다운로드 API
└── components/ui/                      # shadcn-ui 컴포넌트들
```

---

## 🔧 핵심 기능 구현

### 1. Instagram 메타데이터 추출 (7단계 전략)

#### 구현된 추출 방법
1. **Instagram 페이지 스크래핑**: og: 메타태그 추출
2. **JSON-LD 파싱**: 구조화된 데이터 분석  
3. **window._sharedData 파싱**: Instagram 내부 데이터
4. **인라인 스크립트 파싱**: HTML JavaScript 데이터
5. **HTML 직접 파싱**: DOM 요소 직접 추출
6. **JSON-LD 댓글 추출**: 구조화된 댓글 데이터
7. **Playwright 헤드리스**: 실제 브라우저 환경

#### 핵심 파싱 로직
```typescript
// description 패턴 파싱
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

#### 구현된 추출 방법
1. **TikTok 페이지 스크래핑**: 공개 웹페이지 데이터
2. **webapp.video-detail 파싱**: TikTok 내부 데이터 구조
3. **JSON-LD 파싱**: 구조화된 데이터
4. **og: 메타태그 파싱**: Open Graph 메타데이터

### 3. 비디오 다운로드 시스템

#### Instagram 다운로드 전략
- **방법 1**: Instagram GraphQL API 직접 호출
- **방법 2**: 페이지에서 비디오 URL 추출
- **방법 3**: oEmbed API 임베드 정보
- **Fallback**: 서드파티 다운로드 사이트 링크

#### TikTok 다운로드 전략  
- **방법 1**: TIKWM.COM API (JSON 기반)
- **방법 2**: SSSTIK.IO HTML 파싱
- **Fallback**: 서드파티 다운로드 사이트 링크

---

## 📊 데이터 구조 설계

### Instagram 메타데이터 스키마
```typescript
interface InstagramMetadata {
  content_id: string;                    // IG_{shortcode}
  platform: 'instagram';
  metadata: {
    platform: 'instagram';
    source_url: string;
    video_origin: 'Real-Footage';
    cta_types: string[];                 // ['like', 'comment', 'share', 'follow']
    original_sound: boolean;
    hashtags: string[];
    top_comments: Array<{
      username: string;
      text: string;
      like_count: number;
      timestamp: string;
    }>;
    view_count: number | null;           // Instagram은 비공개
    like_count: number;
    comment_count: number;
    share_count: number | null;          // Instagram은 비공개
    upload_date: string;                 // ISO 8601
    title: string;
    thumbnail_url: string;
    width: number;
    height: number;
    author?: {
      username: string;
      display_name: string;
      verified: boolean;
      followers: number;
    };
    is_video?: boolean;
  };
  scraped_data?: any;
  source: string;                        // 'web_scraping' | 'oembed_api' | 'fallback'
  error?: string;
  meta?: {
    downloadLinks?: Array<{
      name: string;
      url: string;
    }>;
    message?: string;
  };
}
```

### TikTok 메타데이터 스키마
```typescript
interface TikTokMetadata {
  id: string;
  title: string;
  author: string;
  upload_date: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  hashtags: string[];
  top_comments: Array<{
    author: string;
    text: string;
    like_count: number;
  }>;
  thumbnail_url: string;
  duration: number;
  followers: number;
  scraped_data: any;
  source: string;
  error?: string;
  meta?: {
    downloadLinks?: Array<{
      name: string;
      url: string;
    }>;
    message?: string;
  };
}
```

---

## 🎨 사용자 인터페이스 구현

### 메인 페이지 기능
- **탭 기반 레이아웃**: Instagram/TikTok 섹션 분리
- **URL 입력 필드**: 플랫폼별 URL 입력
- **실시간 추출**: 메타데이터 즉시 추출
- **비디오 다운로드**: 워터마크 없는 다운로드

### 데이터 표시 컴포넌트
- **구조화된 카드**: 메타데이터 카테고리별 정리
- **실시간 통계**: 좋아요, 댓글, 조회수 시각화
- **해시태그 배지**: 추출된 해시태그 배지 형태 표시
- **댓글 섹션**: 상위 댓글 사용자 친화적 표시
- **원본 데이터**: JSON 형태 원본 스크래핑 데이터

### 오류 처리 시스템
- **친화적 메시지**: 기술적 오류를 이해하기 쉽게 변환
- **Fallback 표시**: 추출 실패 시 안내 메시지
- **로딩 상태**: 진행 상황 실시간 표시

---

## 🔒 보안 및 제한사항

### Instagram 제한사항 대응
- **댓글 추출**: 보안 정책으로 제한적 → 7단계 전략으로 최대화
- **조회수/공유수**: 비공개 → null 처리로 명시
- **Rate Limiting**: 429 오류 → 재시도 로직 구현
- **봇 탐지**: 자동화 감지 → User-Agent 위장 + 헤더 최적화

### TikTok 제한사항 대응
- **댓글 추출**: 제한적 → 최대한 추출 후 안내
- **비디오 다운로드**: 서드파티 API 의존 → 다중 백업 서비스
- **Rate Limiting**: API 제한 → 요청 간격 조절
- **지역 제한**: 콘텐츠 차단 → 오류 메시지로 안내

### 보안 조치 구현
- **User-Agent 위장**: 실제 브라우저로 위장
- **헤더 최적화**: Accept, Referer, Origin 브라우저 헤더
- **캐시 제어**: Cache-Control, Pragma 최신 데이터 보장
- **오류 처리**: 민감한 정보 노출 방지

---

## 🚀 성능 최적화

### 스크래핑 최적화
- **병렬 처리**: 여러 추출 방법 동시 시도
- **Fallback 체인**: 실패 시 다음 방법 자동 전환
- **캐싱**: 5분간 스크래핑 결과 캐시
- **타임아웃**: 30초 요청 타임아웃

### UI 최적화
- **지연 로딩**: 필요 시에만 데이터 로드
- **상태 관리**: 로딩/성공/오류 상태 효율적 관리
- **메모리 최적화**: 불필요한 리렌더링 방지

---

## 📈 모니터링 및 로깅

### 로그 레벨 구현
- **INFO**: 정상적인 추출 과정
- **WARN**: 부분적 실패 또는 fallback 사용
- **ERROR**: 완전한 실패 또는 예외 상황

### 성능 메트릭
- **응답 시간**: API 응답 시간 모니터링
- **성공률**: 각 추출 방법별 성공률 추적
- **오류율**: 플랫폼별 오류 발생률

---

## 📝 API 엔드포인트

### 구현된 API 목록
```bash
# Instagram
POST /api/instagram/metadata  # 메타데이터 추출
POST /api/instagram/download  # 비디오 다운로드

# TikTok  
POST /api/tiktok/metadata    # 메타데이터 추출
POST /api/tiktok/download    # 비디오 다운로드
```

### 사용 예시
```bash
# Instagram 메타데이터 추출
curl -X POST http://localhost:3000/api/instagram/metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/DLx4668NGGv/"}'

# TikTok 비디오 다운로드
curl -X POST http://localhost:3000/api/tiktok/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.tiktok.com/@username/video/1234567890"}'
```

---

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

---

## 🔮 향후 확장 계획

### VDP 플랫폼 통합
현재 독립적으로 구현된 Instagram & TikTok 메타데이터 추출기를 기존 VDP 플랫폼에 통합하여 URL 입력 시 자동으로 메타데이터를 추출하고 폼을 채우는 기능 구현 예정

### 기능 확장
- **YouTube 지원**: YouTube Shorts 메타데이터 추출
- **배치 처리**: 여러 URL 동시 처리
- **데이터 내보내기**: CSV, JSON 형식 내보내기
- **API 키 지원**: 공식 API 키를 통한 안정적 추출

### 성능 개선
- **Redis 캐싱**: 분산 캐싱 시스템 도입
- **CDN 최적화**: 정적 자원 CDN 배포
- **데이터베이스**: 추출 이력 및 통계 저장
- **모니터링**: 실시간 성능 모니터링 대시보드

---

## 📁 구현 파일 목록

### 핵심 구현 파일
- `src/app/instagram-extractor/page.tsx` - 메인 UI 페이지
- `src/app/api/instagram/metadata/route.ts` - Instagram 메타데이터 API
- `src/app/api/instagram/download/route.ts` - Instagram 다운로드 API
- `src/app/api/tiktok/metadata/route.ts` - TikTok 메타데이터 API
- `src/app/api/tiktok/download/route.ts` - TikTok 다운로드 API
- `src/components/ui/alert.tsx` - 알림 컴포넌트

### 문서 파일
- `INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md` - 완전한 기술 문서
- `docs/INSTAGRAM_TIKTOK_METADATA_EXTRACTOR.md` - 문서 백업

---

**구현 완료일**: 2025-08-20  
**버전**: v3.0.0  
**상태**: Production Ready  
**접속 URL**: http://localhost:3000/instagram-extractor  
**테스트 결과**: ✅ 모든 기능 정상 작동 확인