# 🚀 VDP RAW Generation Pipeline - 업그레이드 완료!

## 📋 업그레이드 요약

VDP 파이프라인이 **업그레이드된 방식**으로 설정되었습니다. 앞으로 모든 YouTube Shorts 처리는 새로운 표준을 따릅니다.

## 🔄 변경사항

### Before (기존 방식)
```json
{
  "gcsUri": "gs://bucket/file.mp4",
  "meta": {
    "platform": "youtube",
    "contentId": "VIDEO_ID", 
    "uploadId": "UPLOAD_ID"
  }
}
```

### After (업그레이드 방식)
```json
{
  "gcsUri": "gs://bucket/file.mp4",
  "meta": {
    "platform": "YouTube",
    "language": "ko"
  }
}
```

## 🛠️ 새로운 도구들

### 1. 통합 멀티플랫폼 스크립트 (추천)
**파일**: `/Users/ted/snap3/scripts/vdp-extract-multiplatform.sh`

**사용법**:
```bash
# YouTube (자동)
./scripts/vdp-extract-multiplatform.sh youtube https://www.youtube.com/shorts/VIDEO_ID

# Instagram (수동)
./scripts/vdp-extract-multiplatform.sh instagram video.mp4 metadata.json

# TikTok (수동)
./scripts/vdp-extract-multiplatform.sh tiktok video.mp4 metadata.json
```

**기능**:
- ✅ **통합 진입점**: 모든 플랫폼을 단일 명령으로 처리
- ✅ **자동 라우팅**: 플랫폼별 전용 스크립트로 자동 전달
- ✅ **일관된 인터페이스**: 동일한 명령 패턴으로 모든 플랫폼 지원
- ✅ **에러 처리**: 지원되지 않는 플랫폼 및 잘못된 인수 검증

### 2. 플랫폼별 전용 스크립트들

#### 2.1. YouTube 전용 (기존 업그레이드 스크립트)
**파일**: `/Users/ted/snap3/scripts/vdp-extract-upgraded.sh`

**기능**:
- ✅ YouTube 비디오 자동 다운로드 (yt-dlp)
- ✅ SHA256 해시 생성 및 GCS 업로드  
- ✅ 업그레이드된 API 호출
- ✅ 자동 Hook Gate 판정
- ✅ 로컬 VDP 파일 저장 (*_UPGRADED.vdp.json)

#### 2.2. Instagram 전용
**파일**: `/Users/ted/snap3/scripts/vdp-extract-instagram.sh`

**메타데이터 형식**:
```json
{
  "platform": "instagram",
  "content_id": "POST_ID",
  "source_url": "https://instagram.com/p/POST_ID",
  "creator": "username",
  "caption": "post caption"
}
```

#### 2.3. TikTok 전용
**파일**: `/Users/ted/snap3/scripts/vdp-extract-tiktok.sh`

**메타데이터 형식**:
```json
{
  "platform": "tiktok",
  "content_id": "VIDEO_ID",
  "source_url": "https://tiktok.com/@user/video/VIDEO_ID",
  "creator": "username",
  "description": "video description",
  "hashtags": ["tag1", "tag2"]
}
```

### 3. 배치 처리 스크립트
**파일**: `/Users/ted/snap3/scripts/vdp-batch-process.sh`

**사용법**:
```bash
# URL 리스트 파일 생성
echo "https://www.youtube.com/shorts/VIDEO_ID1" > urls.txt
echo "https://www.youtube.com/shorts/VIDEO_ID2" >> urls.txt

# 배치 처리 실행
./scripts/vdp-batch-process.sh urls.txt
```

## 🧬 업그레이드된 VDP 구조

### 추가된 분석 섹션
- **metadata**: 비디오 제목, 크리에이터, 소스 정보
- **social_engagement**: 조회수, 좋아요, 댓글 분석  
- **story_arc**: 상세한 스토리 구조 분석
- **emotions**: 감정 분석 (primary, secondary)
- **intended_audience**: 타겟 오디언스 분석

### Hook Genome (기존 유지)
```json
{
  "hookGenome": {
    "start_sec": 0,
    "pattern_code": ["pattern_break"],
    "delivery": "dialogue",
    "trigger_modalities": ["visual", "audio"],
    "microbeats_sec": [0.91, 2.52],
    "strength_score": 0.9
  }
}
```

## 🎯 자동 Hook Gate 판정

### 판정 로직
```bash
jq '{
    start_sec: .vdp.overall_analysis.hookGenome.start_sec,
    strength: .vdp.overall_analysis.hookGenome.strength_score,
    pass: (.vdp.overall_analysis.hookGenome.start_sec <= 3 and 
          .vdp.overall_analysis.hookGenome.strength_score >= 0.70)
}'
```

### 통과 조건
- ✅ **시작 시간**: ≤ 3초
- ✅ **강도 점수**: ≥ 0.70

## 📁 파일 명명 규칙

### 업그레이드된 파일 구조
```
VIDEO_ID_TIMESTAMP_UPGRADED.vdp.json
예: aPKQzMEd2pw_20250815_214500_UPGRADED.vdp.json
```

### GCS 저장 구조  
```
gs://tough-variety-raw/raw/ingest/SHA256_HASH.mp4
메타데이터 헤더:
- x-goog-meta-vdp-upload-id: UUID
- x-goog-meta-vdp-platform: youtube
- x-goog-meta-vdp-content-id: VIDEO_ID
- x-goog-meta-vdp-source-url: YOUTUBE_URL
```

## 🔧 설정 업데이트

### RULES.md 업데이트
- YouTube Pipeline Rules이 업그레이드된 방식으로 변경됨
- 자동 Hook Gate 검증 포함
- enhanced VDP 출력 명시

### 환경변수
```bash
T2_EXTRACT_URL="https://t2-extract-355516763169.us-central1.run.app"
RAW_BUCKET="tough-variety-raw"
GOLD_BUCKET="tough-variety-gold"
```

## 🎉 사용 시나리오

### 1. YouTube Shorts 처리 (자동)
```bash
# 통합 스크립트 사용 (권장)
./scripts/vdp-extract-multiplatform.sh youtube https://www.youtube.com/shorts/6_I2FmT1mbY

# 또는 직접 호출
./scripts/vdp-extract-upgraded.sh https://www.youtube.com/shorts/6_I2FmT1mbY
```

### 2. Instagram Reels 처리 (수동)
```bash
# 1. 메타데이터 JSON 생성
cat > instagram_metadata.json << EOF
{
  "content_id": "CyXnQ2bKLMN",
  "source_url": "https://instagram.com/p/CyXnQ2bKLMN",
  "creator": "username",
  "caption": "Amazing dance moves! #dance #viral"
}
EOF

# 2. VDP 추출 실행
./scripts/vdp-extract-multiplatform.sh instagram reel_video.mp4 instagram_metadata.json
```

### 3. TikTok 처리 (수동)
```bash
# 1. 메타데이터 JSON 생성
cat > tiktok_metadata.json << EOF
{
  "content_id": "7289123456789",
  "source_url": "https://tiktok.com/@user/video/7289123456789",
  "creator": "tiktoker",
  "description": "Funny cat video compilation",
  "hashtags": ["cats", "funny", "pets", "viral"]
}
EOF

# 2. VDP 추출 실행
./scripts/vdp-extract-multiplatform.sh tiktok cat_video.mp4 tiktok_metadata.json
```

### 4. 다중 YouTube URL 배치 처리
```bash
# URL 파일 생성
cat > my_youtube_urls.txt << EOF
https://www.youtube.com/shorts/6_I2FmT1mbY
https://www.youtube.com/shorts/aPKQzMEd2pw
EOF

# 배치 처리 실행
./scripts/vdp-batch-process.sh my_youtube_urls.txt
```

### 5. 혼합 플랫폼 처리 (Multi-Platform Workflow)
```bash
# YouTube 자동 처리
./scripts/vdp-extract-multiplatform.sh youtube https://www.youtube.com/shorts/VIDEO_ID

# Instagram 수동 처리
./scripts/vdp-extract-multiplatform.sh instagram video1.mp4 insta_meta.json

# TikTok 수동 처리
./scripts/vdp-extract-multiplatform.sh tiktok video2.mp4 tiktok_meta.json
```

## ✅ 완료 체크리스트

### 핵심 업그레이드
- [x] 업그레이드된 API 호출 형식 적용
- [x] 표준 추출 스크립트 생성 (YouTube)
- [x] 배치 처리 스크립트 생성  
- [x] 자동 Hook Gate 판정 로직
- [x] RULES.md 업데이트

### 멀티플랫폼 확장 (v2.1)
- [x] **Instagram VDP 추출 스크립트** 구현
- [x] **TikTok VDP 추출 스크립트** 구현  
- [x] **통합 멀티플랫폼 스크립트** 구현
- [x] **플랫폼별 메타데이터 형식** 정의
- [x] **RULES.md 멀티플랫폼 섹션** 추가
- [x] **상세 사용 가이드** 작성

### 문서화 & 테스트
- [x] 멀티플랫폼 사용 시나리오 문서화
- [x] 스크립트 실행 권한 설정
- [x] 에러 처리 및 검증 테스트
- [x] 통합 스크립트 라우팅 테스트

---

**🚀 VDP RAW Generation Pipeline v2.1 - Multi-Platform Edition**

**🎯 이제 YouTube (자동) + Instagram + TikTok (수동) 모두 지원합니다!**

**권장 사용법**: `./scripts/vdp-extract-multiplatform.sh [platform] [arguments...]`

생성일: 2025-08-15  
버전: v2.1 (멀티플랫폼)  
상태: ✅ 완료