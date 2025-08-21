# GPT-5 Pro CTO 컨설팅 지시문: Instagram/TikTok 자동화 통합

## 🎯 **컨설팅 목적**
현재 YouTube와 동일한 수준의 완전 자동화를 Instagram/TikTok에도 적용하기 위한 아키텍처 통합 전략과 구현 로드맵 수립

---

## 📊 **현재 시스템 현황 (AS-IS)**

### **1. YouTube 완전 자동화 파이프라인 (100% 구현 완료)**
```
사용자 URL 입력 → YouTube API 메타데이터 추출 → yt-dlp 영상 다운로드 
→ GCS 업로드 → t2-extract VDP 생성 → Hook Genome 분석 → BigQuery 적재
```

**기술 스택:**
- **메타데이터**: YouTube Data API v3 (공식 API)
- **영상 다운로드**: yt-dlp (워터마크 없는 원본)
- **VDP 엔진**: Vertex AI Gemini 2.5 Pro (t2-extract 서비스)
- **스토리지**: GCS RAW → GOLD 버킷 파이프라인
- **데이터베이스**: BigQuery vdp_gold 테이블

**처리 시간**: URL 입력 → 최종 VDP 완성까지 **30초-1분**

### **2. Instagram/TikTok 현재 상태 (90% 완료, 동기화 필요)**
```
사용자 URL 입력 → 커서 메타데이터 추출 → [영상 다운로드 미구현] 
→ 수동 업로드 → t2-extract VDP 생성 → Hook Genome 분석 → BigQuery 적재
```

**기술 스택:**
- **메타데이터**: 웹 스크래핑 + HTML 파싱 (완료)
- **영상 다운로드**: **미구현** (수동 업로드 상태)
- **VDP 엔진**: 동일 (Vertex AI Gemini 2.5 Pro)
- **스토리지**: 동일 (GCS RAW → GOLD)
- **데이터베이스**: 동일 (BigQuery vdp_gold)

**처리 시간**: 현재 **5-8분** (수동 업로드로 인한 지연)

---

## 🏗️ **핵심 아키텍처 세부사항**

### **A. 서버 구조 (4-Terminal 시스템)**
```
T1 (8080): simple-web-server.js     - 메인 API 및 인제스터 UI
T2 (8081): worker-ingest-v2.sh      - 배치 처리 및 성능 테스트
T3 (8082): t2-extract 서비스        - VDP 추출 (Vertex AI)
T4 (8083): storage 서비스           - 로깅 및 스토리지 관리
Cursor (3000): Next.js UI           - 프론트엔드 (개발 중)
```

### **B. YouTube 자동화 워크플로우 (상세 분석)**

#### **Step 1: URL 정규화 및 검증**
```javascript
POST /api/normalize-url
{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "platform": "YouTube"
}
→ 응답: {
  "platform": "youtube", 
  "content_id": "VIDEO_ID",
  "canonical_url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

#### **Step 2: YouTube API 메타데이터 추출**
```javascript
// YouTube Data API v3 호출
const response = await youtube.videos.list({
  part: ['snippet', 'statistics', 'contentDetails'],
  id: VIDEO_ID,
  key: YOUTUBE_API_KEY
});

// 추출 데이터:
{
  title: "비디오 제목",
  description: "설명",
  upload_date: "2025-01-01T00:00:00Z",
  view_count: 1000000,
  like_count: 50000,
  comment_count: 1200,
  duration: "PT3M45S",
  channel_title: "채널명",
  hashtags: ["#tag1", "#tag2"]
}
```

#### **Step 3: yt-dlp 영상 다운로드**
```bash
# 워터마크 없는 최고화질 다운로드
yt-dlp \
  --format "best[height<=1080]" \
  --output "/tmp/%(id)s.%(ext)s" \
  --extract-flat false \
  "https://youtube.com/watch?v=VIDEO_ID"
```

#### **Step 4: GCS 업로드 및 메타데이터 결합**
```javascript
// 영상 파일 + 메타데이터 JSON을 동일 upload-id로 업로드
const uploadId = uuidv4();
await uploadToGCS(`gs://tough-variety-raw-central1/ingest/youtube/${VIDEO_ID}.mp4`, videoFile, {
  'x-goog-meta-vdp-upload-id': uploadId,
  'x-goog-meta-vdp-platform': 'youtube',
  'x-goog-meta-vdp-content-id': VIDEO_ID
});

await uploadToGCS(`gs://tough-variety-raw-central1/ingest/youtube/${VIDEO_ID}.json`, metadata, {
  'x-goog-meta-vdp-upload-id': uploadId
});
```

#### **Step 5: VDP 생성 (t2-extract 서비스)**
```javascript
POST http://localhost:8082/api/vdp/extract-vertex
{
  "gcsUri": "gs://tough-variety-raw-central1/ingest/youtube/VIDEO_ID.mp4",
  "meta": {
    "platform": "youtube",
    "language": "ko",
    "video_origin": "Real-Footage"
  }
}

// Vertex AI Gemini 2.5 Pro 분석 결과:
{
  "overall_analysis": {
    "hookGenome": {
      "pattern_code": "immediate_engagement",
      "delivery": "direct_address", 
      "start_sec": 2.1,
      "strength_score": 0.87,
      "microbeats_sec": [0.5, 1.2, 2.1],
      "trigger_modalities": ["visual", "audio", "text"]
    },
    "scene_analysis": [...],
    "content_summary": [...]
  },
  "metadata": { /* YouTube API 데이터 */ },
  "evidence_pack": { /* fpcalc + brand detection */ }
}
```

#### **Step 6: BigQuery 적재**
```sql
-- vdp_gold 테이블에 최종 데이터 삽입
INSERT INTO `tough-variety-466003-c5.vdp_dataset.vdp_gold` 
VALUES (
  'youtube:VIDEO_ID',  -- content_key
  'VIDEO_ID',          -- content_id
  JSON(...),           -- VDP RAW 전체
  CURRENT_DATE(),      -- load_date
  CURRENT_TIMESTAMP()  -- load_timestamp
);
```

---

## 🚧 **현재 Gap Analysis**

### **Instagram/TikTok 누락 기능:**

#### **1. 영상 다운로드 자동화 (Critical)**
- **현재**: 수동 업로드만 가능
- **필요**: yt-dlp와 동등한 자동 다운로드 기능
- **기술 후보**: 
  - instagram-dl, tiktok-dl 라이브러리
  - 또는 커서의 숨겨진 다운로드 함수 활용

#### **2. 메타데이터-영상 동기화 (Critical)**
- **현재**: 메타데이터만 추출, 영상은 별도 수동 처리
- **필요**: YouTube처럼 하나의 워크플로우로 통합

#### **3. 플랫폼별 최적화 (Important)**
- **Instagram**: Reels, Stories, IGTV 타입별 처리
- **TikTok**: 지역 제한, 워터마크 제거 최적화

---

## 🎯 **CTO 컨설팅 요청 사항**

### **1. 아키텍처 설계 질문**
```
Q1: Instagram/TikTok 영상 다운로드를 YouTube와 동일한 파이프라인에 
    통합하기 위한 최적의 아키텍처는?

Q2: 플랫폼별 워터마크 제거 및 화질 최적화 전략은?

Q3: 법적 리스크(저작권, ToS 위반) 최소화 방안은?
```

### **2. 기술 스택 선택**
```
Q4: yt-dlp 대신 Instagram/TikTok용 다운로더 라이브러리 추천은?
    - instagram-dl, gallery-dl, tiktok-dl 중 선택 기준
    - 또는 커스텀 다운로더 개발 여부

Q5: 플랫폼별 User-Agent, 헤더 최적화 전략은?

Q6: Rate Limiting 및 IP 로테이션 필요성은?
```

### **3. 구현 우선순위**
```
Q7: 90%+ 자동화 달성을 위한 MVP 범위는?
    - Phase 1: 기본 다운로드 통합
    - Phase 2: 메타데이터 동기화  
    - Phase 3: 최적화 및 안정화

Q8: 기존 YouTube 코드 재사용 vs 새로운 아키텍처?

Q9: 예상 개발 시간 및 리소스 투입량은?
```

---

## 📋 **기대 결과물**

### **Target State (TO-BE):**
```
Instagram/TikTok: 
사용자 URL 입력 → 메타데이터 + 영상 자동 다운로드 
→ GCS 업로드 → VDP 생성 → BigQuery 적재
처리 시간: 30초-1분 (YouTube 동등)
자동화율: 90%+ (현재 50% → 목표 90%+)
```

### **CTO 컨설팅 결과물:**
1. **상세 구현 로드맵** (단계별 마일스톤)
2. **기술 스택 추천** (라이브러리, 도구, 아키텍처)
3. **리스크 분석 및 대응 방안**
4. **성능 최적화 전략**
5. **법적 컴플라이언스 가이드라인**

---

## 🔧 **현재 코드베이스 참고사항**

### **파일 구조:**
```
/Users/ted/snap3/
├── simple-web-server.js           # T1 메인 API 서버
├── src/app/api/                    # Next.js API 라우트
│   ├── instagram/metadata/route.ts
│   └── tiktok/metadata/route.ts
├── services/t2-extract/            # T3 VDP 생성 서비스
└── scripts/                        # 배치 처리 스크립트
```

### **핵심 함수:**
- `extractInstagramMetadata()` - 완료 ✅
- `extractTikTokMetadata()` - 완료 ✅
- `downloadVideo()` - **미구현** ❌ (구현 필요)
- `syncMetadataWithVideo()` - **미구현** ❌ (구현 필요)

---

**이 지시문을 바탕으로 Instagram/TikTok 완전 자동화를 위한 CTO 수준의 전문 컨설팅을 요청합니다.**